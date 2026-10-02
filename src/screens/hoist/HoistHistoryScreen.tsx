import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { hoistApi } from '../../api/hoist.api';
import { Hoist, HoistInspection } from '../../types/hoist.types';

interface HoistHistoryScreenProps {
  hoist: Hoist;
  onBack: () => void;
}

export const HoistHistoryScreen: React.FC<HoistHistoryScreenProps> = ({
  hoist,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [inspections, setInspections] = useState<HoistInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const records = await hoistApi.getInspections({ hoistId: hoist.id, limit: 50 });
      setInspections(records || []);
    } catch (err) {
      console.error('Failed to load hoist history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hoist.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{hoist.name} History</Text>
          <Text style={styles.headerSubtitle}>
            {hoist.facilityName} · {hoist.brand} ({hoist.type})
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading inspection records...</Text>
          </View>
        ) : inspections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShieldCheck size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Prior Shift Checks</Text>
            <Text style={styles.emptySubtitle}>
              No inspection records have been logged for this hoist yet.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {inspections.map((insp) => {
              const isPass = insp.status === 'PASS';
              const isTaggedOut = insp.status === 'TAGGED_OUT' || insp.lockoutTagoutApplied;

              return (
                <View key={insp.id} style={styles.recordCard}>
                  {/* Record Header */}
                  <View style={styles.recordHeader}>
                    <View style={styles.dateBlock}>
                      <Calendar size={14} color={colors.textMuted} />
                      <Text style={styles.dateText}>{insp.shiftDate}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isTaggedOut
                          ? styles.statusBadgeTaggedOut
                          : isPass
                            ? styles.statusBadgePass
                            : styles.statusBadgeFault,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isTaggedOut
                            ? styles.statusBadgeTextTaggedOut
                            : isPass
                              ? styles.statusBadgeTextPass
                              : styles.statusBadgeTextFault,
                        ]}
                      >
                        {insp.status}
                      </Text>
                    </View>
                  </View>

                  {/* Inspector Details */}
                  <View style={styles.inspectorRow}>
                    <User size={13} color={colors.textSecondary} />
                    <Text style={styles.inspectorText}>
                      Inspector: <strong>{insp.inspectorName}</strong> ({insp.inspectorRole})
                    </Text>
                    <Text style={styles.timeText}>
                      {insp.signedAt
                        ? new Date(insp.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </Text>
                  </View>

                  {/* Fault Notes if present */}
                  {insp.faultNotes ? (
                    <View style={styles.faultNotesBox}>
                      <AlertTriangle size={13} color={colors.danger} />
                      <Text style={styles.faultNotesText}>
                        {insp.faultNotes} (Severity: {insp.faultSeverity})
                      </Text>
                    </View>
                  ) : null}

                  {/* 9-item checklist summary pills */}
                  <View style={styles.itemsGrid}>
                    {insp.checklistItems?.map((item) => (
                      <View key={item.itemId} style={styles.itemRow}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.itemStatusPill,
                            item.status === 'PASS'
                              ? styles.itemStatusPillPass
                              : item.status === 'FAULT'
                                ? styles.itemStatusPillFault
                                : styles.itemStatusPillNA,
                          ]}
                        >
                          <Text
                            style={[
                              styles.itemStatusPillText,
                              item.status === 'PASS'
                                ? styles.itemStatusPillTextPass
                                : item.status === 'FAULT'
                                  ? styles.itemStatusPillTextFault
                                  : styles.itemStatusPillTextNA,
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceElevated,
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 30,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePass: {
    backgroundColor: colors.successLight,
  },
  statusBadgeFault: {
    backgroundColor: colors.warningLight,
  },
  statusBadgeTaggedOut: {
    backgroundColor: colors.dangerLight,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBadgeTextPass: {
    color: colors.success,
  },
  statusBadgeTextFault: {
    color: colors.warning,
  },
  statusBadgeTextTaggedOut: {
    color: colors.danger,
  },
  inspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  inspectorText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  faultNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 10,
  },
  faultNotesText: {
    fontSize: 11,
    color: colors.dangerDark,
    fontWeight: '600',
    flex: 1,
  },
  itemsGrid: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevated,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  itemStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemStatusPillPass: {
    backgroundColor: colors.successLight,
  },
  itemStatusPillFault: {
    backgroundColor: colors.dangerLight,
  },
  itemStatusPillNA: {
    backgroundColor: colors.backgroundSecondary,
  },
  itemStatusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemStatusPillTextPass: {
    color: colors.accentEmerald,
  },
  itemStatusPillTextFault: {
    color: colors.danger,
  },
  itemStatusPillTextNA: {
    color: colors.textMuted,
  },
});
