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
import { Header } from './src/components/common/Header';
import { ProgressBar } from './src/components/common/ProgressBar';
import { NotificationBanner } from './src/components/common/NotificationBanner';
import {
  notificationsService,
  FlagNotificationPayload,
} from './src/services/notifications.service';
import { WarrantyCase } from './src/types';

type AppScreen = 'LOGIN' | 'LIST' | 'DETAIL' | 'WIZARD' | 'FLAG_RESOLVE';

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
  const [selectedCase, setSelectedCase] = useState<WarrantyCase | null>(null);
  const [activeNotification, setActiveNotification] = useState<FlagNotificationPayload | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<WarrantyCase | null>(null);

  // Initialize notifications on authentication
  useEffect(() => {
    if (isAuthenticated) {
      const techId = (user as any)?.id || 'usr_tech_1';
      notificationsService.registerDevice(techId);
      const unsubscribe = notificationsService.onNotification((payload) => {
        setActiveNotification(payload);
      });
      notificationsService.startFlagPolling(techId);

      return () => {
        unsubscribe();
        notificationsService.stopFlagPolling();
      };
    }
  }, [isAuthenticated, user]);

  // Deep-Link Navigation when Technician Taps Notification Banner (Scope Section 6)
  const handleNotificationPress = (notif: FlagNotificationPayload) => {
    setActiveNotification(null);

    if (notif.caseItem) {
      setSelectedCase(notif.caseItem);
      loadExistingCase(notif.caseItem, true);

      const rule = notif.evidenceRuleKey.toLowerCase();
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
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
        />
      </View>
    );
  }

  // 3. Case Detail Screen
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
            setCurrentScreen('LIST');
          }}
          onEditEvidence={(caseItem) => {
            loadExistingCase(caseItem, false);
            setCurrentScreen('WIZARD');
          }}
        />
      </View>
    );
  }

  // 4. Flag Resolution Screen
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
      />

      {/* Step Content */}
      <View style={styles.stepContent}>{renderWizardStep()}</View>

      {/* Scope Section 5.7: Official Technician Submission Confirmation Screen */}
      <Modal
        visible={Boolean(submittedReceipt)}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.receiptContainer}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptIconWrapper}>
              <CheckCircle2 size={56} color="#059669" strokeWidth={2.2} />
            </View>

            <Text style={styles.receiptTitle}>Warranty Pack Submitted!</Text>
            <Text style={styles.receiptSubtitle}>
              Evidence frozen and transmitted to Warranty Review Clerk
            </Text>

            <View style={styles.receiptStatusBadge}>
              <ShieldCheck size={14} color="#D97706" />
              <Text style={styles.receiptStatusText}>Awaiting Clerk Review</Text>
            </View>

            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Repair Order (RO)</Text>
                <Text style={styles.receiptValueBold}>
                  #{submittedReceipt?.roNumber || roNumber}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Case Reference</Text>
                <Text style={styles.receiptValueMono}>
                  {submittedReceipt?.id || 'CASE-CR-PENDING'}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Rooftop & Brand</Text>
                <Text style={styles.receiptValue}>
                  {submittedReceipt?.siteName || 'Cranbourne'} · {submittedReceipt?.brandName || 'BYD'}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Submission Time</Text>
                <Text style={styles.receiptValue}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            <View style={styles.receiptNotice}>
              <FileText size={14} color="#64748B" />
              <Text style={styles.receiptNoticeText}>
                All photos and videos auto-named to OEM convention and attached to dealer case file.
              </Text>
            </View>

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
      <StatusBar barStyle="dark-content" />
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
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  receiptIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  receiptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 20,
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  receiptDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  receiptValueBold: {
    fontSize: 14,
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  receiptNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  receiptBtn: {
    width: '100%',
    backgroundColor: '#E11F26',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  receiptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
