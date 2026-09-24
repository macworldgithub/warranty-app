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
import { LoanAgreement, LoanAgreementKpis, WarrantyCase } from '../../types';
import { loanAgreementsApi } from '../../api';
import { casesApi } from '../../api/cases.api';
import { offlineStorage } from '../../services/offlineStorage';
import { Clock, Car, FileText, Key } from 'lucide-react-native';
import { ReturnLoanerModal } from './ReturnLoanerModal';
import { IssueLoanerWizardScreen } from './IssueLoanerWizardScreen';
import { LoanAgreementPdfModal } from './LoanAgreementPdfModal';
import { EditLoanerModal } from './EditLoanerModal';
import { LoanVehicleDetailsModal } from './LoanVehicleDetailsModal';
import { useAuth } from '../../context/AuthContext';

interface LoanVehiclesScreenProps {
  onBack?: () => void;
  onOpenTickets?: (tab?: 'all' | 'awaiting') => void;
  onOpenVehicles?: () => void;
  onOpenProfile?: () => void;
  onStartNewCase?: () => void;
}

const ROOFTOPS = [
  { label: 'All Rooftops', siteId: 'all', fullName: 'All Rooftops & Dealerships' },
  { label: 'Cranbourne', siteId: 'site_cranbourne_byd', fullName: 'Booran BYD Cranbourne' },
  { label: 'Dandenong', siteId: 'site_dandenong_multi', fullName: 'Booran Dandenong Multi-Franchise' },
  { label: 'Berwick', siteId: 'site_berwick_nissan', fullName: 'Booran Nissan Berwick' },
  { label: 'Cheltenham', siteId: 'site_cheltenham_mg', fullName: 'Booran MG & Chery Cheltenham' },
];

export const getDynamicLoanCategory = (
  status?: string,
  dueBackDateTime?: string
): 'RETURNED' | 'OVERDUE' | 'DUE_SOON' | 'ACTIVE' => {
  if (status === 'RETURNED' || status === 'CANCELLED') {
    return 'RETURNED';
  }
  if (!dueBackDateTime) {
    return 'ACTIVE';
  }

  const now = Date.now();
  const dueTime = new Date(dueBackDateTime).getTime();
  const in60Min = now + 60 * 60 * 1000;

  if (dueTime < now) {
    return 'OVERDUE';
  }
  if (dueTime <= in60Min) {
    return 'DUE_SOON';
  }
  return 'ACTIVE';
};

const computeKpis = (agreementList: LoanAgreement[], siteId: string): LoanAgreementKpis => {
  const filtered = siteId === 'all'
    ? agreementList
    : agreementList.filter((a) => a.siteId === siteId);

  const totalCars = filtered.length;
  let available = 0;
  let outNow = 0;
  let dueSoon = 0;
  let overdue = 0;

  for (const a of filtered) {
    if (a.status === 'RETURNED') {
      available++;
      continue;
    }

    outNow++;
    const category = getDynamicLoanCategory(a.status, a.dueBackDateTime);
    if (category === 'OVERDUE') {
      overdue++;
    } else if (category === 'DUE_SOON') {
      dueSoon++;
    }
  }

  return {
    totalCars,
    available,
    outNow,
    dueSoon,
    overdue,
  };
};

