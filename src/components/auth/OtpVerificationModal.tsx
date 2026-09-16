import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';

interface OtpVerificationModalProps {
  visible: boolean;
  email: string;
  title?: string;
  subtitle?: string;
  devOtp?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onClose: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  visible,
  email,
  title = 'Verify Your Email',
  subtitle,
  devOtp,
  isLoading = false,
  errorMessage,
  onVerify,
  onResend,
  onClose,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const inputRefs = useRef<any[]>([]);

  useEffect(() => {
    if (visible) {
      setDigits(['', '', '', '', '', '']);
      setCountdown(60);
      setTimeout(() => {
        if (inputRefs.current[0] && typeof inputRefs.current[0].focus === 'function') {
          inputRefs.current[0].focus();
        }
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, countdown]);

  const handleDigitChange = (text: string, index: number) => {
    // If user pastes full 6 digit code
    if (text.length > 1) {
      const sanitized = text.replace(/[^0-9]/g, '').slice(0, 6);
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = sanitized[i] || '';
      }
      setDigits(newDigits);
      const nextIndex = Math.min(sanitized.length, 5);
      if (inputRefs.current[nextIndex] && typeof inputRefs.current[nextIndex].focus === 'function') {
        inputRefs.current[nextIndex].focus();
      }
      return;
    }

    const sanitized = text.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = sanitized;
    setDigits(newDigits);

    if (sanitized && index < 5) {
      if (inputRefs.current[index + 1] && typeof inputRefs.current[index + 1].focus === 'function') {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      if (inputRefs.current[index - 1] && typeof inputRefs.current[index - 1].focus === 'function') {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const fullOtp = digits.join('');
  const isComplete = fullOtp.length === 6;

  const handleVerify = () => {
    if (isComplete) {
      onVerify(fullOtp);
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

          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Icon name="shield" size={26} color={colors.primary} />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {subtitle || `Enter the 6-digit code sent to`}
          </Text>
          <Text style={styles.emailText}>{email}</Text>

          {/* Dev helper chip if provided */}
          {devOtp && (
            <View style={styles.devOtpChip}>
              <Icon name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.devOtpText}>Dev OTP: <Text style={styles.devOtpBold}>{devOtp}</Text></Text>
            </View>
          )}

          {/* Error banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* 6 Digit Input Boxes */}
          <View style={styles.otpRow}>
            {digits.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={el => {
                  inputRefs.current[idx] = el;
                }}
                value={digit}
                onChangeText={txt => handleDigitChange(txt, idx)}
                onKeyPress={e => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                ]}
              />
            ))}
          </View>

          {/* Resend OTP Row */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={styles.resendCountdown}>
                Resend code in <Text style={styles.countdownBold}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setCountdown(60);
                  onResend();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resendAction}>Resend verification code</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <Button
            title="Verify & Continue"
            variant="primary"
            size="lg"
            disabled={!isComplete || isLoading}
            loading={isLoading}
            onPress={handleVerify}
            fullWidth
            style={styles.verifyButton}
          />
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
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
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
  },
  emailText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.md,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: spacing.md,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.borderHighlight,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  resendRow: {
    marginVertical: spacing.sm,
  },
  resendCountdown: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  countdownBold: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  resendAction: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  verifyButton: {
    marginTop: spacing.md,
  },
});
