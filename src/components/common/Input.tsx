import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon, IconName } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  sublabel?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  sublabel,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  required = false,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.requiredStar}> *</Text>}
          </Text>
          {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : undefined,
          props.editable === false ? styles.inputWrapperDisabled : undefined,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Icon name={leftIcon} size={18} color={colors.textSecondary} />
          </View>
        )}

        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : undefined,
            style,
          ]}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
          >
            <Icon name={rightIcon} size={18} color={colors.primaryLight} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  requiredStar: {
    color: colors.danger,
  },
  sublabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    minHeight: spacing.minTapTarget,
    paddingHorizontal: spacing.md,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  inputWrapperDisabled: {
    opacity: 0.7,
    backgroundColor: colors.backgroundSecondary,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    marginTop: spacing.xs,
    fontWeight: typography.weights.medium,
  },
});
