import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { useNetwork } from '../../context/NetworkContext';
import { useGeofence } from '../../context/GeofenceContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react-native';

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
  showPresenceBadge?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
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
  showPresenceBadge = true,
  showLogout,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, logout } = useAuth();
  const { isOnline, pendingCount } = useNetwork();
  const {
    presenceStatus,
    distanceMeters,
    siteName,
    radiusMeters,
    currentActivity,
    activeRoNumber,
    lastPingAt,
    liveCoords,
    hasLocationPermission,
    gpsMode,
    requestLocationAccess,
    switchToLiveMode,
  } = useGeofence();

  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const shouldShowLogout = showLogout !== undefined ? showLogout : !onBack;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Booran Motors Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            } else {
              logout();
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const isOnSite = presenceStatus === 'ON_SITE';
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
          {/* Blinking Geofence Presence Badge */}
          {showPresenceBadge && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPresenceModal(true)}
              style={[
                styles.presenceBadge,
                isOnSite ? styles.presenceBadgeOnSite : styles.presenceBadgeOffSite,
              ]}
            >
              <Animated.View
                style={[
                  styles.presenceDot,
                  isOnSite ? styles.presenceDotOnSite : styles.presenceDotOffSite,
                  { opacity: pulseAnim },
                ]}
              />
              <Text
                style={[
                  styles.presenceText,
                  isOnSite ? styles.presenceTextOnSite : styles.presenceTextOffSite,
                ]}
              >
                {isOnSite ? 'ON-SITE' : 'OFF-SITE'}
              </Text>
            </TouchableOpacity>
          )}

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

          {shouldShowLogout && isAuthenticated && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleLogout}
              style={styles.logoutBtn}
              accessibilityLabel="Log Out"
            >
              <LogOut size={18} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Geofence Status Modal */}
      <Modal
        visible={showPresenceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPresenceModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowPresenceModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View
                  style={[
                    styles.modalStatusPill,
                    isOnSite ? styles.modalStatusPillOnSite : styles.modalStatusPillOffSite,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.presenceDot,
                      isOnSite ? styles.presenceDotOnSite : styles.presenceDotOffSite,
                      { opacity: pulseAnim },
                    ]}
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      isOnSite ? styles.modalStatusTextOnSite : styles.modalStatusTextOffSite,
                    ]}
                  >
                    {isOnSite ? 'ON-SITE (WORKSHOP)' : 'OFF-SITE (ROAD TEST / ROVING)'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowPresenceModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSiteTitle}>{siteName}</Text>
              <Text style={styles.modalSiteSub}>
                {isOnSite
                  ? `Inside ${radiusMeters}m workshop perimeter • ~${distanceMeters}m from center`
                  : `Outside workshop boundary • ~${(distanceMeters / 1000).toFixed(1)} km from center`}
              </Text>

              <View style={styles.modalInfoTable}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>GPS Telemetry Mode</Text>
                  <Text style={[styles.modalInfoValue, { color: gpsMode === 'LIVE' ? colors.success : colors.warning, fontWeight: '700' }]}>
                    {gpsMode === 'LIVE' ? '🟢 LIVE GPS' : '🟠 SIMULATED'}
                  </Text>
                </View>
                {gpsMode === 'LIVE' && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Live Device Fix</Text>
                    <Text style={styles.modalInfoValue}>
                      {liveCoords
                        ? `${liveCoords.latitude.toFixed(4)}, ${liveCoords.longitude.toFixed(4)}`
                        : hasLocationPermission
                        ? 'Acquiring GPS fix...'
                        : 'Permission required'}
                    </Text>
                  </View>
                )}
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Current Activity</Text>
                  <Text style={styles.modalInfoValue}>{currentActivity}</Text>
                </View>
                {activeRoNumber ? (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Active Repair Order</Text>
                    <Text style={[styles.modalInfoValue, { color: colors.primary }]}>
                      {activeRoNumber}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Site Perimeter Policy</Text>
                  <Text style={styles.modalInfoValue}>{radiusMeters} meters (Admin set)</Text>
                </View>
                <View style={[styles.modalInfoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.modalInfoLabel}>Last Telemetry Sync</Text>
                  <Text style={styles.modalInfoValue}>
                    {lastPingAt ? lastPingAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Active'}
                  </Text>
                </View>
              </View>

              {!hasLocationPermission && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={requestLocationAccess}
                  style={[styles.modalToggleBtn, { backgroundColor: colors.primary, marginBottom: spacing.sm }]}
                >
                  <Text style={styles.modalToggleBtnText}>📍 Grant Live Location Permission</Text>
                </TouchableOpacity>
              )}

              {gpsMode === 'SIMULATED' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={switchToLiveMode}
                  style={[styles.modalToggleBtn, { backgroundColor: colors.success, marginBottom: spacing.sm }]}
                >
                  <Text style={styles.modalToggleBtnText}>Switch to Live GPS Mode</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roBadge: {
    marginRight: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  presenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  presenceBadgeOnSite: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderColor: 'rgba(52, 211, 153, 0.65)',
  },
  presenceBadgeOffSite: {
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
    borderColor: 'rgba(251, 191, 36, 0.75)',
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  presenceDotOnSite: {
    backgroundColor: '#34D399',
  },
  presenceDotOffSite: {
    backgroundColor: '#FBBF24',
  },
  presenceText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  presenceTextOnSite: {
    color: '#ECFDF5',
  },
  presenceTextOffSite: {
    color: '#FEF3C7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalStatusPillOnSite: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  modalStatusPillOffSite: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalStatusTextOnSite: {
    color: '#065F46',
  },
  modalStatusTextOffSite: {
    color: '#92400E',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  modalBody: {
    gap: 12,
  },
  modalSiteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSiteSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  modalInfoTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalInfoLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  modalToggleBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
