import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { Header } from '../../components/common/Header';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onLogout }) => {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();
  const { serverUrl, isOnline, pendingCount } = useNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMe();
      Alert.alert('Profile Updated', 'Your profile information has been refreshed.');
    } catch {
      // Ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Booran Warranty account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <View style={styles.container}>
      <Header
        title="Profile & Settings"
        subtitle="Manage your workshop account"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* User Card Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCircle, isAdmin && styles.adminAvatar]}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
          </View>

          <Text style={styles.userName}>{user?.name || 'Workshop Member'}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>

          <View style={styles.roleBadgeContainer}>
            {isAdmin ? (
              <Badge
                label="ADMINISTRATOR"
                variant="warning"
                size="md"
                icon={<Icon name="shield" size={14} color="#B45309" />}
              />
            ) : (
              <Badge
                label="TECHNICIAN"
                variant="primary"
                size="md"
                icon={<Icon name="wrench" size={14} color={colors.primary} />}
              />
            )}
            <Badge
              label={isOnline ? 'Online' : 'Offline'}
              variant={isOnline ? 'success' : 'neutral'}
              size="sm"
            />
          </View>
        </View>

        {/* Role Permissions Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="shield" size={18} color={isAdmin ? '#D97706' : colors.primary} />
            <Text style={styles.sectionTitle}>Role Permissions & Access</Text>
          </View>

          <View style={[styles.permissionBanner, isAdmin ? styles.adminBanner : styles.techBanner]}>
            <Text style={styles.permissionTitle}>
              {isAdmin ? 'System Administrator' : 'Workshop Technician'}
            </Text>
            <Text style={styles.permissionDesc}>
              {isAdmin
                ? 'Full Administrative Oversight: You have access to view, audit, and monitor all warranty evidence submissions across all technicians and workshop rooftops.'
                : 'Technician Access: You have permission to capture OEM-compliant evidence, record voice notes, and submit warranty claims. Only your own warranty cases are displayed.'}
            </Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="user-check" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Account Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValueMono}>{user?.id || '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Rooftop</Text>
            <Text style={styles.infoValue}>
              {user?.defaultSiteId ? user.defaultSiteId.replace(/_/g, ' ').toUpperCase() : 'Cranbourne BYD'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server Host</Text>
            <Text style={styles.infoValueSmall} numberOfLines={1}>
              {serverUrl}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Pending Queue</Text>
            <Text style={styles.infoValue}>
              {pendingCount > 0 ? `${pendingCount} item(s) pending sync` : 'All synced'}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionSection}>
          <Button
            title="Refresh Account Data"
            variant="secondary"
            size="md"
            leftIcon={<Icon name="refresh" size={16} color={colors.textPrimary} />}
            loading={isRefreshing}
            onPress={handleRefresh}
            fullWidth
            style={styles.refreshButton}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogoutPress}
            style={styles.logoutButton}
          >
            <Icon name="log-out" size={18} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Log Out of Workshop</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionFooter}>
          Booran Motors Warranty Capture · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  adminAvatar: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  avatarText: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  permissionBanner: {
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  adminBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  techBanner: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.borderHighlight,
  },
  permissionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  permissionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  infoValueMono: {
    fontSize: typography.sizes.xs,
    fontFamily: 'monospace',
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  infoValueSmall: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    maxWidth: '55%',
  },
  actionSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  refreshButton: {
    borderColor: colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
