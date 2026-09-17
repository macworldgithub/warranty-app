import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  X,
  ChevronRight,
  Camera,
  FileText,
} from 'lucide-react-native';
import { AppNotificationPayload } from '../../services/notifications.service';

interface NotificationBannerProps {
  notification: AppNotificationPayload | null;
  onPress: (notification: AppNotificationPayload) => void;
  onDismiss: () => void;
}

export function NotificationBanner({
  notification,
  onPress,
  onDismiss,
}: NotificationBannerProps) {
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (notification) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [notification, slideAnim]);

  if (!notification) return null;

  const type = notification.type || (notification.reasonCode ? 'FLAGGED' : 'INFO');

  const getConfig = () => {
    switch (type) {
      case 'APPROVED':
        return {
          barColor: '#10B981',
          borderColor: '#A7F3D0',
          badgeBg: '#ECFDF5',
          badgeBorder: '#6EE7B7',
          badgeTextColor: '#047857',
          badgeText: 'WARRANTY APPROVED',
          Icon: CheckCircle2,
          iconColor: '#10B981',
          ActionIcon: ChevronRight,
          actionColor: '#059669',
          actionText: 'Tap to View Claim Details',
        };
      case 'AWAITING_REVIEW':
        return {
          barColor: '#0284C7',
          borderColor: '#BAE6FD',
          badgeBg: '#F0F9FF',
          badgeBorder: '#7DD3FC',
          badgeTextColor: '#0369A1',
          badgeText: 'AWAITING REVIEW',
          Icon: Clock,
          iconColor: '#0284C7',
          ActionIcon: FileText,
          actionColor: '#0284C7',
          actionText: 'Tap to View Case File',
        };
      case 'FLAGGED':
      default:
        return {
          barColor: '#E11F26',
          borderColor: '#FECACA',
          badgeBg: '#FEF2F2',
          badgeBorder: '#FCA5A5',
          badgeTextColor: '#DC2626',
          badgeText: 'ACTION REQUIRED',
          Icon: AlertTriangle,
          iconColor: '#DC2626',
          ActionIcon: Camera,
          actionColor: '#E11F26',
          actionText: 'Tap to Recapture Evidence',
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.Icon;
  const ActionIconComponent = config.ActionIcon;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.card, { borderColor: config.borderColor }]}
        onPress={() => onPress(notification)}
      >
        {/* Left Status Bar */}
        <View style={[styles.leftBar, { backgroundColor: config.barColor }]} />

        {/* Content Details */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: config.badgeBg, borderColor: config.badgeBorder },
              ]}
            >
              <IconComponent size={12} color={config.iconColor} strokeWidth={2.5} />
              <Text style={[styles.badgeText, { color: config.badgeTextColor }]}>
                {config.badgeText}
              </Text>
            </View>
            <Text style={styles.roText}>RO #{notification.roNumber || 'CR-...'}</Text>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>

          {notification.instruction || notification.body ? (
            <Text style={styles.bodyText} numberOfLines={2}>
              {notification.instruction ? `"${notification.instruction}"` : notification.body}
            </Text>
          ) : null}

          {/* Action Prompt */}
          <View style={styles.actionRow}>
            <View style={styles.actionTag}>
              <ActionIconComponent size={11} color={config.actionColor} strokeWidth={2.5} />
              <Text style={[styles.actionText, { color: config.actionColor }]}>
                {config.actionText}
              </Text>
            </View>
            <ChevronRight size={14} color={config.actionColor} />
          </View>
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.dismissBtn}
          onPress={onDismiss}
        >
          <X size={16} color="#94A3B8" strokeWidth={2} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 12,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  leftBar: {
    width: 6,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  actionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: 12,
    alignSelf: 'flex-start',
  },
});

