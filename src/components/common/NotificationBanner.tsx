import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { AlertTriangle, X, ChevronRight, Camera } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { FlagNotificationPayload } from '../../services/notifications.service';

interface NotificationBannerProps {
  notification: FlagNotificationPayload | null;
  onPress: (notification: FlagNotificationPayload) => void;
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

  const formatReason = (code: string) => {
    return code.replace(/_/g, ' ');
  };

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
        style={styles.card}
        onPress={() => onPress(notification)}
      >
        {/* Left Status Bar */}
        <View style={styles.leftBar} />

        {/* Icon & Details */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <AlertTriangle size={12} color="#DC2626" strokeWidth={2.5} />
              <Text style={styles.badgeText}>ACTION REQUIRED</Text>
            </View>
            <Text style={styles.roText}>RO #{notification.roNumber || 'CR-...'}</Text>
          </View>

          <Text style={styles.title} numberOfLines={1}>
            Evidence Rejected: {formatReason(notification.reasonCode)}
          </Text>

          {notification.instruction ? (
            <Text style={styles.instruction} numberOfLines={2}>
              "{notification.instruction}"
            </Text>
          ) : null}

          {/* Action Prompt */}
          <View style={styles.actionRow}>
            <View style={styles.recaptureTag}>
              <Camera size={11} color="#E11F26" strokeWidth={2.5} />
              <Text style={styles.recaptureText}>Tap to Recapture Evidence</Text>
            </View>
            <ChevronRight size={14} color="#E11F26" />
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
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  leftBar: {
    width: 6,
    alignSelf: 'stretch',
    backgroundColor: '#E11F26',
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
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
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
  instruction: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  recaptureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recaptureText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11F26',
  },
  dismissBtn: {
    padding: 12,
    alignSelf: 'flex-start',
  },
});
