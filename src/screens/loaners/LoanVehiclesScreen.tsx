import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Header } from '../../components/common/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoanAgreement, LoanAgreementKpis } from '../../types';
import { loanAgreementsApi } from '../../api';
import { ReturnLoanerModal } from './ReturnLoanerModal';
import { IssueLoanerWizardScreen } from './IssueLoanerWizardScreen';
import { INITIAL_REAL_LOAN_AGREEMENTS } from './loanSeedData';
import { LoanAgreementPdfModal } from './LoanAgreementPdfModal';
import { useAuth } from '../../context/AuthContext';

interface LoanVehiclesScreenProps {
  onBack?: () => void;
}

const ROOFTOPS = [
  { label: 'All Rooftops', siteId: 'all' },
  { label: 'Cranbourne', siteId: 'site_cranbourne_byd' },
  { label: 'Dandenong', siteId: 'site_dandenong_multi' },
  { label: 'Berwick', siteId: 'site_berwick_nissan' },
  { label: 'Cheltenham', siteId: 'site_cheltenham_mg' },
];

const computeKpis = (agreementList: LoanAgreement[], siteId: string): LoanAgreementKpis => {
  const filtered = siteId === 'all'
    ? agreementList
    : agreementList.filter((a) => a.siteId === siteId);

  const now = Date.now();
  const in60Min = now + 3600000;

  let outNow = 0;
  let dueSoon = 0;
  let overdue = 0;

  for (const a of filtered) {
    if (a.status === 'ACTIVE' || a.status === 'DUE_SOON' || a.status === 'OVERDUE') {
      outNow++;
      const dueTime = a.dueBackDateTime ? new Date(a.dueBackDateTime).getTime() : 0;
      if (dueTime && dueTime < now) {
        overdue++;
      } else if (dueTime && dueTime <= in60Min) {
        dueSoon++;
      }
    }
  }

  // Dealership fleet allocations across Booran network
  const fleetCapacityMap: Record<string, number> = {
    all: 36,
    site_cranbourne_byd: 12,
    site_dandenong_multi: 12,
    site_berwick_nissan: 8,
    site_cheltenham_mg: 8,
  };
  const totalCapacity = fleetCapacityMap[siteId] ?? 12;
  const available = Math.max(0, totalCapacity - outNow);

  return {
    available,
    outNow,
    dueSoon,
    overdue,
  };
};

