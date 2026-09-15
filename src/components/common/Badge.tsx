import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'flagged'
  | 'neutral'
  | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.successLight,
          border: 'rgba(5, 150, 105, 0.25)',
          text: colors.success,
        };
      case 'warning':
        return {
          bg: colors.warningLight,
          border: 'rgba(217, 119, 6, 0.25)',
          text: colors.warning,
        };
      case 'danger':
        return {
          bg: colors.dangerLight,
          border: 'rgba(220, 38, 38, 0.25)',
          text: colors.danger,
        };
      case 'flagged':
        return {
          bg: colors.flaggedLight,
          border: 'rgba(225, 31, 38, 0.25)',
          text: colors.flagged,
        };
      case 'neutral':
        return {
          bg: colors.backgroundSecondary,
          border: colors.border,
          text: colors.textSecondary,
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: colors.borderHighlight,
          text: colors.textSecondary,
        };
      case 'primary':
      default:
        return {
          bg: colors.surfaceHighlight,
          border: 'rgba(225, 31, 38, 0.25)',
          text: colors.primary,
        };
    }
  };

  const v = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        styles[size],
        {
          backgroundColor: v.bg,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: v.text }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: spacing.borderRadius.full,
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
