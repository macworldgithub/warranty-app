import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronRight,
  Plus,
  History,
  Wrench,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { hoistApi } from '../../api/hoist.api';
import { Hoist, HoistFacility, HoistStatus, HoistSummary } from '../../types/hoist.types';

interface HoistOverviewScreenProps {
  onBack: () => void;
  onInspectHoist: (hoist: Hoist) => void;
  onViewHistory: (hoist: Hoist) => void;
}

export const HoistOverviewScreen: React.FC<HoistOverviewScreenProps> = ({
  onBack,
  onInspectHoist,
  onViewHistory,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Determine user's assigned facility default
  const defaultFacility: HoistFacility =
    user?.workshopFacility === 'hyundai_chery'
      ? 'hyundai_chery'
      : user?.workshopFacility === 'byd_kia'
        ? 'byd_kia'
        : 'all';

  const [selectedFacility, setSelectedFacility] = useState<HoistFacility>(defaultFacility);
  const [hoists, setHoists] = useState<Hoist[]>([]);
  const [summary, setSummary] = useState<HoistSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HoistStatus>('ALL');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [hoistsData, summaryData] = await Promise.all([
        hoistApi.getHoists(selectedFacility === 'all' ? undefined : selectedFacility),
        hoistApi.getSummary(selectedFacility === 'all' ? undefined : selectedFacility),
      ]);
      setHoists(hoistsData || []);
      setSummary(summaryData || null);
    } catch (err) {
      console.error('Failed to load hoists:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFacility]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredHoists = useMemo(() => {
    return hoists.filter((h) => {
      if (selectedFacility !== 'all' && h.facility !== selectedFacility) return false;
      if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = h.name.toLowerCase().includes(q);
        const matchNum = String(h.hoistNumber).includes(q);
        const matchBrand = h.brand?.toLowerCase().includes(q);
        const matchType = h.type?.toLowerCase().includes(q);
        return matchName || matchNum || matchBrand || matchType;
      }
      return true;
    });
  }, [hoists, selectedFacility, statusFilter, searchQuery]);

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
        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitle}>Daily Hoist Inspection</Text>
          <Text style={styles.headerSubtitle}>Mandatory Pre-Shift Equipment Checks</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Wrench size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Facility Filter Tabs */}
      <View style={styles.facilityTabs}>
        <TouchableOpacity
          style={[
            styles.facilityTab,
            selectedFacility === 'all' && styles.facilityTabActive,
          ]}
          onPress={() => setSelectedFacility('all')}
        >
          <Text
            style={[
              styles.facilityTabText,
              selectedFacility === 'all' && styles.facilityTabTextActive,
            ]}
          >
            All Workshops (23)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.facilityTab,
            selectedFacility === 'hyundai_chery' && styles.facilityTabActiveBlue,
          ]}
          onPress={() => setSelectedFacility('hyundai_chery')}
        >
          <Text
            style={[
              styles.facilityTabText,
              selectedFacility === 'hyundai_chery' && styles.facilityTabTextActiveLight,
            ]}
          >
            Hyundai/Chery (11)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.facilityTab,
            selectedFacility === 'byd_kia' && styles.facilityTabActiveEmerald,
          ]}
          onPress={() => setSelectedFacility('byd_kia')}
        >
          <Text
            style={[
              styles.facilityTabText,
              selectedFacility === 'byd_kia' && styles.facilityTabTextActiveLight,
            ]}
          >
            BYD/Kia (12)
          </Text>
        </TouchableOpacity>
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
        {/* Metric Summary Cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderLeftColor: colors.accentEmerald, borderLeftWidth: 3 }]}>
            <View style={styles.metricIconBoxEmerald}>
              <CheckCircle2 size={16} color={colors.accentEmerald} />
            </View>
            <Text style={styles.metricValue}>{summary?.inspectedToday ?? 0}</Text>
            <Text style={styles.metricLabel}>Checked Today</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: colors.warning, borderLeftWidth: 3 }]}>
            <View style={styles.metricIconBoxAmber}>
              <Clock size={16} color={colors.warning} />
            </View>
            <Text style={styles.metricValue}>{summary?.pendingToday ?? 0}</Text>
            <Text style={styles.metricLabel}>Check Due</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: colors.danger, borderLeftWidth: 3 }]}>
            <View style={styles.metricIconBoxRed}>
              <AlertTriangle size={16} color={colors.danger} />
            </View>
            <Text style={styles.metricValue}>
              {(summary?.faultIdentified ?? 0) + (summary?.outOfService ?? 0)}
            </Text>
            <Text style={styles.metricLabel}>Fault / Tagged</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bay number, type, brand..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hoist Cards List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading workshop hoists...</Text>
          </View>
        ) : filteredHoists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wrench size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Hoists Found</Text>
            <Text style={styles.emptySubtitle}>No hoist bays matching your search or filters.</Text>
          </View>
        ) : (
          <View style={styles.hoistList}>
            {filteredHoists.map((hoist) => {
              const isCheckedToday =
                hoist.lastInspectionDate &&
                new Date(hoist.lastInspectionDate).toISOString().slice(0, 10) === todayStr;

              const isTaggedOut = hoist.lockoutTagoutActive || hoist.status === 'OUT_OF_SERVICE';
              const isFault = hoist.status === 'FAULT_IDENTIFIED';

              return (
                <View
                  key={hoist.id}
                  style={[
                    styles.hoistCard,
                    isTaggedOut
                      ? styles.hoistCardTaggedOut
                      : isFault
                        ? styles.hoistCardFault
                        : isCheckedToday
                          ? styles.hoistCardChecked
                          : null,
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.hoistCardHeader}>
                    <View style={styles.hoistNumberBadge}>
                      <Text style={styles.hoistNumberText}>{hoist.hoistNumber}</Text>
                    </View>
                    <View style={styles.hoistTitleBlock}>
                      <Text style={styles.hoistName}>{hoist.name}</Text>
                      <Text style={styles.hoistFacility}>{hoist.facilityName}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isTaggedOut
                          ? styles.statusPillTaggedOut
                          : isFault
                            ? styles.statusPillFault
                            : styles.statusPillOperational,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isTaggedOut
                            ? styles.statusPillTextTaggedOut
                            : isFault
                              ? styles.statusPillTextFault
                              : styles.statusPillTextOperational,
                        ]}
                      >
                        {isTaggedOut ? 'TAGGED OUT' : isFault ? 'FAULT' : 'OPERATIONAL'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Details */}
                  <View style={styles.hoistDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Specification:</Text>
                      <Text style={styles.detailValue}>{hoist.type}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dealership Brand:</Text>
                      <Text style={styles.detailValue}>{hoist.brand}</Text>
                    </View>
                  </View>

                  {/* Shift Inspection Status Box */}
                  <View
                    style={[
                      styles.shiftStatusBox,
                      isCheckedToday ? styles.shiftStatusBoxChecked : styles.shiftStatusBoxDue,
                    ]}
                  >
                    <View style={styles.shiftStatusLeft}>
                      {isCheckedToday ? (
                        <CheckCircle2 size={16} color={colors.accentEmerald} />
                      ) : (
                        <Clock size={16} color={colors.warning} />
                      )}
                      <Text
                        style={[
                          styles.shiftStatusText,
                          isCheckedToday ? styles.shiftStatusTextChecked : styles.shiftStatusTextDue,
                        ]}
                      >
                        {isCheckedToday ? 'Checked Today (Pass)' : 'Pre-Shift Check Due'}
                      </Text>
                    </View>
                    {hoist.lastInspectedByName && (
                      <Text style={styles.shiftStatusInspector}>
                        by {hoist.lastInspectedByName}
                      </Text>
                    )}
                  </View>

                  {/* Active Fault Warning */}
                  {hoist.activeFaultNotes ? (
                    <View style={styles.faultWarningBox}>
                      <ShieldAlert size={14} color={colors.danger} />
                      <Text style={styles.faultWarningText} numberOfLines={2}>
                        {hoist.activeFaultNotes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Card Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.inspectButton}
                      onPress={() => onInspectHoist(hoist)}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={16} color={colors.textInverse} />
                      <Text style={styles.inspectButtonText}>Start Pre-Shift Check</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.historyButton}
                      onPress={() => onViewHistory(hoist)}
                      activeOpacity={0.7}
                    >
                      <History size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceElevated,
  },
  backButton: {
    padding: 6,
    zIndex: 10,
    elevation: 10,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryGlow,
  },
  facilityTabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceElevated,
  },
  facilityTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityTabActive: {
    backgroundColor: colors.textPrimary,
  },
  facilityTabActiveBlue: {
    backgroundColor: '#1D4ED8',
  },
  facilityTabActiveEmerald: {
    backgroundColor: colors.accentEmerald,
  },
  facilityTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  facilityTabTextActive: {
    color: colors.textInverse,
  },
  facilityTabTextActiveLight: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 30,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIconBoxEmerald: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricIconBoxAmber: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricIconBoxRed: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  clearSearchText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
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
  hoistList: {
    gap: 12,
  },
  hoistCard: {
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
  hoistCardChecked: {
    borderColor: '#A7F3D0',
  },
  hoistCardFault: {
    borderColor: '#FDE68A',
  },
  hoistCardTaggedOut: {
    borderColor: '#FECDD3',
  },
  hoistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hoistNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hoistNumberText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  hoistTitleBlock: {
    flex: 1,
    marginLeft: 10,
  },
  hoistName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  hoistFacility: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillOperational: {
    backgroundColor: colors.successLight,
  },
  statusPillFault: {
    backgroundColor: colors.warningLight,
  },
  statusPillTaggedOut: {
    backgroundColor: colors.dangerLight,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillTextOperational: {
    color: colors.success,
  },
  statusPillTextFault: {
    color: colors.warning,
  },
  statusPillTextTaggedOut: {
    color: colors.danger,
  },
  hoistDetails: {
    gap: 4,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  shiftStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 10,
  },
  shiftStatusBoxChecked: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  shiftStatusBoxDue: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  shiftStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shiftStatusTextChecked: {
    color: colors.accentEmerald,
  },
  shiftStatusTextDue: {
    color: colors.warning,
  },
  shiftStatusInspector: {
    fontSize: 10,
    color: colors.textMuted,
  },
  faultWarningBox: {
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
  faultWarningText: {
    flex: 1,
    fontSize: 11,
    color: colors.dangerDark,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  inspectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inspectButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
