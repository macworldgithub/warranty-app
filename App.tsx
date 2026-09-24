import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CheckCircle2, FileText, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { colors } from './src/theme/colors';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import {
  CaseWizardProvider,
  useCaseWizard,
} from './src/context/CaseWizardContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { CaseListScreen } from './src/screens/cases/CaseListScreen';
import { CaseDetailScreen } from './src/screens/cases/CaseDetailScreen';
import { FlagResolutionScreen } from './src/screens/wizard/FlagResolutionScreen';
import { Step0_StartTicket } from './src/screens/wizard/Step0_StartTicket';
import { Step1_VehicleId } from './src/screens/wizard/Step1_VehicleId';
import { Step2_FaultConcern } from './src/screens/wizard/Step2_FaultConcern';
import { Step3_GuidedEvidence } from './src/screens/wizard/Step3_GuidedEvidence';
import { Step4_Tier2Extras } from './src/screens/wizard/Step4_Tier2Extras';
import { Step5_VoiceNotes } from './src/screens/wizard/Step5_VoiceNotes';
import { Step6_ReviewSubmit } from './src/screens/wizard/Step6_ReviewSubmit';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { VehicleListScreen } from './src/screens/vehicles/VehicleListScreen';
import { LoanVehiclesScreen } from './src/screens/loaners/LoanVehiclesScreen';
import { Header } from './src/components/common/Header';
import { ProgressBar } from './src/components/common/ProgressBar';
import { NotificationBanner } from './src/components/common/NotificationBanner';
import {
  notificationsService,
  AppNotificationPayload,
  FlagNotificationPayload,
} from './src/services/notifications.service';
import { casesApi } from './src/api';
import { WarrantyCase } from './src/types';

type AppScreen = 'LOGIN' | 'LIST' | 'VEHICLES' | 'LOANERS' | 'DETAIL' | 'WIZARD' | 'FLAG_RESOLVE' | 'PROFILE';