export const LoanVehiclesScreen: React.FC<LoanVehiclesScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId } = useAuth();

  // Role separation: Technician only views their assigned rooftop, Admin can view all
  const isTechnician = user?.role === 'TECHNICIAN';
  const technicianSiteId = user?.defaultSiteId || activeSiteId || 'site_cranbourne_byd';
  const technicianSiteObj = ROOFTOPS.find((r) => r.siteId === technicianSiteId) || ROOFTOPS[1];

  const [selectedSiteId, setSelectedSiteId] = useState(isTechnician ? technicianSiteId : 'all');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'ATTENTION' | 'RETURNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agreements, setAgreements] = useState<LoanAgreement[]>(() => {
    return isTechnician
      ? INITIAL_REAL_LOAN_AGREEMENTS.filter((a) => a.siteId === technicianSiteId)
      : INITIAL_REAL_LOAN_AGREEMENTS;
  });
  const [kpis, setKpis] = useState<LoanAgreementKpis>(() =>
    computeKpis(INITIAL_REAL_LOAN_AGREEMENTS, isTechnician ? technicianSiteId : 'all')
  );

  // Modals / Subscreens
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<LoanAgreement | null>(null);
  const [pdfTarget, setPdfTarget] = useState<LoanAgreement | null>(null);

  // Enforce rooftop lock whenever technician user is detected
  useEffect(() => {
    if (isTechnician) {
      setSelectedSiteId(technicianSiteId);
    }
  }, [isTechnician, technicianSiteId]);

  const fetchLoanData = useCallback(async () => {
    try {
      const targetSiteId = isTechnician ? technicianSiteId : selectedSiteId;
      const siteParam = targetSiteId === 'all' ? undefined : targetSiteId;
      const [data, kpiData] = await Promise.all([
        loanAgreementsApi.findAll(siteParam),
        loanAgreementsApi.getKpis(siteParam),
      ]);
      const list = data && data.length > 0 ? data : INITIAL_REAL_LOAN_AGREEMENTS;
      const scopedList = isTechnician ? list.filter((a) => a.siteId === technicianSiteId) : list;
      setAgreements(scopedList);
      if (kpiData && (kpiData.available > 0 || kpiData.outNow > 0 || kpiData.overdue > 0)) {
        setKpis(kpiData);
      } else {
        setKpis(computeKpis(scopedList, targetSiteId));
      }
    } catch (err: any) {
      console.warn('Failed to load loan data from API, using real local fleet data:', err?.message);
      const scopedList = isTechnician
        ? INITIAL_REAL_LOAN_AGREEMENTS.filter((a) => a.siteId === technicianSiteId)
        : INITIAL_REAL_LOAN_AGREEMENTS;
      setAgreements(scopedList);
      setKpis(computeKpis(scopedList, isTechnician ? technicianSiteId : selectedSiteId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSiteId, isTechnician, technicianSiteId]);

  useEffect(() => {
    fetchLoanData();
  }, [fetchLoanData]);

  // Keep KPI boxes in live sync whenever selected rooftop or agreement list updates
  useEffect(() => {
    if (agreements.length > 0) {
      const effectiveSiteId = isTechnician ? technicianSiteId : selectedSiteId;
      setKpis(computeKpis(agreements, effectiveSiteId));
    }
  }, [selectedSiteId, agreements, isTechnician, technicianSiteId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoanData();
  };

  // Filter agreements by tab, search, and technician rooftop
  const filteredAgreements = agreements.filter((ag) => {
    // Rooftop filter (Technicians strictly locked to their site)
    const effectiveSiteId = isTechnician ? technicianSiteId : selectedSiteId;
    if (effectiveSiteId !== 'all' && ag.siteId !== effectiveSiteId) {
      return false;
    }

    // Tab filter
    if (activeTab === 'ACTIVE' && ag.status !== 'ACTIVE' && ag.status !== 'DUE_SOON') {
      return false;
    }
    if (activeTab === 'ATTENTION' && ag.status !== 'DUE_SOON' && ag.status !== 'OVERDUE') {
      return false;
    }
    if (activeTab === 'RETURNED' && ag.status !== 'RETURNED') {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRego = ag.vehicle?.rego?.toLowerCase().includes(q);
      const matchCust = ag.customer?.name?.toLowerCase().includes(q);
      const matchNum = ag.agreementNumber?.toLowerCase().includes(q);
      const matchPhone = ag.customer?.mobile?.toLowerCase().includes(q);
      return matchRego || matchCust || matchNum || matchPhone;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return { label: 'Overdue', bg: colors.dangerLight, text: colors.danger };
      case 'DUE_SOON':
        return { label: 'Due in 60m', bg: colors.warningLight, text: colors.warning };
      case 'ACTIVE':
        return { label: 'On Loan', bg: colors.primaryGlow, text: colors.primary };
      case 'RETURNED':
        return { label: 'Returned', bg: colors.successLight, text: colors.success };
      default:
        return { label: status, bg: colors.border, text: colors.textSecondary };
    }
  };

  const formatDueTime = (isoString?: string) => {
    if (!isoString) return 'Not set';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  // If Wizard open, render it full screen
  if (isWizardOpen) {
    const activeLabel = isTechnician
      ? technicianSiteObj.label
      : (ROOFTOPS.find((r) => r.siteId === selectedSiteId && r.siteId !== 'all')?.label || 'Cranbourne');

    return (
      <IssueLoanerWizardScreen
        initialRooftop={activeLabel}
        isRooftopLocked={isTechnician}
        onBack={() => setIsWizardOpen(false)}
        onSuccess={(_newAgreement) => {
          setIsWizardOpen(false);
          setAgreements((prev) => [_newAgreement, ...prev.filter((a) => a.id !== _newAgreement.id)]);
          fetchLoanData();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Top App Header */}
      <Header
        title="Loan Vehicle Operations"
        subtitle={isTechnician ? `Workshop Fleet • ${technicianSiteObj.label} Rooftop` : "Admin Fleet Portal • All Dealership Rooftops"}
        onBack={onBack}
        rightAction={
          <TouchableOpacity
            style={styles.issueTopBtn}
            onPress={() => setIsWizardOpen(true)}
            activeOpacity={0.85}
          >
            <Icon name="plus" size={16} color="#FFF" />
            <Text style={styles.issueTopBtnText}>Issue</Text>
          </TouchableOpacity>
        }
      />

      {/* Rooftop Selector (Admin) vs Locked Workshop Badge (Technician) */}
      {isTechnician ? (
        <View style={styles.techRooftopBar}>
          <View style={styles.techRooftopBadge}>
            <Icon name="map-pin" size={15} color={colors.primary} />
            <Text style={styles.techRooftopText}>
              Assigned Workshop: <Text style={styles.techRooftopBold}>{technicianSiteObj.label}</Text>
            </Text>
          </View>
          <View style={styles.techRoleBadge}>
            <Text style={styles.techRoleText}>Technician View</Text>
          </View>
        </View>
      ) : (
        <View style={styles.rooftopScrollWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={ROOFTOPS}
            keyExtractor={(item) => item.siteId}
            renderItem={({ item }) => {
              const isSelected = selectedSiteId === item.siteId;
              return (
                <TouchableOpacity
                  style={[styles.rooftopPill, isSelected && styles.rooftopPillActive]}
                  onPress={() => setSelectedSiteId(item.siteId)}
                >
                  <Text style={[styles.rooftopPillText, isSelected && styles.rooftopPillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.rooftopScroll}
          />
        </View>
      )}

      {/* KPI Cards Row (from PDF page 7 Example 2) */}
      <View style={styles.kpiContainer}>
        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'ALL' && styles.kpiCardActive]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.7}
        >
          <Text style={styles.kpiVal}>{kpis.available}</Text>
          <Text style={styles.kpiLabel}>Available</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.success }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'ACTIVE' && styles.kpiCardActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kpiVal, { color: colors.primary }]}>{kpis.outNow}</Text>
          <Text style={styles.kpiLabel}>Out Now</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'ATTENTION' && styles.kpiCardActive]}
          onPress={() => setActiveTab('ATTENTION')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kpiVal, { color: colors.warning }]}>{kpis.dueSoon}</Text>
          <Text style={styles.kpiLabel}>Due Soon</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.warning }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'ATTENTION' && styles.kpiCardActive]}
          onPress={() => setActiveTab('ATTENTION')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kpiVal, { color: colors.danger }]}>{kpis.overdue}</Text>
          <Text style={styles.kpiLabel}>Overdue</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.danger }]} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Rego, Customer, Mobile or Agreement..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: 'ALL', label: 'All Fleet' },
          { key: 'ACTIVE', label: 'Active Loan' },
          { key: 'ATTENTION', label: 'Alerts (Due/Overdue)' },
          { key: 'RETURNED', label: 'Returned' },
        ].map((t) => {
          const isSelected = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.key as any)}
            >
              <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Agreement List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching loan agreements...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAgreements}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 24, 48) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="car" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Loan Agreements Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No results matched your search criteria.'
                  : 'Tap "+ Issue" above to create and sign a new customer loan agreement.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            const isLoanActive = item.status === 'ACTIVE' || item.status === 'DUE_SOON' || item.status === 'OVERDUE';
            return (
              <View style={styles.card}>
                {/* Top Row: Rego + Rooftop + Status */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.regoRow}>
                      <Text style={styles.cardRego}>{item.vehicle?.rego}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardModel}>
                      {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}
                    </Text>
                    <Text style={styles.cardAgreementNum}>{item.agreementNumber}</Text>
                  </View>
                  <Text style={styles.cardRooftop}>{item.siteName}</Text>
                </View>

                {/* Middle Info: Customer & Timings */}
                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <Icon name="user" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {item.customer?.name} ({item.customer?.mobile})
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Icon name="clock" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {item.status === 'RETURNED'
                        ? `Returned: ${formatDueTime(item.inbound?.returnedAt)}`
                        : `Expected: ${formatDueTime(item.dueBackDateTime)}`}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Icon name="shield" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      Odo Out: {item.outbound?.odometerOut?.toLocaleString() || '—'} km
                      {item.inbound?.odometerIn ? ` • In: ${item.inbound.odometerIn.toLocaleString()} km` : ''}
                    </Text>
                  </View>

                  {item.inbound?.excessKm && item.inbound.excessKm > 0 ? (
                    <View style={styles.excessBadge}>
                      <Text style={styles.excessBadgeText}>
                        Excess Charged: ${item.inbound.excessKmChargeAmount?.toFixed(2)} ({item.inbound.excessKm} km @ $0.50/km)
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Bottom Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardPdfBtn}
                    onPress={() => setPdfTarget(item)}
                  >
                    <Icon name="file-text" size={16} color={colors.primary} />
                    <Text style={styles.cardPdfBtnText}>View PDF</Text>
                  </TouchableOpacity>

                  {isLoanActive && (
                    <TouchableOpacity
                      style={styles.cardReturnBtn}
                      onPress={() => setReturnTarget(item)}
                    >
                      <Icon name="check-circle" size={16} color="#FFF" />
                      <Text style={styles.cardReturnBtnText}>Check In / Return</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Return Inspection Modal */}
      <ReturnLoanerModal
        visible={returnTarget !== null}
        agreement={returnTarget}
        onClose={() => setReturnTarget(null)}
        onReturnCompleted={(_updated) => {
          setReturnTarget(null);
          setAgreements((prev) => prev.map((a) => (a.id === _updated.id ? _updated : a)));
          fetchLoanData();
        }}
      />

      {/* Official Legal PDF Viewer Modal */}
      <LoanAgreementPdfModal
        visible={pdfTarget !== null}
        agreement={pdfTarget}
        onClose={() => setPdfTarget(null)}
      />
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBackBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  issueTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  issueTopBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  techRooftopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  techRooftopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  techRooftopText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  techRooftopBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  techRoleBadge: {
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.25)',
  },
  techRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  rooftopScrollWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rooftopScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  rooftopPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  rooftopPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rooftopPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rooftopPillTextActive: {
    color: '#FFF',
  },
  kpiContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  kpiCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kpiIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  regoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardRego: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardModel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardAgreementNum: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textMuted,
    marginTop: 2,
  },
  cardRooftop: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  cardDetails: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginVertical: spacing.sm,
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  excessBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  excessBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: 4,
  },
  cardPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
  },
  cardPdfBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  cardReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.success,
    gap: 4,
  },
  cardReturnBtnText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.lg,
  },
});
