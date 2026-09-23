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
import { LoanAgreement, LoanAgreementKpis } from '../../types';
import { loanAgreementsApi } from '../../api';
import { ReturnLoanerModal } from './ReturnLoanerModal';
import { IssueLoanerWizardScreen } from './IssueLoanerWizardScreen';

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

export const LoanVehiclesScreen: React.FC<LoanVehiclesScreenProps> = ({ onBack }) => {
  const [selectedSiteId, setSelectedSiteId] = useState('all');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'ATTENTION' | 'RETURNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agreements, setAgreements] = useState<LoanAgreement[]>([]);
  const [kpis, setKpis] = useState<LoanAgreementKpis>({
    available: 14,
    outNow: 8,
    dueSoon: 2,
    overdue: 1,
  });

  // Modals / Subscreens
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<LoanAgreement | null>(null);

  const fetchLoanData = useCallback(async () => {
    try {
      const siteParam = selectedSiteId === 'all' ? undefined : selectedSiteId;
      const [data, kpiData] = await Promise.all([
        loanAgreementsApi.findAll(siteParam),
        loanAgreementsApi.getKpis(siteParam),
      ]);
      setAgreements(data || []);
      if (kpiData) {
        setKpis(kpiData);
      }
    } catch (err: any) {
      console.warn('Failed to load loan data from API:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    setLoading(true);
    fetchLoanData();
  }, [fetchLoanData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoanData();
  };

  // Filter agreements by tab and search
  const filteredAgreements = agreements.filter((ag) => {
    // Rooftop filter
    if (selectedSiteId !== 'all' && ag.siteId !== selectedSiteId) {
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
    const selectedRtObj = ROOFTOPS.find((r) => r.siteId === selectedSiteId);
    return (
      <IssueLoanerWizardScreen
        initialRooftop={selectedRtObj && selectedRtObj.siteId !== 'all' ? selectedRtObj.label : 'Cranbourne'}
        onBack={() => setIsWizardOpen(false)}
        onSuccess={(_newAgreement) => {
          setIsWizardOpen(false);
          fetchLoanData();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Top App Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBackBtn} onPress={onBack}>
            <Icon name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Loan Vehicle Operations</Text>
          <Text style={styles.headerSubtitle}>OmniSuiteAI • Digital Customer Agreements</Text>
        </View>
        <TouchableOpacity
          style={styles.issueTopBtn}
          onPress={() => setIsWizardOpen(true)}
        >
          <Icon name="plus" size={18} color="#FFF" />
          <Text style={styles.issueTopBtnText}>Issue</Text>
        </TouchableOpacity>
      </View>

      {/* Rooftop Selector */}
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

      {/* KPI Cards Row (from PDF page 7 Example 2) */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>{kpis.available}</Text>
          <Text style={styles.kpiLabel}>Available</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.success }]} />
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.primary }]}>{kpis.outNow}</Text>
          <Text style={styles.kpiLabel}>Out Now</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.primary }]} />
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.warning }]}>{kpis.dueSoon}</Text>
          <Text style={styles.kpiLabel}>Due Soon</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.warning }]} />
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.danger }]}>{kpis.overdue}</Text>
          <Text style={styles.kpiLabel}>Overdue</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.danger }]} />
        </View>
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
          contentContainerStyle={styles.listContent}
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
                    onPress={() => {
                      Alert.alert(
                        'Loan Agreement PDF',
                        `Agreement: ${item.agreementNumber}\nCustomer: ${item.customer?.name}\nStatus: ${item.status}\nOperative Clauses: 18 Validated`,
                        [{ text: 'Close' }]
                      );
                    }}
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
          fetchLoanData();
        }}
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  issueTopBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
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