function MainNavigator() {
  const { user, isAuthenticated, logout } = useAuth();
  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    roNumber,
    brandName,
    loadExistingCase,
    startNewCase,
    mandatoryCount,
    completedMandatoryCount,
  } = useCaseWizard();

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(
    isAuthenticated ? 'LIST' : 'LOGIN'
  );
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('LIST');
  const [selectedCase, setSelectedCase] = useState<WarrantyCase | null>(null);
  const [caseListTab, setCaseListTab] = useState<string>('all');
  const [activeNotification, setActiveNotification] = useState<AppNotificationPayload | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<WarrantyCase | null>(null);

  // Deep-Link Navigation when Technician Taps Notification Banner or System Tray Push
  const handleNotificationPress = async (notif: AppNotificationPayload) => {
    setActiveNotification(null);

    const type = notif.type || (notif.reasonCode ? 'FLAGGED' : 'INFO');

    let caseItem = notif.caseItem;
    if (!caseItem && notif.caseId) {
      try {
        caseItem = await casesApi.getCaseById(notif.caseId);
      } catch {
        // Fallback if network fails
      }
    }

    if (type === 'APPROVED' || type === 'AWAITING_REVIEW') {
      if (caseItem) {
        setSelectedCase(caseItem);
        setCurrentScreen('DETAIL');
      } else {
        setCurrentScreen('LIST');
      }
      return;
    }

    if (caseItem) {
      setSelectedCase(caseItem);
      loadExistingCase(caseItem, true);

      const rule = (notif.evidenceRuleKey || '').toLowerCase();
      if (rule.includes('vin') || rule.includes('odometer') || rule.includes('front')) {
        setStep(1);
        setCurrentScreen('WIZARD');
      } else if (
        rule.includes('fault') ||
        rule.includes('serial') ||
        rule.includes('repair') ||
        rule.includes('dtc') ||
        rule.includes('video')
      ) {
        setStep(3);
        setCurrentScreen('WIZARD');
      } else {
        setCurrentScreen('FLAG_RESOLVE');
      }
    } else {
      setCurrentScreen('LIST');
    }
  };

  // Initialize notifications on authentication & listen for background / foreground push
  useEffect(() => {
    const techId = (user as any)?.id || 'usr_tech_1';
    notificationsService.registerDevice(techId);

    const unsubscribePush = notificationsService.onNotification((payload) => {
      setActiveNotification(payload);
    });

    const unsubscribeOpen = notificationsService.onNotificationOpen((payload) => {
      handleNotificationPress(payload);
    });

    if (isAuthenticated) {
      notificationsService.startNotificationPolling(techId);
    }

    return () => {
      unsubscribePush();
      unsubscribeOpen();
      notificationsService.stopFlagPolling();
    };
  }, [isAuthenticated, user]);

  // If user logs out, go to LOGIN
  if (!isAuthenticated && currentScreen !== 'LOGIN') {
    return <LoginScreen onLoginSuccess={() => setCurrentScreen('LIST')} />;
  }

  // 1. Login Screen
  if (currentScreen === 'LOGIN') {
    return <LoginScreen onLoginSuccess={() => setCurrentScreen('LIST')} />;
  }

  // 2. Case List Dashboard
  if (currentScreen === 'LIST') {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <CaseListScreen
          initialTab={caseListTab}
          onStartNewCase={() => {
            startNewCase();
            setCurrentScreen('WIZARD');
          }}
          onOpenCase={(caseItem) => {
            setSelectedCase(caseItem);
            setCurrentScreen('DETAIL');
          }}
          onResolveFlag={(caseItem) => {
            setSelectedCase(caseItem);
            loadExistingCase(caseItem, true);
            setCurrentScreen('FLAG_RESOLVE');
          }}
          onOpenProfile={() => {
            setCurrentScreen('PROFILE');
          }}
          onOpenVehicles={() => {
            setCurrentScreen('VEHICLES');
          }}
          onOpenLoaners={() => {
            setCurrentScreen('LOANERS');
          }}
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
        />
      </View>
    );
  }

  // 2b. Vehicles Screen (Rooftop Fleet)
  if (currentScreen === 'VEHICLES') {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <VehicleListScreen
          onOpenTickets={(tab) => {
            setCaseListTab(tab || 'all');
            setCurrentScreen('LIST');
          }}
          onStartNewCase={(initialData) => {
            startNewCase(initialData);
            setPreviousScreen('VEHICLES');
            setCurrentScreen('WIZARD');
          }}
          onOpenCase={(caseItem) => {
            setSelectedCase(caseItem);
            setPreviousScreen('VEHICLES');
            setCurrentScreen('DETAIL');
          }}
          onOpenProfile={() => {
            setCurrentScreen('PROFILE');
          }}
          onOpenLoaners={() => {
            setCurrentScreen('LOANERS');
          }}
        />
      </View>
    );
  }

  // 2c. Service Loan Vehicle Operations
  if (currentScreen === 'LOANERS') {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <LoanVehiclesScreen
          onBack={() => setCurrentScreen('LIST')}
          onOpenTickets={(tab) => {
            setCaseListTab(tab || 'all');
            setCurrentScreen('LIST');
          }}
          onOpenVehicles={() => {
            setCurrentScreen('VEHICLES');
          }}
          onOpenProfile={() => {
            setCurrentScreen('PROFILE');
          }}
          onStartNewCase={() => {
            startNewCase();
            setCurrentScreen('WIZARD');
          }}
        />
      </View>
    );
  }

  // 3. Profile & Settings Screen
  if (currentScreen === 'PROFILE') {
    return (
      <View style={{ flex: 1 }}>
        <ProfileScreen
          onBack={() => setCurrentScreen('LIST')}
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
        />
      </View>
    );
  }

  // 4. Case Detail Screen
  if (currentScreen === 'DETAIL' && selectedCase) {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <CaseDetailScreen
          caseItem={selectedCase}
          onBack={() => {
            setSelectedCase(null);
            setCurrentScreen(previousScreen || 'LIST');
          }}
          onEditEvidence={(caseItem) => {
            loadExistingCase(caseItem, false);
            setCurrentScreen('WIZARD');
          }}
          onCaseUpdated={(updatedCase) => {
            setSelectedCase(updatedCase);
          }}
        />
      </View>
    );
  }

  // 5. Flag Resolution Screen
  if (currentScreen === 'FLAG_RESOLVE' && selectedCase) {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <FlagResolutionScreen
          caseItem={selectedCase}
          onBack={() => {
            setSelectedCase(null);
            setCurrentScreen('LIST');
          }}
          onSubmitSuccess={() => {
            Alert.alert(
              'Resolved & Re-submitted',
              'Your updated evidence pack has been submitted to the warranty clerk.',
              [{ text: 'OK', onPress: () => setCurrentScreen('LIST') }]
            );
          }}
        />
      </View>
    );
  }

  // 5. 7-Step Guided Technician Wizard
  const renderWizardStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step0_StartTicket
            onNext={nextStep}
            onCancel={() => setCurrentScreen('LIST')}
          />
        );
      case 1:
        return <Step1_VehicleId onNext={nextStep} onPrev={prevStep} />;
      case 2:
        return <Step2_FaultConcern onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <Step3_GuidedEvidence onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <Step4_Tier2Extras onNext={nextStep} onPrev={prevStep} />;
      case 5:
        return <Step5_VoiceNotes onNext={nextStep} onPrev={prevStep} />;
      case 6:
      default:
        return (
          <Step6_ReviewSubmit
            onPrev={prevStep}
            onJumpToStep={setStep}
            onSubmitSuccess={(submittedCase) => {
              setSubmittedReceipt(submittedCase);
            }}
          />
        );
    }
  };

  return (
    <View style={styles.wizardContainer}>
      {/* Top Push Notification Banner */}
      <NotificationBanner
        notification={activeNotification}
        onPress={handleNotificationPress}
        onDismiss={() => setActiveNotification(null)}
      />

      {/* Wizard Top Header */}
      <Header
        title={currentStep === 0 ? 'New Warranty Case' : `RO: ${roNumber || 'CR-...'}`}
        subtitle={brandName ? `${brandName} Standard Pack` : 'Warranty Evidence'}
        roNumber={currentStep > 0 ? roNumber : undefined}
        onBack={() => {
          if (currentStep > 0) {
            prevStep();
          } else {
            setCurrentScreen('LIST');
          }
        }}
      />

      {/* Progress Bar with Mandatory Gates count */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={7}
        totalMandatory={mandatoryCount}
        completedCount={completedMandatoryCount}
        mandatoryRemaining={mandatoryCount - completedMandatoryCount}
        onStepPress={setStep}
      />

      {/* Step Content */}
      <View style={styles.stepContent}>{renderWizardStep()}</View>

      {/* Scope Section 5.7: Official Technician Submission Confirmation Screen */}
      <Modal
        visible={Boolean(submittedReceipt)}
        animationType="fade"
        transparent={false}
      >
        <View style={styles.receiptContainer}>
          {/* Top glow accent */}
          <View style={styles.receiptGlowTop} />

          <View style={styles.receiptCard}>
            {/* Success Icon */}
            <View style={styles.receiptIconOuter}>
              <View style={styles.receiptIconWrapper}>
                <CheckCircle2 size={48} color="#059669" strokeWidth={2.2} />
              </View>
            </View>

            <Text style={styles.receiptTitle}>Warranty Pack Submitted!</Text>
            <Text style={styles.receiptSubtitle}>
              Evidence frozen and transmitted to{"\n"}Warranty Review Clerk
            </Text>

            {/* Status pill */}
            <View style={styles.receiptStatusBadge}>
              <ShieldCheck size={13} color="#D97706" />
              <Text style={styles.receiptStatusText}>Awaiting Clerk Review</Text>
            </View>

            {/* Details grid */}
            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Repair Order</Text>
                <Text style={styles.receiptValueBold}>
                  #{submittedReceipt?.roNumber || roNumber}
                </Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Case Reference</Text>
                <Text style={styles.receiptValueMono}>
                  {submittedReceipt?.id || 'CASE-CR-PENDING'}
                </Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Rooftop</Text>
                <Text style={styles.receiptValue}>
                  {submittedReceipt?.siteName || 'Cranbourne'}
                </Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Brand</Text>
                <Text style={styles.receiptValue}>
                  {submittedReceipt?.brandName || 'BYD'}
                </Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Submitted At</Text>
                <Text style={styles.receiptValue}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            {/* Notice */}
            <View style={styles.receiptNotice}>
              <FileText size={13} color="#64748B" />
              <Text style={styles.receiptNoticeText}>
                All evidence auto-named to OEM convention and attached to dealer case file.
              </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.receiptBtn}
              onPress={() => {
                setSubmittedReceipt(null);
                setCurrentScreen('LIST');
              }}
            >
              <Text style={styles.receiptBtnText}>Back to Active Jobs</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  React.useEffect(() => {
    console.log('[App] Initialized Booran Warranty Capture System');
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        {...({ backgroundColor: '#D71920', translucent: true } as any)}
      />
      <NetworkProvider>
        <AuthProvider>
          <CaseWizardProvider>
            <MainNavigator />
          </CaseWizardProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  wizardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stepContent: {
    flex: 1,
  },
  receiptContainer: {
    flex: 1,
    backgroundColor: '#0B1221',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptGlowTop: {
    position: 'absolute',
    top: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  receiptCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 16,
  },
  receiptIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  receiptIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  receiptSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
  },
  receiptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.2,
  },
  receiptDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    maxWidth: '55%',
    textAlign: 'right',
  },
  receiptValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptValueMono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: '#0284C7',
  },
  receiptNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  receiptNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  receiptBtn: {
    width: '100%',
    backgroundColor: '#D71920',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  receiptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
