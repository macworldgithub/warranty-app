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
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronRight,
  History,
  Wrench,
  ShieldCheck,
  FileText,
  BarChart3,
  Calendar,
  User,
  Home,
  Car,
  Key,
  X,
  Lock,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { BottomNavBar } from '../../components/common/BottomNavBar';
import { useAuth } from '../../context/AuthContext';
import { hoistApi } from '../../api/hoist.api';
import {
  Hoist,
  HoistFacility,
  HoistStatus,
  HoistSummary,
  HoistInspection,
} from '../../types/hoist.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HoistOverviewScreenProps {
  onBack: () => void;
  onInspectHoist: (hoist: Hoist) => void;
  onViewHistory: (hoist: Hoist) => void;
  onOpenHome?: () => void;
  onOpenRoadTest?: () => void;
  onOpenLoaners?: () => void;
  onOpenTickets?: (tab?: string) => void;
  onOpenProfile?: () => void;
  onOpenVehicles?: () => void;
}

type HoistViewMode = 'bays' | 'compliance' | 'logs';

function getUserInitials(name?: string): string {
  if (!name) return 'SH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const HoistOverviewScreen: React.FC<HoistOverviewScreenProps> = ({
  onBack,
  onInspectHoist,
  onViewHistory,
  onOpenHome,
  onOpenRoadTest,
  onOpenLoaners,
  onOpenTickets,
  onOpenProfile,
  onOpenVehicles,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userFirstName = user?.name ? user.name.trim().split(/\s+/)[0] : 'Shaun';
  const userInitials = getUserInitials(user?.name);

  // Active top navigation tab (Bays / Compliance / Logs)
  const [activeTab, setActiveTab] = useState<HoistViewMode>('bays');

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
  const [inspections, setInspections] = useState<HoistInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HoistStatus>('ALL');
  const [logFilter, setLogFilter] = useState<'ALL' | 'PASS' | 'FAULT' | 'TAGGED'>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<HoistInspection | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [hoistsData, summaryData, inspectionsData] = await Promise.all([
        hoistApi.getHoists(selectedFacility === 'all' ? undefined : selectedFacility),
        hoistApi.getSummary(selectedFacility === 'all' ? undefined : selectedFacility),
        hoistApi.getInspections({
          facility: selectedFacility === 'all' ? undefined : selectedFacility,
          limit: 50,
        }),
      ]);
      setHoists(hoistsData || []);
      setSummary(summaryData || null);
      setInspections(inspectionsData || []);
    } catch (err) {
      console.error('Failed to load hoists data:', err);
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

  const filteredLogs = useMemo(() => {
    return inspections.filter((item) => {
      if (selectedFacility !== 'all' && item.facility !== selectedFacility) return false;
      if (logFilter === 'PASS' && item.status !== 'PASS') return false;
      if (logFilter === 'FAULT' && item.status !== 'FAULT_IDENTIFIED') return false;
      if (logFilter === 'TAGGED' && item.status !== 'TAGGED_OUT') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInspector = item.inspectorName?.toLowerCase().includes(q);
        const matchBay = `bay ${item.hoistNumber}`.includes(q) || String(item.hoistNumber).includes(q);
        const matchNotes = item.faultNotes?.toLowerCase().includes(q);
        return matchInspector || matchBay || matchNotes;
      }
      return true;
    });
  }, [inspections, selectedFacility, logFilter, searchQuery]);

  // Compliance calculations
  const totalBays = summary?.totalHoists || hoists.length || 23;
  const inspectedBays = summary?.inspectedToday || 0;
  const pendingBays = summary?.pendingToday || Math.max(0, totalBays - inspectedBays);
  const complianceRate = totalBays > 0 ? Math.round((inspectedBays / totalBays) * 100) : 0;
  const faultsCount = (summary?.faultIdentified || 0) + (summary?.outOfService || 0);

  // Facility-specific metrics for compliance view
  const hcHoists = useMemo(() => hoists.filter((h) => h.facility === 'hyundai_chery'), [hoists]);
  const hcChecked = useMemo(
    () =>
      hcHoists.filter(
        (h) =>
          h.lastInspectionDate &&
          new Date(h.lastInspectionDate).toISOString().slice(0, 10) === todayStr
      ).length,
    [hcHoists, todayStr]
  );
  const hcRate = hcHoists.length > 0 ? Math.round((hcChecked / hcHoists.length) * 100) : 0;

  const bkHoists = useMemo(() => hoists.filter((h) => h.facility === 'byd_kia'), [hoists]);
  const bkChecked = useMemo(
    () =>
      bkHoists.filter(
        (h) =>
          h.lastInspectionDate &&
          new Date(h.lastInspectionDate).toISOString().slice(0, 10) === todayStr
      ).length,
    [bkHoists, todayStr]
  );
  const bkRate = bkHoists.length > 0 ? Math.round((bkChecked / bkHoists.length) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack || onOpenHome}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitle}>Daily Hoist Inspection</Text>
          <Text style={styles.headerSubtitle}>
            Mandatory Workshop Safety & Compliance · {totalBays} Bays
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Wrench size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── SEGMENTED TOP VIEW TABS (Bays, Daily Compliance, Inspection Logs) ── */}
      <View style={styles.viewSegmentContainer}>
        <TouchableOpacity
          style={[styles.viewSegmentBtn, activeTab === 'bays' && styles.viewSegmentBtnActive]}
          onPress={() => setActiveTab('bays')}
          activeOpacity={0.8}
        >
          <Wrench size={14} color={activeTab === 'bays' ? '#FFFFFF' : '#64748B'} />
          <Text
            style={[styles.viewSegmentText, activeTab === 'bays' && styles.viewSegmentTextActive]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Bays & Checks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewSegmentBtn,
            activeTab === 'compliance' && styles.viewSegmentBtnActive,
          ]}
          onPress={() => setActiveTab('compliance')}
          activeOpacity={0.8}
        >
          <BarChart3
            size={14}
            color={activeTab === 'compliance' ? '#FFFFFF' : '#64748B'}
          />
          <Text
            style={[
              styles.viewSegmentText,
              activeTab === 'compliance' && styles.viewSegmentTextActive,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Compliance
          </Text>
          {complianceRate < 100 && (
            <View
              style={[
                styles.segmentBadge,
                activeTab === 'compliance' && styles.segmentBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBadgeText,
                  activeTab === 'compliance' && styles.segmentBadgeTextActive,
                ]}
              >
                {complianceRate}%
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewSegmentBtn, activeTab === 'logs' && styles.viewSegmentBtnActive]}
          onPress={() => setActiveTab('logs')}
          activeOpacity={0.8}
        >
          <History size={14} color={activeTab === 'logs' ? '#FFFFFF' : '#64748B'} />
          <Text
            style={[styles.viewSegmentText, activeTab === 'logs' && styles.viewSegmentTextActive]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Logs
          </Text>
          {inspections.length > 0 && (
            <View
              style={[
                styles.segmentBadgeNeutral,
                activeTab === 'logs' && styles.segmentBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBadgeNeutralText,
                  activeTab === 'logs' && styles.segmentBadgeTextActive,
                ]}
              >
                {inspections.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── FACILITY FILTER TABS ─────────────────────────────────────────── */}
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
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            All ({totalBays})
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
            numberOfLines={1}
            ellipsizeMode="tail"
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
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            BYD/Kia (12)
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── MAIN SCROLL CONTENT ─────────────────────────────────────────── */}
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
        {/* ================================================================= */}
        {/* VIEW 1: BAYS & CHECKLIST SCREEN                                  */}
        {/* ================================================================= */}
        {activeTab === 'bays' && (
          <>
            {/* Metric Summary Cards */}
            <View style={styles.metricsRow}>
              <View
                style={[
                  styles.metricCard,
                  { borderLeftColor: colors.accentEmerald, borderLeftWidth: 3 },
                ]}
              >
                <View style={styles.metricIconBoxEmerald}>
                  <CheckCircle2 size={16} color={colors.accentEmerald} />
                </View>
                <Text style={styles.metricValue}>{inspectedBays}</Text>
                <Text style={styles.metricLabel}>Checked Today</Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { borderLeftColor: colors.warning, borderLeftWidth: 3 },
                ]}
              >
                <View style={styles.metricIconBoxAmber}>
                  <Clock size={16} color={colors.warning} />
                </View>
                <Text style={styles.metricValue}>{pendingBays}</Text>
                <Text style={styles.metricLabel}>Check Due</Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { borderLeftColor: colors.danger, borderLeftWidth: 3 },
                ]}
              >
                <View style={styles.metricIconBoxRed}>
                  <AlertTriangle size={16} color={colors.danger} />
                </View>
                <Text style={styles.metricValue}>{faultsCount}</Text>
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
                <Text style={styles.emptySubtitle}>
                  No hoist bays matching your search or filters.
                </Text>
              </View>
            ) : (
              <View style={styles.hoistList}>
                {filteredHoists.map((hoist) => {
                  const isCheckedToday =
                    hoist.lastInspectionDate &&
                    new Date(hoist.lastInspectionDate).toISOString().slice(0, 10) === todayStr;

                  const isTaggedOut =
                    hoist.lockoutTagoutActive || hoist.status === 'OUT_OF_SERVICE';
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
                          <Text style={styles.hoistNumberText}>
                            {String(hoist.hoistNumber).padStart(2, '0')}
                          </Text>
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
                                : isCheckedToday
                                  ? styles.statusPillChecked
                                  : styles.statusPillDue,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              isTaggedOut
                                ? styles.statusPillTextTaggedOut
                                : isFault
                                  ? styles.statusPillTextFault
                                  : isCheckedToday
                                    ? styles.statusPillTextChecked
                                    : styles.statusPillTextDue,
                            ]}
                          >
                            {isTaggedOut
                              ? 'TAGGED OUT'
                              : isFault
                                ? 'FAULT IDENTIFIED'
                                : isCheckedToday
                                  ? 'OPERATIONAL'
                                  : 'DUE TODAY'}
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
                          <Text style={styles.detailLabel}>Manufacturer:</Text>
                          <Text style={styles.detailValue}>
                            {hoist.brand} ({hoist.capacityKg} kg cap)
                          </Text>
                        </View>
                      </View>

                      {/* Shift Inspection Status Box */}
                      <View
                        style={[
                          styles.shiftStatusBox,
                          isCheckedToday
                            ? styles.shiftStatusBoxChecked
                            : styles.shiftStatusBoxDue,
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
                              isCheckedToday
                                ? styles.shiftStatusTextChecked
                                : styles.shiftStatusTextDue,
                            ]}
                          >
                            {isCheckedToday
                              ? 'Pre-Shift Check Passed'
                              : 'Pre-Shift Inspection Due Today'}
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
                          <ShieldAlert size={15} color={colors.danger} />
                          <Text style={styles.faultWarningText} numberOfLines={2}>
                            {hoist.activeFaultNotes}
                          </Text>
                        </View>
                      ) : null}

                      {/* Card Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[
                            styles.inspectButton,
                            isTaggedOut && styles.inspectButtonDisabled,
                          ]}
                          onPress={() => onInspectHoist(hoist)}
                          activeOpacity={0.8}
                          disabled={isTaggedOut}
                        >
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={styles.inspectButtonText}>
                            {isCheckedToday ? 'Re-Inspect Bay' : 'Start Pre-Shift Check'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.historyButton}
                          onPress={() => onViewHistory(hoist)}
                          activeOpacity={0.7}
                        >
                          <History size={16} color={colors.textSecondary} />
                          <Text style={styles.historyButtonText}>Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: DAILY COMPLIANCE DASHBOARD                                */}
        {/* ================================================================= */}
        {activeTab === 'compliance' && (
          <View style={styles.complianceContainer}>
            {/* Overall Scorecard Banner */}
            <View style={styles.scorecardCard}>
              <View style={styles.scorecardTop}>
                <View style={styles.scorecardLeft}>
                  <Text style={styles.scorecardEyebrow}>WORKPLACE OH&S COMPLIANCE</Text>
                  <Text style={styles.scorecardTitle}>Daily Hoist Readiness</Text>
                  <Text style={styles.scorecardSubtitle}>
                    {inspectedBays} of {totalBays} workshop hoists verified safe for shift operations.
                  </Text>
                </View>
                <View style={styles.scorecardGauge}>
                  <Text style={styles.scorecardPercent}>{complianceRate}%</Text>
                  <Text style={styles.scorecardPercentLabel}>Compliant</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${complianceRate}%`,
                      backgroundColor:
                        complianceRate >= 90
                          ? '#059669'
                          : complianceRate >= 60
                            ? '#D97706'
                            : '#DC2626',
                    },
                  ]}
                />
              </View>

              <View style={styles.scorecardFooter}>
                <Text style={styles.scorecardFooterText}>
                  {complianceRate === 100
                    ? 'All workshop bays 100% compliant with Australian Standards AS 2550.9'
                    : `${pendingBays} bay(s) pending mandatory pre-shift inspection before work.`}
                </Text>
              </View>
            </View>

            {/* Facility Compliance Breakdown */}
            <Text style={styles.complianceSectionTitle}>Workshop Facility Breakdown</Text>

            {/* Hyundai & Chery Workshop Card */}
            <View style={styles.facilityComplianceCard}>
              <View style={styles.facilityComplianceHeader}>
                <View style={styles.facilityComplianceLeft}>
                  <View
                    style={[styles.facilityDot, { backgroundColor: '#2563EB' }]}
                  />
                  <Text style={styles.facilityComplianceName}>
                    Hyundai / Chery Workshop
                  </Text>
                </View>
                <Text style={styles.facilityComplianceRate}>{hcRate}%</Text>
              </View>
              <Text style={styles.facilityComplianceSub}>
                {hcChecked} of {hcHoists.length} Hoists Inspected Today
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${hcRate}%`, backgroundColor: '#2563EB' },
                  ]}
                />
              </View>
            </View>

            {/* BYD & Kia Workshop Card */}
            <View style={styles.facilityComplianceCard}>
              <View style={styles.facilityComplianceHeader}>
                <View style={styles.facilityComplianceLeft}>
                  <View
                    style={[styles.facilityDot, { backgroundColor: '#059669' }]}
                  />
                  <Text style={styles.facilityComplianceName}>
                    BYD / Kia Specialist Facility
                  </Text>
                </View>
                <Text style={styles.facilityComplianceRate}>{bkRate}%</Text>
              </View>
              <Text style={styles.facilityComplianceSub}>
                {bkChecked} of {bkHoists.length} Hoists Inspected Today (including EV battery drop hoists)
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${bkRate}%`, backgroundColor: '#059669' },
                  ]}
                />
              </View>
            </View>

            {/* Lockout / Tagout Safety Register */}
            <Text style={styles.complianceSectionTitle}>Lockout / Tagout (LOTO) & Defect Register</Text>
            {hoists.filter((h) => h.lockoutTagoutActive || h.status !== 'OPERATIONAL').length === 0 ? (
              <View style={styles.cleanRegisterCard}>
                <ShieldCheck size={28} color="#059669" />
                <Text style={styles.cleanRegisterTitle}>Zero Active LOTO Tags</Text>
                <Text style={styles.cleanRegisterSub}>
                  No hoists currently flagged with critical faults or tagged out of service.
                </Text>
              </View>
            ) : (
              hoists
                .filter((h) => h.lockoutTagoutActive || h.status !== 'OPERATIONAL')
                .map((h) => (
                  <View key={h.id} style={styles.lotoCard}>
                    <View style={styles.lotoHeader}>
                      <View style={styles.lotoLeft}>
                        <Lock size={16} color="#DC2626" />
                        <Text style={styles.lotoBayTitle}>
                          Bay {h.hoistNumber} - {h.name}
                        </Text>
                      </View>
                      <View style={styles.lotoBadge}>
                        <Text style={styles.lotoBadgeText}>
                          {h.lockoutTagoutActive ? 'LOTO ACTIVE' : 'ATTENTION REQUIRED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.lotoFacility}>{h.facilityName}</Text>
                    <Text style={styles.lotoNotes}>
                      {h.activeFaultNotes || 'Maintenance inspection scheduled.'}
                    </Text>
                  </View>
                ))
            )}

            {/* Safety Guidelines Card */}
            <View style={styles.guidelinesCard}>
              <View style={styles.guidelinesHeader}>
                <ShieldAlert size={18} color="#D71920" />
                <Text style={styles.guidelinesTitle}>Booran Motors Safety Standard</Text>
              </View>
              <Text style={styles.guidelinesBody}>
                1. Pre-shift inspection must be completed daily before lifting any vehicle.{'\n'}
                2. If any safety catch or hydraulic leak is observed, immediately tag out the bay and notify the workshop supervisor.{'\n'}
                3. EV battery hoists (Bays 12 & 17) require dual-arm lock clearance check before high-voltage battery drops.
              </Text>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: HOIST INSPECTION LOGS & AUDIT TRAIL                       */}
        {/* ================================================================= */}
        {activeTab === 'logs' && (
          <View style={styles.logsContainer}>
            {/* Filter Pills */}
            <View style={styles.logFiltersRow}>
              <TouchableOpacity
                style={[styles.logFilterChip, logFilter === 'ALL' && styles.logFilterChipActive]}
                onPress={() => setLogFilter('ALL')}
              >
                <Text
                  style={[
                    styles.logFilterChipText,
                    logFilter === 'ALL' && styles.logFilterChipTextActive,
                  ]}
                >
                  All Logs ({inspections.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.logFilterChip,
                  logFilter === 'PASS' && styles.logFilterChipActiveEmerald,
                ]}
                onPress={() => setLogFilter('PASS')}
              >
                <Text
                  style={[
                    styles.logFilterChipText,
                    logFilter === 'PASS' && styles.logFilterChipTextActive,
                  ]}
                >
                  Passed ({inspections.filter((i) => i.status === 'PASS').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.logFilterChip,
                  logFilter === 'FAULT' && styles.logFilterChipActiveAmber,
                ]}
                onPress={() => setLogFilter('FAULT')}
              >
                <Text
                  style={[
                    styles.logFilterChipText,
                    logFilter === 'FAULT' && styles.logFilterChipTextActive,
                  ]}
                >
                  Faults ({inspections.filter((i) => i.status === 'FAULT_IDENTIFIED').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.logFilterChip,
                  logFilter === 'TAGGED' && styles.logFilterChipActiveRed,
                ]}
                onPress={() => setLogFilter('TAGGED')}
              >
                <Text
                  style={[
                    styles.logFilterChipText,
                    logFilter === 'TAGGED' && styles.logFilterChipTextActive,
                  ]}
                >
                  LOTO ({inspections.filter((i) => i.status === 'TAGGED_OUT').length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search within logs */}
            <View style={styles.searchContainer}>
              <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search inspector name, bay #, or notes..."
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

            {/* List of inspection records */}
            {filteredLogs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FileText size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Inspection Logs</Text>
                <Text style={styles.emptySubtitle}>
                  No inspection logs matching the selected filter.
                </Text>
              </View>
            ) : (
              filteredLogs.map((log) => {
                const isPass = log.status === 'PASS';
                const isTagged = log.status === 'TAGGED_OUT';
                const passedCount = log.checklistItems.filter((i) => i.status === 'PASS').length;
                const totalCount = log.checklistItems.length || 9;

                return (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.logCard}
                    activeOpacity={0.75}
                    onPress={() => setSelectedLogDetail(log)}
                  >
                    <View style={styles.logCardTop}>
                      <View style={styles.logInspectorRow}>
                        <View style={styles.logAvatar}>
                          <Text style={styles.logAvatarText}>
                            {getUserInitials(log.inspectorName)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.logInspectorName}>{log.inspectorName}</Text>
                          <Text style={styles.logInspectorRole}>
                            {log.inspectorRole || 'Technician'} · Shift: {log.shiftType}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.logStatusBadge,
                          isTagged
                            ? styles.logStatusBadgeTagged
                            : isPass
                              ? styles.logStatusBadgePass
                              : styles.logStatusBadgeFault,
                        ]}
                      >
                        <Text
                          style={[
                            styles.logStatusBadgeText,
                            isTagged
                              ? styles.logStatusBadgeTextTagged
                              : isPass
                                ? styles.logStatusBadgeTextPass
                                : styles.logStatusBadgeTextFault,
                          ]}
                        >
                          {isTagged ? 'TAGGED OUT' : isPass ? 'PASS' : 'FAULT'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logDivider} />

                    <View style={styles.logCardMiddle}>
                      <View style={styles.logBayBadge}>
                        <Text style={styles.logBayBadgeText}>Bay {log.hoistNumber}</Text>
                      </View>
                      <View style={styles.logTimeCol}>
                        <Text style={styles.logFacilityText}>
                          {log.facility === 'byd_kia'
                            ? 'BYD / Kia Workshop'
                            : 'Hyundai / Chery Workshop'}
                        </Text>
                        <Text style={styles.logDateText}>
                          {log.shiftDate} at{' '}
                          {new Date(log.signedAt || log.createdAt || Date.now()).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </Text>
                      </View>
                      <View style={styles.logScoreBadge}>
                        <CheckCircle2 size={13} color={isPass ? '#059669' : '#D97706'} />
                        <Text
                          style={[
                            styles.logScoreText,
                            { color: isPass ? '#059669' : '#D97706' },
                          ]}
                        >
                          {passedCount}/{totalCount} Items
                        </Text>
                      </View>
                    </View>

                    {log.faultNotes ? (
                      <View style={styles.logFaultNotesBox}>
                        <AlertTriangle size={14} color="#DC2626" />
                        <Text style={styles.logFaultNotesText} numberOfLines={2}>
                          {log.faultNotes}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.logCardFooter}>
                      <Text style={styles.logViewDetailsText}>Tap to view 9-point checklist details</Text>
                      <ChevronRight size={15} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── INSPECTION DETAILS MODAL ─────────────────────────────────────── */}
      <Modal
        visible={selectedLogDetail !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLogDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Bay {selectedLogDetail?.hoistNumber} Pre-Shift Inspection
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedLogDetail?.shiftDate} · {selectedLogDetail?.inspectorName} (
                  {selectedLogDetail?.inspectorRole || 'Technician'})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedLogDetail(null)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Status Header */}
              <View
                style={[
                  styles.modalStatusBanner,
                  selectedLogDetail?.status === 'PASS'
                    ? styles.modalStatusBannerPass
                    : styles.modalStatusBannerFault,
                ]}
              >
                {selectedLogDetail?.status === 'PASS' ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <AlertTriangle size={20} color="#DC2626" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalStatusTitle}>
                    {selectedLogDetail?.status === 'PASS'
                      ? 'Pre-Shift Inspection Passed'
                      : selectedLogDetail?.status === 'TAGGED_OUT'
                        ? 'Hoist Tagged Out of Service (LOTO)'
                        : 'Fault Identified & Logged'}
                  </Text>
                  <Text style={styles.modalStatusSub}>
                    Signed at{' '}
                    {new Date(selectedLogDetail?.signedAt || Date.now()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </View>
              </View>

              {/* 9-Point Safety Checklist Items */}
              <Text style={styles.modalSectionTitle}>9-Point Safety Checklist Results</Text>
              <View style={styles.checklistList}>
                {selectedLogDetail?.checklistItems.map((item, idx) => {
                  const itemPass = item.status === 'PASS';
                  return (
                    <View key={item.itemId || idx} style={styles.checklistItemRow}>
                      <View
                        style={[
                          styles.checkItemIconBox,
                          itemPass
                            ? styles.checkItemIconBoxPass
                            : styles.checkItemIconBoxFault,
                        ]}
                      >
                        {itemPass ? (
                          <CheckCircle2 size={16} color="#059669" />
                        ) : (
                          <AlertTriangle size={16} color="#DC2626" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkItemTitle}>{item.title}</Text>
                        {item.notes ? (
                          <Text style={styles.checkItemNotes}>Note: {item.notes}</Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.checkItemStatusText,
                          { color: itemPass ? '#059669' : '#DC2626' },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Fault Notes if applicable */}
              {selectedLogDetail?.faultNotes ? (
                <View style={styles.modalFaultBox}>
                  <Text style={styles.modalFaultTitle}>Reported Fault & Work Order</Text>
                  <Text style={styles.modalFaultBody}>{selectedLogDetail.faultNotes}</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setSelectedLogDetail(null)}
            >
              <Text style={styles.modalDoneBtnText}>Close Audit Detail</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── FIXED BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <BottomNavBar
        activeTab="hoist"
        onOpenHome={onOpenHome}
        onOpenDrive={onOpenRoadTest}
        onOpenHoists={() => {}}
        onOpenLoaners={onOpenLoaners}
        onOpenVehicles={onOpenVehicles}
        onOpenTickets={onOpenTickets}
        onOpenProfile={onOpenProfile}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── HEADER ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#D71920',
  },
  backButton: {
    padding: 6,
    zIndex: 10,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // ── TOP SEGMENT SWITCHER ─────────────────────────────────────────────
  viewSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 5,
  },
  viewSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    minWidth: 0,
  },
  viewSegmentBtnActive: {
    backgroundColor: '#D71920',
  },
  viewSegmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    flexShrink: 1,
  },
  viewSegmentTextActive: {
    color: '#FFFFFF',
  },
  segmentBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 2,
  },
  segmentBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  segmentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  segmentBadgeTextActive: {
    color: '#FFFFFF',
  },
  segmentBadgeNeutral: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 2,
  },
  segmentBadgeNeutralText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },

  // ── FACILITY FILTER TABS ───────────────────────────────────────────
  facilityTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  facilityTab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  facilityTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  facilityTabActiveBlue: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  facilityTabActiveEmerald: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  facilityTabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  facilityTabTextActive: {
    color: '#FFFFFF',
  },
  facilityTabTextActiveLight: {
    color: '#FFFFFF',
  },

  // ── CONTENT ──────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 28,
  },

  // ── METRICS ROW ──────────────────────────────────────────────────────
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIconBoxEmerald: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricIconBoxAmber: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricIconBoxRed: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // ── SEARCH BAR ───────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },

  // ── HOIST CARD LIST ──────────────────────────────────────────────────
  hoistList: {
    gap: 12,
  },
  hoistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hoistCardChecked: {
    borderColor: '#A7F3D0',
  },
  hoistCardFault: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  hoistCardTaggedOut: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  hoistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hoistNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hoistNumberText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  hoistTitleBlock: {
    flex: 1,
  },
  hoistName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  hoistFacility: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillChecked: {
    backgroundColor: '#DCFCE7',
  },
  statusPillDue: {
    backgroundColor: '#FEF3C7',
  },
  statusPillFault: {
    backgroundColor: '#FEF3C7',
  },
  statusPillTaggedOut: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusPillTextChecked: {
    color: '#059669',
  },
  statusPillTextDue: {
    color: '#D97706',
  },
  statusPillTextFault: {
    color: '#D97706',
  },
  statusPillTextTaggedOut: {
    color: '#DC2626',
  },
  hoistDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  shiftStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  shiftStatusBoxChecked: {
    backgroundColor: '#F0FDF4',
  },
  shiftStatusBoxDue: {
    backgroundColor: '#FFFBEB',
  },
  shiftStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  shiftStatusTextChecked: {
    color: '#059669',
  },
  shiftStatusTextDue: {
    color: '#D97706',
  },
  shiftStatusInspector: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  faultWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  faultWarningText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  inspectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D71920',
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  inspectButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  inspectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  // ── DAILY COMPLIANCE VIEW ────────────────────────────────────────────
  complianceContainer: {
    gap: 14,
  },
  scorecardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  scorecardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scorecardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  scorecardEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D71920',
    letterSpacing: 0.8,
  },
  scorecardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  scorecardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  scorecardGauge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scorecardPercent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  scorecardPercentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scorecardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  scorecardFooterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  complianceSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  facilityComplianceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  facilityComplianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  facilityComplianceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  facilityComplianceName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  facilityComplianceRate: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  facilityComplianceSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  cleanRegisterCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cleanRegisterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 6,
  },
  cleanRegisterSub: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
  },
  lotoCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  lotoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lotoBayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  lotoBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  lotoFacility: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  lotoNotes: {
    fontSize: 11.5,
    color: '#991B1B',
    fontWeight: '600',
    marginTop: 4,
  },
  guidelinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  guidelinesBody: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 18,
  },

  // ── LOGS VIEW ────────────────────────────────────────────────────────
  logsContainer: {
    gap: 10,
  },
  logFiltersRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  logFilterChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  logFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  logFilterChipActiveEmerald: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  logFilterChipActiveAmber: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  logFilterChipActiveRed: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  logFilterChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  logFilterChipTextActive: {
    color: '#FFFFFF',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  logCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logInspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logAvatarText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  logInspectorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  logInspectorRole: {
    fontSize: 10.5,
    color: '#64748B',
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logStatusBadgePass: {
    backgroundColor: '#DCFCE7',
  },
  logStatusBadgeFault: {
    backgroundColor: '#FEF3C7',
  },
  logStatusBadgeTagged: {
    backgroundColor: '#FEE2E2',
  },
  logStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logStatusBadgeTextPass: {
    color: '#059669',
  },
  logStatusBadgeTextFault: {
    color: '#D97706',
  },
  logStatusBadgeTextTagged: {
    color: '#DC2626',
  },
  logDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  logCardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logBayBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logBayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  logTimeCol: {
    flex: 1,
    marginLeft: 8,
  },
  logFacilityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  logDateText: {
    fontSize: 10,
    color: '#64748B',
  },
  logScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logScoreText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  logFaultNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  logFaultNotesText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  logCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  logViewDetailsText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // ── MODAL ────────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    maxHeight: 440,
  },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  modalStatusBannerPass: {
    backgroundColor: '#DCFCE7',
  },
  modalStatusBannerFault: {
    backgroundColor: '#FEE2E2',
  },
  modalStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalStatusSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  checklistList: {
    gap: 8,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkItemIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkItemIconBoxPass: {
    backgroundColor: '#DCFCE7',
  },
  checkItemIconBoxFault: {
    backgroundColor: '#FEE2E2',
  },
  checkItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkItemNotes: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 2,
  },
  checkItemStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalFaultBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalFaultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  modalFaultBody: {
    fontSize: 11.5,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16,
  },
  modalDoneBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── EMPTY & LOADING ──────────────────────────────────────────────────
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── BOTTOM NAVIGATION BAR ────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  bottomBarTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  bottomBarUserTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomBarAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D71920',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarAvatarText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D71920',
  },
});
