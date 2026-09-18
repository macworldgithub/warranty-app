import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCheck,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  notificationsService,
  AppNotificationPayload,
} from '../../services/notifications.service';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectNotification: (notification: AppNotificationPayload) => void;
}

type TabType = 'all' | 'unread' | 'flagged';

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onSelectNotification,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<AppNotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshList = () => {
    const list = notificationsService.getNotificationsHistory();
    setNotifications(list);
    setUnreadCount(notificationsService.getUnreadCount());
  };

  useEffect(() => {
    if (visible) {
      refreshList();
    }
  }, [visible]);

  useEffect(() => {
    const unsubscribe = notificationsService.onNotification(() => {
      refreshList();
    });
    return () => unsubscribe();
  }, []);

  const handleMarkAllRead = () => {
    notificationsService.markAllAsRead();
    refreshList();
  };

  const handleItemClick = (item: AppNotificationPayload) => {
    notificationsService.markAsRead(item.id);
    refreshList();
    onClose();
    onSelectNotification(item);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'flagged') return item.type === 'FLAGGED';
    return true;
  });

  const getTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(dateString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getItemStyle = (type: string) => {
    switch (type) {
      case 'APPROVED':
        return {
          iconBg: '#ECFDF5',
          iconBorder: '#A7F3D0',
          Icon: CheckCircle2,
          iconColor: '#059669',
          badgeBg: '#ECFDF5',
          badgeColor: '#047857',
          badgeText: 'WARRANTY APPROVED',
        };
      case 'AWAITING_REVIEW':
        return {
          iconBg: '#F0F9FF',
          iconBorder: '#BAE6FD',
          Icon: Clock,
          iconColor: '#0284C7',
          badgeBg: '#F0F9FF',
          badgeColor: '#0369A1',
          badgeText: 'AWAITING REVIEW',
        };
      case 'FLAGGED':
      default:
        return {
          iconBg: '#FEF2F2',
          iconBorder: '#FECACA',
          Icon: AlertTriangle,
          iconColor: '#DC2626',
          badgeBg: '#FEF2F2',
          badgeColor: '#DC2626',
          badgeText: 'ACTION REQUIRED',
        };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bellWrapper}>
                <Bell size={20} color="#E11F26" strokeWidth={2.2} />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle}>Warranty Alerts</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountText}>{unreadCount} new</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerSubtitle}>
                  Recent status updates & quality flags
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Sub-Header Actions */}
          <View style={styles.actionHeader}>
            {/* Filter Tabs */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveTab('all')}
                style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'all' && styles.tabTextActive,
                  ]}
                >
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveTab('unread')}
                style={[styles.tabBtn, activeTab === 'unread' && styles.tabBtnActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'unread' && styles.tabTextActive,
                  ]}
                >
                  Unread ({unreadCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveTab('flagged')}
                style={[styles.tabBtn, activeTab === 'flagged' && styles.tabBtnActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'flagged' && styles.tabTextActive,
                  ]}
                >
                  Flags
                </Text>
              </TouchableOpacity>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleMarkAllRead}
                style={styles.markAllBtn}
              >
                <CheckCheck size={14} color="#0284C7" />
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notifications Scroll List */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <Bell size={28} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>
                  All warranty cases are up to date and verified.
                </Text>
              </View>
            ) : (
              filteredNotifications.map((item) => {
                const styleConfig = getItemStyle(item.type);
                const IconComponent = styleConfig.Icon;
                const isUnread = !item.isRead;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.88}
                    onPress={() => handleItemClick(item)}
                    style={[
                      styles.itemCard,
                      isUnread && styles.itemCardUnread,
                    ]}
                  >
                    {/* Status Icon */}
                    <View
                      style={[
                        styles.itemIconBox,
                        {
                          backgroundColor: styleConfig.iconBg,
                          borderColor: styleConfig.iconBorder,
                        },
                      ]}
                    >
                      <IconComponent size={16} color={styleConfig.iconColor} />
                    </View>

                    {/* Content Details */}
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <View
                          style={[
                            styles.itemBadge,
                            { backgroundColor: styleConfig.badgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.itemBadgeText,
                              { color: styleConfig.badgeColor },
                            ]}
                          >
                            {styleConfig.badgeText}
                          </Text>
                        </View>
                        <Text style={styles.itemTime}>
                          {getTimeAgo(item.timestamp)}
                        </Text>
                      </View>

                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>

                      <Text style={styles.itemBody} numberOfLines={2}>
                        {item.instruction ? `"${item.instruction}"` : item.body}
                      </Text>
                    </View>

                    {/* Unread indicator / Arrow */}
                    <View style={styles.itemRight}>
                      {isUnread && <View style={styles.unreadDot} />}
                      <ChevronRight size={16} color="#CBD5E1" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Developer FCM Debug & Token Info Box */}
            <View style={styles.fcmDebugCard}>
              <View style={styles.fcmDebugHeader}>
                <View style={styles.fcmDebugTitleRow}>
                  <View style={[styles.fcmStatusDot, { backgroundColor: notificationsService.getDeviceToken() ? '#10B981' : '#F59E0B' }]} />
                  <Text style={styles.fcmDebugTitle}>Firebase FCM Device Token</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.fcmConsoleBtn}
                  onPress={() => {
                    notificationsService.printCurrentToken();
                    Alert.alert(
                      'FCM Token Logged',
                      'FCM Device Token has been printed to your Metro / terminal console!'
                    );
                  }}
                >
                  <Text style={styles.fcmConsoleBtnText}>Print to Console</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fcmTokenText} numberOfLines={2}>
                {notificationsService.getDeviceToken() || 'Obtaining device token...'}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.fcmViewBtn}
                onPress={() => {
                  const token = notificationsService.getDeviceToken();
                  if (token) {
                    notificationsService.printFcmBanner(token, 'developer_debug');
                    Alert.alert(
                      'FCM Registration Token',
                      `${token}\n\n(Also printed to Metro / terminal console)`
                    );
                  } else {
                    Alert.alert(
                      'Token Unavailable',
                      'FCM token not yet generated. Please make sure the app was rebuilt with native Firebase dependencies.'
                    );
                  }
                }}
              >
                <Text style={styles.fcmViewBtnText}>View Full Token / Test FCM</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '55%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadCountBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11F26',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  itemCardUnread: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  itemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  itemRight: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11F26',
  },
  fcmDebugCard: {
    marginTop: 12,
    marginBottom: 20,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fcmDebugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fcmDebugTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fcmStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fcmDebugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  fcmConsoleBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  fcmConsoleBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  fcmTokenText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94A3B8',
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  fcmViewBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  fcmViewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
