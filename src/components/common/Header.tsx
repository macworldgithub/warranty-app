import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { useNetwork } from '../../context/NetworkContext';

const booranLogo = require('../../assets/images/booran-motors-transparent.png');

interface HeaderProps {
  title?: string;
  subtitle?: string;
  roNumber?: string;
  brandName?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showOfflineIndicator?: boolean;
  showBrandLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  roNumber,
  brandName,
  onBack,
  rightAction,
  showOfflineIndicator = true,
  showBrandLogo = false,
}) => {
  const insets = useSafeAreaInsets();
  const { isOnline, pendingCount } = useNetwork();

  const hasTitleContent = Boolean(title || subtitle);

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-left" size={24} color={colors.headerText} />
          </TouchableOpacity>
        ) : showBrandLogo ? (
          <View style={styles.logoContainer}>
            <Image
              source={booranLogo}
              style={styles.brandLogoImg}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.brandIcon}>
            <Icon name="shield" size={20} color={colors.headerText} />
          </View>
        )}

        {hasTitleContent ? (
          <View style={styles.titleArea}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.rightArea}>
          {roNumber && (
            <Badge
              label={roNumber}
              variant="outline"
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
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoImg: {
    width: 124,
    height: 34,
  },
  spacer: {
    flex: 1,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.headerText,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
    fontWeight: '500',
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roBadge: {
    marginRight: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});