export const LoanVehiclesScreen: React.FC<LoanVehiclesScreenProps> = ({
  onBack,
  onOpenTickets,
  onOpenVehicles,
  onOpenProfile,
  onStartNewCase,
}) => {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CLERK' || user?.role === 'SERVICE_MANAGER';
  // Role separation: Technician only views their assigned rooftop, Admin can view all
  const isTechnician = user?.role === 'TECHNICIAN';
  const technicianSiteId = user?.defaultSiteId || activeSiteId || 'site_cranbourne_byd';
  const technicianSiteObj = ROOFTOPS.find((r) => r.siteId === technicianSiteId) || ROOFTOPS[1];

  const [awaitingCount, setAwaitingCount] = useState(0);

  useEffect(() => {
    const fetchAwaitingCount = async () => {
      try {
        const data = await casesApi.getCases({ limit: 100 });
        const pending = offlineStorage.getPendingUploads();
        const serverList: WarrantyCase[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
        const serverIds = new Set(serverList.map((c: WarrantyCase) => c.id));
        const merged = [
          ...pending.filter((p) => !serverIds.has(p.id)),
          ...serverList,
        ];
        const count = merged.filter((c) => c.status === 'Awaiting Review').length;
        setAwaitingCount(count);
      } catch {
        const pending = offlineStorage.getPendingUploads();
        setAwaitingCount(pending.filter((c) => c.status === 'Awaiting Review').length);
      }
    };
    fetchAwaitingCount();
  }, []);

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const [selectedSiteId, setSelectedSiteId] = useState(isTechnician ? technicianSiteId : 'all');
  const [activeTab, setActiveTab] = useState<'ALL' | 'AVAILABLE' | 'ACTIVE' | 'DUE_SOON' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agreements, setAgreements] = useState<LoanAgreement[]>([]);
  const [kpis, setKpis] = useState<LoanAgreementKpis>({
    totalCars: 0,
    available: 0,
    outNow: 0,
    dueSoon: 0,
    overdue: 0,
  });

  // Modals / Subscreens
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<LoanAgreement | null>(null);
  const [pdfTarget, setPdfTarget] = useState<LoanAgreement | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<LoanAgreement | null>(null);
  const [editTarget, setEditTarget] = useState<LoanAgreement | null>(null);

  const handleDeleteAgreement = (agreement: LoanAgreement) => {
    Alert.alert(
      'Delete Loan Vehicle Record',
      `Are you sure you want to delete agreement ${agreement.agreementNumber} (${agreement.vehicle?.rego})? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await loanAgreementsApi.deleteAgreement(agreement.id);
              } catch (apiErr) {
                console.warn('Backend delete failed, removing locally:', apiErr);
              }
              setAgreements((prev) => prev.filter((a) => a.id !== agreement.id));
              setDetailsTarget(null);
              Alert.alert('Deleted', `Loan agreement ${agreement.agreementNumber} has been removed.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete loan agreement.');
            }
          },
        },
      ]
    );
  };

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
      const list = data || [];
      const scopedList = isTechnician ? list.filter((a) => a.siteId === technicianSiteId) : list;
      setAgreements(scopedList);
      if (kpiData && typeof kpiData.totalCars === 'number') {
        setKpis(kpiData);
      } else {
        setKpis(computeKpis(scopedList, targetSiteId));
      }
    } catch (err: any) {
      console.warn('Failed to load loan data from API:', err?.message);
      // Fallback: gracefully retain current state without mock data
      setAgreements((prev) => prev || []);
      setKpis((prev) => prev || { totalCars: 0, available: 0, outNow: 0, dueSoon: 0, overdue: 0 });
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

    const category = getDynamicLoanCategory(ag.status, ag.dueBackDateTime);

    // Tab filter
    if (activeTab === 'AVAILABLE' && category !== 'RETURNED') {
      return false;
    }
    if (activeTab === 'ACTIVE' && category !== 'ACTIVE' && category !== 'DUE_SOON') {
      return false;
    }
    if (activeTab === 'DUE_SOON' && category !== 'DUE_SOON') {
      return false;
    }
    if (activeTab === 'OVERDUE' && category !== 'OVERDUE') {
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

  const getStatusBadge = (status?: string, dueBackDateTime?: string) => {
    const category = getDynamicLoanCategory(status, dueBackDateTime);
    switch (category) {
      case 'OVERDUE': {
        const diffMinutes = dueBackDateTime ? Math.round((Date.now() - new Date(dueBackDateTime).getTime()) / 60000) : 0;
        const label = diffMinutes >= 60
          ? `Overdue (${Math.floor(diffMinutes / 60)}h)`
          : `Overdue (${Math.max(1, diffMinutes)}m)`;
        return { label, bg: colors.dangerLight, text: colors.danger };
      }
      case 'DUE_SOON': {
        const diffMinutes = dueBackDateTime ? Math.max(1, Math.round((new Date(dueBackDateTime).getTime() - Date.now()) / 60000)) : 60;
        return { label: `Due in ${diffMinutes}m`, bg: colors.warningLight, text: colors.warning };
      }
      case 'ACTIVE':
        return { label: 'On Loan', bg: colors.primaryGlow, text: colors.primary };
      case 'RETURNED':
        return { label: 'Returned', bg: colors.successLight, text: colors.success };
      default:
        return { label: status || 'Unknown', bg: colors.border, text: colors.textSecondary };
    }
  };

  const formatDueTime = (isoString?: string) => {
    if (!isoString) return 'Not set';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = now.toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      const dateStr = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
      return `${dateStr}, ${timeStr}`;
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
                  onLongPress={() => {
                    Alert.alert(
                      'Dealership Rooftop',
                      item.fullName || item.label,
                      [{ text: 'OK', style: 'default' }]
                    );
                  }}
                  activeOpacity={0.7}
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

      {/* KPI Cards Row */}
      <View style={styles.kpiContainer}>
        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'ALL' && styles.kpiCardActive]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>{kpis.totalCars ?? agreements.length}</Text>
          <Text style={styles.kpiLabel}>Total Cars</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.textMuted }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'AVAILABLE' && styles.kpiCardActive]}
          onPress={() => setActiveTab('AVAILABLE')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kpiVal, { color: colors.success }]}>{kpis.available}</Text>
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
          style={[styles.kpiCard, activeTab === 'DUE_SOON' && styles.kpiCardActive]}
          onPress={() => setActiveTab('DUE_SOON')}
          activeOpacity={0.7}
        >
          <Text style={[styles.kpiVal, { color: colors.warning }]}>{kpis.dueSoon}</Text>
          <Text style={styles.kpiLabel}>Due Soon</Text>
          <View style={[styles.kpiIndicator, { backgroundColor: colors.warning }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCard, activeTab === 'OVERDUE' && styles.kpiCardActive]}
          onPress={() => setActiveTab('OVERDUE')}
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
            { paddingBottom: Math.max(insets.bottom + 90, 110) },
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
            const badge = getStatusBadge(item.status, item.dueBackDateTime);
            const category = getDynamicLoanCategory(item.status, item.dueBackDateTime);
            const isLoanActive = category !== 'RETURNED';
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
                  <TouchableOpacity
                    style={styles.cardRooftopBadge}
                    activeOpacity={0.7}
                    onPress={() => {
                      const isMulti = item.siteId === 'site_dandenong_multi' || (item.siteName && item.siteName.toLowerCase().includes('multi'));
                      Alert.alert(
                        'Rooftop Location',
                        `${item.siteName || 'Booran Dealership'}${isMulti ? '\n\nMulti-Franchise Dealership Network' : ''}`,
                        [{ text: 'Close', style: 'cancel' }]
                      );
                    }}
                  >
                    <Text style={styles.cardRooftop} numberOfLines={1} ellipsizeMode="tail">
                      {item.siteName}
                    </Text>
                    <Icon name="info" size={11} color={colors.primary} />
                  </TouchableOpacity>
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
                      {category === 'RETURNED'
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

                {/* Bottom Actions: Details, Edit, PDF, Check In, Delete */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() => setDetailsTarget(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="info" size={14} color={colors.textSecondary} />
                    <Text style={styles.cardActionIconBtnText}>Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() => setEditTarget(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="edit" size={14} color={colors.primary} />
                    <Text style={[styles.cardActionIconBtnText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionIconBtn}
                    onPress={() => setPdfTarget(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="file-text" size={14} color={colors.textSecondary} />
                    <Text style={styles.cardActionIconBtnText}>PDF</Text>
                  </TouchableOpacity>

                  {isLoanActive && (
                    <TouchableOpacity
                      style={styles.cardReturnBtn}
                      onPress={() => setReturnTarget(item)}
                      activeOpacity={0.7}
                    >
                      <Icon name="check-circle" size={14} color="#FFF" />
                      <Text style={styles.cardReturnBtnText}>Check In</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.cardDeleteBtn}
                    onPress={() => handleDeleteAgreement(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash" size={15} color={colors.danger} />
                  </TouchableOpacity>
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

      {/* View Details Modal (Read) */}
      <LoanVehicleDetailsModal
        visible={detailsTarget !== null}
        agreement={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        onEdit={(ag) => {
          setDetailsTarget(null);
          setEditTarget(ag);
        }}
        onViewPdf={(ag) => {
          setDetailsTarget(null);
          setPdfTarget(ag);
        }}
        onReturn={(ag) => {
          setDetailsTarget(null);
          setReturnTarget(ag);
        }}
        onDelete={(ag) => {
          handleDeleteAgreement(ag);
        }}
      />

      {/* Edit Loan Details Modal (Update) */}
      <EditLoanerModal
        visible={editTarget !== null}
        agreement={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdateCompleted={(_updated) => {
          setEditTarget(null);
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

      {/* Website-Style 5-Item Symmetrical Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        {isAdmin ? (
          <>
            {/* 1. Awaiting Cases (Extreme Left) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets?.('awaiting')}
              style={styles.bottomBarTab}
            >
              <View style={styles.tabIconWrapper}>
                <Clock size={20} color={colors.textSecondary} />
                {awaitingCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{awaitingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.bottomBarLabel}>Awaiting</Text>
            </TouchableOpacity>

            {/* 2. Vehicles */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenVehicles}
              style={styles.bottomBarTab}
            >
              <Car size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Vehicles</Text>
            </TouchableOpacity>

            {/* 3. Tickets (Center) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets?.('all')}
              style={styles.bottomBarTab}
            >
              <FileText size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Tickets</Text>
            </TouchableOpacity>

            {/* 4. Loaners (ACTIVE) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomBarTab}
            >
              <Key size={20} color={colors.primary} />
              <Text style={[styles.bottomBarLabel, { color: colors.primary }]}>Loaners</Text>
            </TouchableOpacity>

            {/* 5. Logged-in User Profile (Extreme Right) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenProfile}
              style={styles.bottomBarUserTab}
              accessibilityLabel="Account Profile"
            >
              <View style={[styles.bottomBarAvatar, styles.bottomBarAvatarAdmin]}>
                <Text style={[styles.bottomBarAvatarText, styles.bottomBarAvatarTextAdmin]}>
                  {getUserInitials(user?.name)}
                </Text>
              </View>
              <Text style={styles.bottomBarLabel} numberOfLines={1}>
                {user?.name ? user.name.trim().split(/\s+/)[0] : 'Profile'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Technician Layout */}
            {/* 1. Tickets */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets?.('all')}
              style={styles.bottomBarTab}
            >
              <FileText size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Tickets</Text>
            </TouchableOpacity>

            {/* 2. Vehicles */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenVehicles}
              style={styles.bottomBarTab}
            >
              <Car size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Vehicles</Text>
            </TouchableOpacity>

            {/* 3. Loaners (ACTIVE) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomBarTab}
            >
              <Key size={20} color={colors.primary} />
              <Text style={[styles.bottomBarLabel, { color: colors.primary }]}>Loaners</Text>
            </TouchableOpacity>

            {/* 4. Awaiting */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets?.('awaiting')}
              style={styles.bottomBarTab}
            >
              <View style={styles.tabIconWrapper}>
                <Clock size={20} color={colors.textSecondary} />
                {awaitingCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{awaitingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.bottomBarLabel}>Awaiting</Text>
            </TouchableOpacity>

            {/* 5. Profile */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenProfile}
              style={styles.bottomBarUserTab}
              accessibilityLabel="Account Profile"
            >
              <View style={styles.bottomBarAvatar}>
                <Text style={styles.bottomBarAvatarText}>
                  {getUserInitials(user?.name)}
                </Text>
              </View>
              <Text style={styles.bottomBarLabel} numberOfLines={1}>
                {user?.name ? user.name.trim().split(/\s+/)[0] : 'Profile'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
  cardRooftopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 135,
    alignSelf: 'flex-start',
  },
  cardRooftop: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  cardActionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated || '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cardActionIconBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.success,
    gap: 4,
  },
  cardReturnBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  cardDeleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 84,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12,
  },
  bottomBarTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
    paddingHorizontal: 2,
    gap: 3,
  },
  bottomBarUserTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
    paddingHorizontal: 2,
    gap: 3,
  },
  bottomBarAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(215, 25, 32, 0.08)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarAvatarAdmin: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  bottomBarAvatarText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    includeFontPadding: false,
  },
  bottomBarAvatarTextAdmin: {
    color: '#D97706',
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    includeFontPadding: false,
  },
  bottomBarLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
});
