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
import { RoadTestScreen } from './src/screens/roadtest/RoadTestScreen';
import { TechnicianHomeScreen } from './src/screens/home/TechnicianHomeScreen';
import { ManufacturerInspectionScreen as GuidedZoneCaptureScreen } from './src/screens/inspection/ManufacturerInspectionScreen';
import { HoistOverviewScreen } from './src/screens/hoist/HoistOverviewScreen';
import { HoistInspectionScreen } from './src/screens/hoist/HoistInspectionScreen';
import { HoistHistoryScreen } from './src/screens/hoist/HoistHistoryScreen';
import { RooftopVehicle } from './src/services/rooftopVehicles.service';
import { RoadTestProvider } from './src/context/RoadTestContext';
import { GeofenceProvider } from './src/context/GeofenceContext';
import { WarrantyCase, Hoist } from './src/types';

type AppScreen =
  | 'LOGIN'
  | 'TECH_HOME'
  | 'LIST'
  | 'VEHICLES'
  | 'ZONE_CAPTURE'
  | 'LOANERS'
  | 'ROAD_TEST'
  | 'HOIST_OVERVIEW'
  | 'HOIST_INSPECT'
  | 'HOIST_HISTORY'
  | 'DETAIL'
  | 'WIZARD'
  | 'FLAG_RESOLVE'
  | 'PROFILE';

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

  const isTechnicianExperience =
    user?.role === 'TECHNICIAN' ||
    !user?.role;

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(
    isAuthenticated ? 'TECH_HOME' : 'LOGIN'
  );
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('TECH_HOME');
  const [selectedCase, setSelectedCase] = useState<WarrantyCase | null>(null);
  const [selectedHoist, setSelectedHoist] = useState<Hoist | null>(null);
  const [selectedInspectionVehicle, setSelectedInspectionVehicle] = useState<RooftopVehicle | null>(null);
  const [caseListTab, setCaseListTab] = useState<string>('all');
  const [activeNotification, setActiveNotification] = useState<AppNotificationPayload | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<WarrantyCase | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentScreen === 'LOGIN') {
      setCurrentScreen('TECH_HOME');
    }
  }, [isAuthenticated]);

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
    if (!isAuthenticated || !user) return;
    const techId = (user as any)?.id;
    if (!techId) return;
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
    return <LoginScreen onLoginSuccess={() => setCurrentScreen('TECH_HOME')} />;
  }

  // 1. Login Screen
  if (currentScreen === 'LOGIN') {
    return <LoginScreen onLoginSuccess={() => setCurrentScreen('TECH_HOME')} />;
  }

  // 1b. Technician Portal Home Screen (New Figma UI with real data)
  if (currentScreen === 'TECH_HOME') {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <TechnicianHomeScreen
          onOpenVehicles={() => {
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('VEHICLES');
          }}
          onOpenRoadTest={() => {
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('ROAD_TEST');
          }}
          onOpenTickets={(tab) => {
            setCaseListTab(tab || 'all');
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('LIST');
          }}
          onOpenLoaners={() => {
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('LOANERS');
          }}
          onOpenHoists={() => {
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('HOIST_OVERVIEW');
          }}
          onOpenProfile={() => {
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('PROFILE');
          }}
          onOpenZoneCapture={(veh) => {
            setSelectedInspectionVehicle(veh || null);
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('ZONE_CAPTURE');
          }}
          onStartNewInspection={() => {
            setSelectedInspectionVehicle(null);
            setPreviousScreen('TECH_HOME');
            // Open the inspection flow in vehicle-selection mode.
            setCurrentScreen('ZONE_CAPTURE');
          }}
          onOpenCase={(caseItem) => {
            setSelectedCase(caseItem);
            setPreviousScreen('TECH_HOME');
            setCurrentScreen('DETAIL');
          }}
          onResolveFlag={(caseItem) => {
            setSelectedCase(caseItem);
            loadExistingCase(caseItem, true);
            setPreviousScreen('TECH_HOME');
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
            setPreviousScreen('LIST');
            setCurrentScreen('WIZARD');
          }}
          onOpenCase={(caseItem) => {
            setSelectedCase(caseItem);
            setPreviousScreen('LIST');
            setCurrentScreen('DETAIL');
          }}
          onResolveFlag={(caseItem) => {
            setSelectedCase(caseItem);
            loadExistingCase(caseItem, true);
            setPreviousScreen('LIST');
            setCurrentScreen('FLAG_RESOLVE');
          }}
          onOpenProfile={() => {
            setPreviousScreen('LIST');
            setCurrentScreen('PROFILE');
          }}
          onOpenVehicles={() => {
            setPreviousScreen('LIST');
            setCurrentScreen('VEHICLES');
          }}
          onOpenLoaners={() => {
            setPreviousScreen('LIST');
            setCurrentScreen('LOANERS');
          }}
          onOpenRoadTest={() => {
            setPreviousScreen('LIST');
            setCurrentScreen('ROAD_TEST');
          }}
          onOpenHoists={() => {
            setPreviousScreen('LIST');
            setCurrentScreen('HOIST_OVERVIEW');
          }}
          onOpenHome={() => {
            setPreviousScreen('LIST');
            setCurrentScreen('TECH_HOME');
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
            setPreviousScreen('VEHICLES');
            setCurrentScreen('PROFILE');
          }}
          onOpenLoaners={() => {
            setPreviousScreen('VEHICLES');
            setCurrentScreen('LOANERS');
          }}
          onOpenRoadTest={() => {
            setPreviousScreen('VEHICLES');
            setCurrentScreen('ROAD_TEST');
          }}
          onOpenHoists={() => {
            setPreviousScreen('VEHICLES');
            setCurrentScreen('HOIST_OVERVIEW');
          }}
          onOpenHome={() => {
            setPreviousScreen('VEHICLES');
            setCurrentScreen('TECH_HOME');
          }}
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
          onOpenZoneCapture={(veh) => {
            setSelectedInspectionVehicle(veh);
            setPreviousScreen('VEHICLES');
            setCurrentScreen('ZONE_CAPTURE');
          }}
          onStartNewInspection={() => {
            setSelectedInspectionVehicle(null);
            setPreviousScreen('VEHICLES');
            // Open the inspection flow in vehicle-selection mode.
            setCurrentScreen('ZONE_CAPTURE');
          }}
        />
      </View>
    );
  }

  // 2b-2. Guided Zone Capture Screen (Exact Match to Figma UI)
  if (currentScreen === 'ZONE_CAPTURE') {
    return (
      <View style={{ flex: 1 }}>
        <NotificationBanner
          notification={activeNotification}
          onPress={handleNotificationPress}
          onDismiss={() => setActiveNotification(null)}
        />
        <GuidedZoneCaptureScreen
          vehicle={selectedInspectionVehicle}
          onSelectVehicle={(vehicle) => setSelectedInspectionVehicle(vehicle)}
          onBack={() => setCurrentScreen(previousScreen || 'VEHICLES')}
          onOpenHome={() => {
            setPreviousScreen('ZONE_CAPTURE');
            setCurrentScreen('TECH_HOME');
          }}
          onOpenTickets={() => {
            setCaseListTab('all');
            setCurrentScreen('LIST');
          }}
          onOpenHoists={() => {
            setPreviousScreen('ZONE_CAPTURE');
            setCurrentScreen('HOIST_OVERVIEW');
          }}
          onOpenLoaners={() => {
            setPreviousScreen('ZONE_CAPTURE');
            setCurrentScreen('LOANERS');
          }}
          onOpenProfile={() => {
            setPreviousScreen('ZONE_CAPTURE');
            setCurrentScreen('PROFILE');
          }}
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
          onCompleteInspection={() => {
            setCurrentScreen('VEHICLES');
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
          onBack={() => setCurrentScreen(previousScreen || (isTechnicianExperience ? 'TECH_HOME' : 'LIST'))}
          onOpenTickets={(tab) => {
            setCaseListTab(tab || 'all');
            setCurrentScreen('LIST');
          }}
          onOpenVehicles={() => {
            setPreviousScreen('LOANERS');
            setCurrentScreen('VEHICLES');
          }}
          onOpenProfile={() => {
            setPreviousScreen('LOANERS');
            setCurrentScreen('PROFILE');
          }}
          onStartNewCase={() => {
            startNewCase();
            setPreviousScreen('LOANERS');
            setCurrentScreen('WIZARD');
          }}
          onOpenRoadTest={() => {
            setPreviousScreen('LOANERS');
            setCurrentScreen('ROAD_TEST');
          }}
          onOpenHoists={() => {
            setPreviousScreen('LOANERS');
            setCurrentScreen('HOIST_OVERVIEW');
          }}
          onOpenHome={() => {
            setPreviousScreen('LOANERS');
            setCurrentScreen('TECH_HOME');
          }}
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
        />
      </View>
    );
  }

  // 2d. Road Test Telemetry & Geofence Operations
  if (currentScreen === 'ROAD_TEST') {
    return (
      <View style={{ flex: 1 }}>
        <RoadTestScreen
          onOpenTickets={() => {
            setCaseListTab('all');
            setCurrentScreen('LIST');
          }}
          onOpenVehicles={() => {
            setPreviousScreen('ROAD_TEST');
            setCurrentScreen('VEHICLES');
          }}
          onOpenLoaners={() => {
            setPreviousScreen('ROAD_TEST');
            setCurrentScreen('LOANERS');
          }}
          onOpenProfile={() => {
            setPreviousScreen('ROAD_TEST');
            setCurrentScreen('PROFILE');
          }}
          onOpenHoists={() => {
            setPreviousScreen('ROAD_TEST');
            setCurrentScreen('HOIST_OVERVIEW');
          }}
          onOpenHome={() => {
            setPreviousScreen('ROAD_TEST');
            setCurrentScreen('TECH_HOME');
          }}
          onLogout={() => {
            logout();
            setCurrentScreen('LOGIN');
          }}
        />
      </View>
    );
  }

  // 2e. Daily Hoist Inspections Overview
  if (currentScreen === 'HOIST_OVERVIEW') {
    return (
      <View style={{ flex: 1 }}>
        <HoistOverviewScreen
          onBack={() => setCurrentScreen(previousScreen || 'TECH_HOME')}
          onInspectHoist={(hoist) => {
            setSelectedHoist(hoist);
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('HOIST_INSPECT');
          }}
          onViewHistory={(hoist) => {
            setSelectedHoist(hoist);
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('HOIST_HISTORY');
          }}
          onOpenHome={() => {
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('TECH_HOME');
          }}
          onOpenRoadTest={() => {
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('ROAD_TEST');
          }}
          onOpenLoaners={() => {
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('LOANERS');
          }}
          onOpenTickets={(tab) => {
            setCaseListTab(tab || 'all');
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('LIST');
          }}
          onOpenVehicles={() => {
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('VEHICLES');
          }}
          onOpenProfile={() => {
            setPreviousScreen('HOIST_OVERVIEW');
            setCurrentScreen('PROFILE');
          }}
        />
      </View>
    );
  }

  // 2f. Pre-Shift Hoist Checklist Inspection
  if (currentScreen === 'HOIST_INSPECT' && selectedHoist) {
    return (
      <View style={{ flex: 1 }}>
        <HoistInspectionScreen
          hoist={selectedHoist}
          onBack={() => setCurrentScreen('HOIST_OVERVIEW')}
          onInspectionCompleted={() => setCurrentScreen('HOIST_OVERVIEW')}
        />
      </View>
    );
  }

  // 2g. Hoist Inspection Audit History
  if (currentScreen === 'HOIST_HISTORY' && selectedHoist) {
    return (
      <View style={{ flex: 1 }}>
        <HoistHistoryScreen
          hoist={selectedHoist}
          onBack={() => setCurrentScreen('HOIST_OVERVIEW')}
        />
      </View>
    );
  }

  // 3. Profile & Settings Screen
  if (currentScreen === 'PROFILE') {
    return (
      <View style={{ flex: 1 }}>
        <ProfileScreen
          onBack={() => setCurrentScreen(previousScreen || (isTechnicianExperience ? 'TECH_HOME' : 'LIST'))}
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
            onCancel={() => setCurrentScreen(previousScreen || (isTechnicianExperience ? 'TECH_HOME' : 'LIST'))}
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
                setCurrentScreen(isTechnicianExperience ? 'TECH_HOME' : 'LIST');
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
          <GeofenceProvider>
            <CaseWizardProvider>
              <RoadTestProvider>
                <MainNavigator />
              </RoadTestProvider>
            </CaseWizardProvider>
          </GeofenceProvider>
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
