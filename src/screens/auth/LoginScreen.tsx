import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { OtpVerificationModal } from '../../components/auth/OtpVerificationModal';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type AuthTab = 'SIGN_IN' | 'SIGN_UP';
type FieldIcon = 'mail' | 'lock' | 'user';
type ActionIcon = 'eye' | 'eye-off';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const {
    login,
    sendRegistrationOtp,
    verifyRegistrationOtp,
    isLoading,
  } = useAuth();
  const { serverUrl, setServerUrl, isOnline, checkConnectivity } = useNetwork();
  
  const [activeTab, setActiveTab] = useState<AuthTab>('SIGN_IN');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  
  const [showDevConfig, setShowDevConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [authError, setAuthError] = useState<string | null>(null);

  // OTP Verification Modal for Registration
  const [showRegisterOtpModal, setShowRegisterOtpModal] = useState(false);
  const [registerDevOtp, setRegisterDevOtp] = useState<string | undefined>();
  const [otpVerifyError, setOtpVerifyError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Forgot Password Modal
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleSignIn = async () => {
    setAuthError(null);
    if (!signInEmail.trim() || !signInEmail.includes('@')) {
      setAuthError('Enter a valid work email address.');
      return;
    }
    if (!signInPassword) {
      setAuthError('Enter your password.');
      return;
    }

    try {
      await login(signInEmail.trim().toLowerCase(), signInPassword);
      onLoginSuccess();
    } catch (err: any) {
      setAuthError(err.message || 'Unable to sign in. Please check your details.');
    }
  };

  const handleSignUpStart = async () => {
    setAuthError(null);
    if (!signUpName.trim()) {
      setAuthError('Enter your full name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setAuthError('Enter a valid work email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setOtpVerifyError(null);
    try {
      const res = await sendRegistrationOtp(
        signUpEmail.trim().toLowerCase(),
        signUpName.trim()
      );
      if (res.devOtp) {
        setRegisterDevOtp(res.devOtp);
      }
      setShowRegisterOtpModal(true);
    } catch (err: any) {
      setAuthError(err.message || 'Unable to send registration verification code.');
    }
  };

  const handleVerifyRegisterOtp = async (otp: string) => {
    setOtpVerifyError(null);
    setIsVerifyingOtp(true);
    try {
      await verifyRegistrationOtp({
        name: signUpName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        otp: otp.trim(),
      });
      setShowRegisterOtpModal(false);
      onLoginSuccess();
    } catch (err: any) {
      setOtpVerifyError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    setOtpVerifyError(null);
    try {
      const res = await sendRegistrationOtp(
        signUpEmail.trim().toLowerCase(),
        signUpName.trim()
      );
      if (res.devOtp) {
        setRegisterDevOtp(res.devOtp);
      }
    } catch (err: any) {
      setOtpVerifyError(err.message || 'Failed to resend verification code.');
    }
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setAuthError(null);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Icon name="shield" size={24} color={colors.textPrimary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brandName}>BOORAN MOTOR GROUP</Text>
          <Text style={styles.productName}>Warranty Evidence</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Open developer settings"
          onPress={() => setShowDevConfig(!showDevConfig)}
          style={styles.settingsButton}
        >
          <Icon name="sliders" size={17} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.welcomeBlock}>
        <Text style={styles.title}>{activeTab === 'SIGN_IN' ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={styles.subtitle}>
          {activeTab === 'SIGN_IN'
            ? 'Sign in to continue to your workshop.'
            : 'Set up your technician profile to get started.'}
        </Text>
      </View>

      <View style={styles.connectionRow}>
        <View style={[styles.connectionDot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
        <Text style={styles.connectionText}>{isOnline ? 'Service available' : 'Offline mode'}</Text>
      </View>

      {showDevConfig && (
        <View style={styles.configPanel}>
          <Text style={styles.configLabel}>API host</Text>
          <View style={styles.configRow}>
            <TextInput
              value={tempUrl}
              onChangeText={setTempUrl}
              style={styles.configInput}
              placeholder="http://10.0.2.2:4000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title="Apply"
              variant="secondary"
              size="sm"
              onPress={() => {
                setServerUrl(tempUrl);
                setShowDevConfig(false);
                checkConnectivity();
              }}
            />
          </View>
        </View>
      )}

      <View style={styles.modeSwitch}>
        <TouchableOpacity onPress={() => switchTab('SIGN_IN')} style={[styles.modeButton, activeTab === 'SIGN_IN' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, activeTab === 'SIGN_IN' && styles.modeTextActive]}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => switchTab('SIGN_UP')} style={[styles.modeButton, activeTab === 'SIGN_UP' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, activeTab === 'SIGN_UP' && styles.modeTextActive]}>Register</Text>
        </TouchableOpacity>
      </View>

      {authError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{authError}</Text>
        </View>
      )}

      <View style={styles.form}>
        {activeTab === 'SIGN_IN' ? (
          <>
            <Field label="Work email" icon="mail" value={signInEmail} onChangeText={setSignInEmail} placeholder="name@booran.com.au" keyboardType="email-address" />
            <Field label="Password" icon="lock" value={signInPassword} onChangeText={setSignInPassword} placeholder="Enter your password" secureTextEntry={!showPassword} rightIcon={showPassword ? 'eye-off' : 'eye'} onRightIconPress={() => setShowPassword(!showPassword)} />
            
            <TouchableOpacity
              onPress={() => setShowForgotPasswordModal(true)}
              style={styles.forgotPasswordButton}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button title="Sign in" variant="primary" size="lg" loading={isLoading} onPress={handleSignIn} fullWidth style={styles.actionButton} />
          </>
        ) : (
          <>
            <Field label="Full name" icon="user" value={signUpName} onChangeText={setSignUpName} placeholder="Your full name" />
            <Field label="Work email" icon="mail" value={signUpEmail} onChangeText={setSignUpEmail} placeholder="name@booran.com.au" keyboardType="email-address" />
            <Field label="Password" icon="lock" value={signUpPassword} onChangeText={setSignUpPassword} placeholder="At least 6 characters" secureTextEntry={!showPassword} />
            <Field label="Confirm password" icon="lock" value={signUpConfirmPassword} onChangeText={setSignUpConfirmPassword} placeholder="Re-enter your password" secureTextEntry={!showPassword} />
            <Button title="Verify & Create Account" variant="primary" size="lg" loading={isLoading} onPress={handleSignUpStart} fullWidth style={styles.actionButton} />
          </>
        )}
      </View>

      <Text style={styles.footer}>For authorised workshop technicians</Text>

      {/* Registration OTP Modal */}
      <OtpVerificationModal
        visible={showRegisterOtpModal}
        email={signUpEmail}
        title="Verify Registration"
        subtitle="We sent a 6-digit verification code to"
        devOtp={registerDevOtp}
        isLoading={isVerifyingOtp}
        errorMessage={otpVerifyError}
        onVerify={handleVerifyRegisterOtp}
        onResend={handleResendRegisterOtp}
        onClose={() => setShowRegisterOtpModal(false)}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        initialEmail={signInEmail}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccess={() => {
          setShowForgotPasswordModal(false);
          setActiveTab('SIGN_IN');
        }}
      />
    </ScrollView>
  );
};

interface FieldProps {
  label: string;
  icon: FieldIcon;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  rightIcon?: ActionIcon;
  onRightIconPress?: () => void;
}

const Field: React.FC<FieldProps> = ({ label, icon, rightIcon, onRightIconPress, ...inputProps }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <TextInput {...inputProps} style={styles.input} placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.eyeButton}>
          <Icon name={rightIcon} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxl },
  logoMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: spacing.sm },
  brandName: { color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.bold, letterSpacing: 1.1 },
  productName: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold, marginTop: 2 },
  settingsButton: { padding: spacing.sm },
  welcomeBlock: { marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.sizes.display, fontWeight: typography.weights.heavy },
  subtitle: { color: colors.textSecondary, fontSize: typography.sizes.md, marginTop: spacing.xs },
  connectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  connectionDot: { width: 7, height: 7, borderRadius: 4, marginRight: spacing.xs },
  connectionText: { color: colors.textMuted, fontSize: typography.sizes.xs },
  configPanel: { backgroundColor: colors.surface, borderRadius: spacing.borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  configLabel: { color: colors.textSecondary, fontSize: typography.sizes.xs, marginBottom: spacing.xs },
  configRow: { flexDirection: 'row', gap: spacing.sm },
  configInput: { flex: 1, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary, borderRadius: spacing.borderRadius.sm, paddingHorizontal: spacing.sm, fontSize: typography.sizes.xs },
  modeSwitch: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.lg },
  modeButton: { paddingVertical: spacing.sm, marginRight: spacing.xl },
  modeButtonActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  modeText: { color: colors.textMuted, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  modeTextActive: { color: colors.primary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dangerLight, borderRadius: spacing.borderRadius.sm, padding: spacing.sm, marginBottom: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: typography.sizes.xs },
  form: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.md, paddingVertical: spacing.sm },
  eyeButton: { padding: spacing.xs },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  actionButton: { marginTop: spacing.sm },
  footer: { color: colors.textMuted, fontSize: typography.sizes.xs, textAlign: 'center', marginTop: 'auto', paddingTop: spacing.xxl },
});

