import React, { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Alert,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { WarrantyCase } from './src/types';

type AppScreen = 'LOGIN' | 'LIST' | 'DETAIL' | 'WIZARD' | 'FLAG_RESOLVE';

function MainNavigator() {
  const { isAuthenticated, logout } = useAuth();
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
      <CaseListScreen
        onStartNewCase={() => {
          startNewCase();
          setCurrentScreen('WIZARD');
        }}
        onOpenCase={caseItem => {
          setSelectedCase(caseItem);
          setCurrentScreen('DETAIL');
        }}
        onResolveFlag={caseItem => {
          setSelectedCase(caseItem);
          loadExistingCase(caseItem, true);
          setCurrentScreen('FLAG_RESOLVE');
        }}
        onLogout={() => {
          logout();
          setCurrentScreen('LOGIN');
        }}
      />
    );
  }

  // 3. Case Detail Screen
  if (currentScreen === 'DETAIL' && selectedCase) {
    return (
      <CaseDetailScreen
        caseItem={selectedCase}
        onBack={() => {
          setSelectedCase(null);
          setCurrentScreen('LIST');
        }}
        onEditEvidence={caseItem => {
          loadExistingCase(caseItem, false);
          setCurrentScreen('WIZARD');
        }}
      />
    );
  }

  // 4. Flag Resolution Screen
  if (currentScreen === 'FLAG_RESOLVE' && selectedCase) {
    return (
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
            onSubmitSuccess={submittedCase => {
              Alert.alert(
                'Case Pack Submitted!',
                `RO ${submittedCase.roNumber} has been submitted with OEM-named files and sent to the Warranty Review Portal.`,
                [{ text: 'View My Cases', onPress: () => setCurrentScreen('LIST') }]
              );
            }}
          />
        );
    }
  };

  return (
    <View style={styles.wizardContainer}>
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
    </View>
  );
}

import { scanbotService } from './src/services/scanbot.service';

export default function App() {
  React.useEffect(() => {
    scanbotService.initialize().then(initialized => {
      console.log('[App] Scanbot SDK initialization status:', initialized);
    });
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
});
