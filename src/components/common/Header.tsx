import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { useNetwork } from '../../context/NetworkContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  roNumber?: string;
  brandName?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showOfflineIndicator?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  roNumber,
  brandName,
  onBack,
  rightAction,
  showOfflineIndicator = true,
}) => {
  const insets = useSafeAreaInsets();
  const { isOnline, pendingCount } = useNetwork();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandIcon}>
            <Icon name="shield" size={22} color={colors.primary} />
          </View>
        )}

        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightArea}>
          {roNumber && (
            <Badge
              label={roNumber}
              variant="primary"
              size="sm"
              style={styles.roBadge}
            />
          )}

          {showOfflineIndicator && !isOnline && (
            <Badge
              label="Offline"
              variant="warning"
              size="sm"
              icon={<Icon name="wifi-off" size={12} color={colors.warning} />}
            />
          )}

          {pendingCount > 0 && (
            <Badge
              label={`${pendingCount} Queued`}
              variant="warning"
              size="sm"
            />
          )}

          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surfaceGlass,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: 'rgba(225, 31, 38, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roBadge: {
    marginRight: spacing.xs,
  },
});
