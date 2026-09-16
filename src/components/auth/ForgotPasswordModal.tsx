import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'ENTER_EMAIL' | 'ENTER_OTP_NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  initialEmail = '',
  onClose,
  onSuccess,
}) => {
  const { sendForgotPasswordOtp, resetPassword } = useAuth();
  const [step, setStep] = useState<Step>('ENTER_EMAIL');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setStep('ENTER_EMAIL');
      setEmail(initialEmail);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setDevOtp(undefined);
      setErrorMessage(null);
    }
  }, [visible, initialEmail]);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendForgotPasswordOtp(email.trim().toLowerCase());
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setStep('ENTER_OTP_NEW_PASSWORD');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Check OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Icon name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {step === 'ENTER_EMAIL' && (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.iconCircle}>
                <Icon name="lock" size={26} color={colors.primary} />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your work email and we will send you a 6-digit OTP code to reset your password.
              </Text>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Icon name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Work email</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="mail" size={18} color={colors.textMuted} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@booran.com.au"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              </View>

              <Button
                title="Send Verification Code"
                variant="primary"
                size="lg"
                loading={isLoading}
                onPress={handleSendOtp}
                fullWidth
                style={styles.actionBtn}
              />
            </ScrollView>
          )}

          {step === 'ENTER_OTP_NEW_PASSWORD' && (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.iconCircle}>
                <Icon name="shield" size={26} color={colors.primary} />
              </View>
              <Text style={styles.title}>Enter OTP & New Password</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {devOtp && (
                <View style={styles.devOtpChip}>
                  <Icon name="sparkles" size={14} color={colors.primary} />
                  <Text style={styles.devOtpText}>Dev OTP: <Text style={styles.devOtpBold}>{devOtp}</Text></Text>
                </View>
              )}

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Icon name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>6-Digit OTP Code</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="shield" size={18} color={colors.textMuted} />
                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="123456"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.input, { letterSpacing: 3, fontWeight: 'bold' }]}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={18} color={colors.textMuted} />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={18} color={colors.textMuted} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                  />
                </View>
              </View>

              <Button
                title="Update Password"
                variant="primary"
                size="lg"
                loading={isLoading}
                onPress={handleResetPassword}
                fullWidth
                style={styles.actionBtn}
              />
            </ScrollView>
          )}

          {step === 'SUCCESS' && (
            <View style={styles.successBlock}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
                <Icon name="check" size={28} color={colors.success} />
              </View>
              <Text style={styles.title}>Password Reset Complete</Text>
              <Text style={styles.subtitle}>
                Your password has been securely updated. You can now sign in with your new credentials.
              </Text>
              <Button
                title="Back to Sign In"
                variant="primary"
                size="lg"
                onPress={() => {
                  onClose();
                  onSuccess();
                }}
                fullWidth
                style={styles.actionBtn}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  emailHighlight: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  devOtpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  devOtpText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
  },
  devOtpBold: {
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.sizes.xs,
  },
  field: {
    width: '100%',
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    paddingVertical: spacing.sm,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  successBlock: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
