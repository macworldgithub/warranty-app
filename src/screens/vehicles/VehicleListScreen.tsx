import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Car,
  FileText,
  CheckCircle2,
  Clock,
  Zap,
  Search,
  Plus,
  ChevronDown,
  Building2,
  Gauge,
  ShieldCheck,
  ArrowRight,
  User,
  X,
  Sparkles,
  AlertCircle,
  Lock,
  Key,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { casesApi } from '../../api/cases.api';
import { sitesApi } from '../../api/sites.api';
import { offlineStorage } from '../../services/offlineStorage';
import {
  rooftopVehiclesService,
  RooftopVehicle,
} from '../../services/rooftopVehicles.service';
import { Site, WarrantyCase, PowertrainType } from '../../types';

interface VehicleListScreenProps {
  onOpenTickets: (tab?: string) => void;
  onStartNewCase: (initialData?: any) => void;
  onOpenCase: (caseItem: WarrantyCase) => void;
  onOpenProfile: () => void;
  onOpenLoaners?: () => void;
}

const FALLBACK_SITES: Site[] = [
  { id: 'site_cranbourne_byd', name: 'Booran BYD Cranbourne', code: 'CRANBOURNE_BYD' },
  { id: 'site_dandenong_multi', name: 'Booran Dandenong Multi', code: 'DANDENONG_MULTI' },
  { id: 'site_cheltenham_mg', name: 'Booran MG & Chery Cheltenham', code: 'CHELTENHAM_MG' },
  { id: 'site_berwick_toyota_ford', name: 'Booran Berwick Commercials', code: 'BERWICK_COMMERCIALS' },
];

const ALL_ROOFTOPS_SITE: Site = {
  id: 'ALL',
  name: 'All Dealerships & Rooftops',
  code: 'ALL_FLEET',
};

export const VehicleListScreen: React.FC<VehicleListScreenProps> = ({
  onOpenTickets,
  onStartNewCase,
  onOpenCase,
  onOpenProfile,
  onOpenLoaners,
}) => {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId, setActiveSiteId } = useAuth();
  const { startNewCase } = useCaseWizard();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CLERK' || user?.role === 'SERVICE_MANAGER';
  const technicianSiteId = user?.defaultSiteId || activeSiteId || 'site_cranbourne_byd';

  const [sites, setSites] = useState<Site[]>(FALLBACK_SITES);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    isAdmin ? (activeSiteId || user?.defaultSiteId || 'site_cranbourne_byd') : technicianSiteId
  );
  const effectiveSiteId = isAdmin ? selectedSiteId : technicianSiteId;
  const [showSitePicker, setShowSitePicker] = useState<boolean>(false);

  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'claims' | 'warranty' | 'clean'>('all');

  // Admin View Cases Modals
  const [selectedVehicleForCases, setSelectedVehicleForCases] = useState<RooftopVehicle | null>(null);
  const [vehicleCasesList, setVehicleCasesList] = useState<WarrantyCase[]>([]);
  const [showNoCasesNotice, setShowNoCasesNotice] = useState<boolean>(false);
  const [selectedVehicleForNotice, setSelectedVehicleForNotice] = useState<RooftopVehicle | null>(null);
  const [noticeVehicleName, setNoticeVehicleName] = useState<string>('');

  // Load sites from API
  useEffect(() => {
    const loadSites = async () => {
      try {
        const s = await sitesApi.getSites();
        if (s && s.length > 0) {
          setSites(s);
        }
      } catch {
        // Fallback to FALLBACK_SITES
      }
    };
    loadSites();
  }, []);

  // Fetch cases to sync rooftop fleet
  const fetchCases = useCallback(async () => {
    try {
      const data = await casesApi.getCases({ limit: 100 });
      const pending = offlineStorage.getPendingUploads();
      const serverList: WarrantyCase[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      const serverIds = new Set(serverList.map((c: WarrantyCase) => c.id));
      const merged = [
        ...pending.filter(p => !serverIds.has(p.id)),
        ...serverList,
      ];
      setCases(merged);
    } catch {
      const pending = offlineStorage.getPendingUploads();
      setCases(pending);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  // Keep technician strictly locked to their assigned rooftop even if user context updates
  useEffect(() => {
    if (!isAdmin && technicianSiteId && selectedSiteId !== technicianSiteId) {
      setSelectedSiteId(technicianSiteId);
    }
  }, [isAdmin, technicianSiteId, selectedSiteId]);

  const currentSite = useMemo(() => {
    if (effectiveSiteId === 'ALL') {
      return ALL_ROOFTOPS_SITE;
    }
    return sites.find(s => s.id === effectiveSiteId) || sites[0] || {
      id: effectiveSiteId,
      name: 'Booran BYD Cranbourne',
      code: 'CRANBOURNE_BYD',
    };
  }, [sites, effectiveSiteId]);

  const handleSelectSite = (site: Site) => {
    if (!isAdmin) return; // Strictly forbid technician from changing rooftop
    setSelectedSiteId(site.id);
    if (site.id !== 'ALL') {
      setActiveSiteId(site.id);
    }
    setShowSitePicker(false);
  };

  // Vehicles for selected rooftop (technicians strictly restricted to their assigned rooftop)
  const vehiclesForRooftop = useMemo(() => {
    return rooftopVehiclesService.getVehiclesForRooftop(effectiveSiteId, cases);
  }, [effectiveSiteId, cases]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehiclesForRooftop.filter(veh => {
      // Tab filter
      if (activeTab === 'claims' && veh.warrantyStatus !== 'Active Claim') return false;
      if (activeTab === 'warranty' && veh.warrantyStatus !== 'Under Warranty') return false;
      if (activeTab === 'clean' && veh.powertrain !== 'EV' && veh.powertrain !== 'Hybrid') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVin = veh.vin.toLowerCase().includes(q);
        const matchModel = `${veh.make} ${veh.model}`.toLowerCase().includes(q);
        const matchRego = veh.rego.toLowerCase().includes(q);
        const matchRo = veh.roNumber?.toLowerCase().includes(q);
        if (!matchVin && !matchModel && !matchRego && !matchRo) return false;
      }

      return true;
    });
  }, [vehiclesForRooftop, activeTab, searchQuery]);

  // KPI counts
  const totalVehiclesCount = vehiclesForRooftop.length;
  const activeClaimsCount = vehiclesForRooftop.filter(v => v.warrantyStatus === 'Active Claim').length;
  const cleanEnergyCount = vehiclesForRooftop.filter(v => v.powertrain === 'EV' || v.powertrain === 'Hybrid').length;
  const underWarrantyCount = vehiclesForRooftop.filter(v => v.warrantyStatus === 'Under Warranty').length;

  const handleStartCaseForVehicle = (veh: RooftopVehicle) => {
    const initialData = {
      siteId: currentSite.id,
      siteName: currentSite.name,
      vin: veh.vin,
      make: veh.make,
      model: veh.model,
      year: veh.year,
      powertrain: veh.powertrain,
      odometer: veh.odometer,
      roNumber: veh.roNumber || '',
    };
    startNewCase(initialData as any);
    onStartNewCase(initialData);
  };

  const handleCreateNewBlank = () => {
    startNewCase({
      siteId: currentSite.id,
      siteName: currentSite.name,
    } as any);
    onStartNewCase();
  };

  const handleViewCasesForVehicle = (veh: RooftopVehicle) => {
    const cleanVehVin = (veh.vin || '').trim().toUpperCase();
    const cleanVehRo = (veh.roNumber || '').trim().toUpperCase();

    // Find all cases matching this vehicle by VIN or RO
    const matchingCases = cases.filter(c => {
      const cVin = (c.vin || '').trim().toUpperCase();
      const cRo = (c.roNumber || '').trim().toUpperCase();
      const vinMatch = cleanVehVin && cVin && (cVin === cleanVehVin || cVin.endsWith(cleanVehVin) || cleanVehVin.endsWith(cVin));
      const roMatch = cleanVehRo && cRo && cRo === cleanVehRo;
      return vinMatch || roMatch;
    });

    if (matchingCases.length === 1) {
      onOpenCase(matchingCases[0]);
      return;
    }

    if (matchingCases.length > 1) {
      setSelectedVehicleForCases(veh);
      setVehicleCasesList(matchingCases);
      return;
    }

    if (veh.latestCase) {
      onOpenCase(veh.latestCase);
      return;
    }

    // No cases found on record
    setSelectedVehicleForNotice(veh);
    setNoticeVehicleName(`${veh.year} ${veh.make} ${veh.model} (${veh.rego})`);
    setShowNoCasesNotice(true);
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const awaitingCount = cases.filter(c => c.status === 'Awaiting Review').length;

  return (
    <View style={styles.container}>
      <Header title="Booran Vehicles" />

      <FlatList
        data={filteredVehicles}
        keyExtractor={item => item.id || item.vin}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeaderArea}>
            {/* Rooftop Selector Strip (Switchable for Admin, Locked for Technician) */}
            <TouchableOpacity
              activeOpacity={isAdmin ? 0.85 : 1}
              onPress={() => {
                if (isAdmin) {
                  setShowSitePicker(true);
                }
              }}
              style={styles.rooftopCard}
            >
              <View style={styles.rooftopLeft}>
                <View style={styles.rooftopIconCircle}>
                  <Building2 size={18} color={colors.primary} />
                </View>
                <View style={styles.rooftopDetails}>
                  <View style={styles.rooftopTagRow}>
                    <Text style={styles.rooftopEyebrow}>
                      {isAdmin
                        ? effectiveSiteId === 'ALL'
                          ? 'NETWORK FLEET'
                          : 'CURRENT ROOFTOP'
                        : 'YOUR ASSIGNED ROOFTOP'}
                    </Text>
                  </View>
                  <Text style={styles.rooftopTitle} numberOfLines={1}>
                    {currentSite.name}
                  </Text>
                </View>
              </View>
              {isAdmin ? (
                <View style={styles.rooftopSwitchBtn}>
                  <Text style={styles.rooftopSwitchText}>Switch</Text>
                  <ChevronDown size={14} color={colors.primary} />
                </View>
              ) : (
                <View style={styles.rooftopLockedBadge}>
                  <Lock size={12} color={colors.textSecondary} />
                  <Text style={styles.rooftopLockedText}>Assigned</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Hero Subhead */}
            <View style={styles.heroSection}>
              <View style={styles.heroEyebrowRow}>
                <Text style={styles.heroEyebrow}>
                  {effectiveSiteId === 'ALL' ? 'NETWORK FLEET OVERVIEW' : 'BOORAN ROOFTOP FLEET'}
                </Text>
              </View>
              <Text style={styles.heroHeadline}>
                {effectiveSiteId === 'ALL' ? 'All Dealership Vehicles' : 'Workshop Vehicle Registry'}
              </Text>
              <Text style={styles.heroSubhead}>
                {isAdmin
                  ? effectiveSiteId === 'ALL'
                    ? 'Showing all vehicles across all Booran dealership rooftops. Tap any vehicle to view active and historic warranty claims.'
                    : `Vehicles assigned to ${currentSite.name}. Tap any vehicle to view active and historic warranty claims.`
                  : `Vehicles assigned to ${currentSite.name}. Tap any vehicle to raise an instant warranty evidence ticket.`}
              </Text>
            </View>

            {/* 2 Boxes per Line Grid (Consistent 2x2 layout) */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                {/* 1. Total Vehicles */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('all')}
                  style={[styles.kpiCard, activeTab === 'all' && styles.kpiCardActive]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <Car size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={styles.kpiValue}>{totalVehiclesCount}</Text>
                    <Text style={styles.kpiLabel}>Total Vehicles</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Active Claims */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('claims')}
                  style={[styles.kpiCard, activeTab === 'claims' && styles.kpiCardActive]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Clock size={18} color={colors.flagged} />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: colors.flagged }]}>
                      {activeClaimsCount}
                    </Text>
                    <Text style={styles.kpiLabel}>Active Claims</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.kpiRow}>
                {/* 3. EV & Hybrid */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('clean')}
                  style={[styles.kpiCard, activeTab === 'clean' && styles.kpiCardActive]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Zap size={18} color={colors.success} />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: colors.success }]}>
                      {cleanEnergyCount}
                    </Text>
                    <Text style={styles.kpiLabel}>EV & Hybrids</Text>
                  </View>
                </TouchableOpacity>

                {/* 4. Under Warranty */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('warranty')}
                  style={[styles.kpiCard, activeTab === 'warranty' && styles.kpiCardActive]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <ShieldCheck size={18} color={colors.warning} />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: colors.warning }]}>
                      {underWarrantyCount}
                    </Text>
                    <Text style={styles.kpiLabel}>Under Warranty</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by VIN, Model, Rego, or RO #..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Tabs Strip */}
            <View style={styles.filterStrip}>
              <TouchableOpacity
                onPress={() => setActiveTab('all')}
                style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
                  All ({vehiclesForRooftop.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('claims')}
                style={[styles.filterChip, activeTab === 'claims' && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeTab === 'claims' && styles.filterChipTextActive]}>
                  Active Claims ({activeClaimsCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('warranty')}
                style={[styles.filterChip, activeTab === 'warranty' && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeTab === 'warranty' && styles.filterChipTextActive]}>
                  Warranty Ready ({underWarrantyCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('clean')}
                style={[styles.filterChip, activeTab === 'clean' && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeTab === 'clean' && styles.filterChipTextActive]}>
                  EV / Hybrid ({cleanEnergyCount})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                {effectiveSiteId === 'ALL' ? 'All Rooftops Fleet' : 'Rooftop Inventory'}
              </Text>
              <Text style={styles.sectionHeaderCount}>{filteredVehicles.length} vehicles</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Car size={48} color={colors.surfaceElevated} />
            <Text style={styles.emptyTitle}>No Vehicles Found</Text>
            <Text style={styles.emptySubtitle}>
              No vehicles matched your search criteria for {currentSite.name}.
            </Text>
            {!isAdmin && (
              <Button
                title="Add New Vehicle Case"
                variant="primary"
                onPress={handleCreateNewBlank}
                leftIcon={<Plus size={16} color="#FFFFFF" />}
                style={{ marginTop: spacing.md }}
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isClaimActive = item.warrantyStatus === 'Active Claim';
          return (
            <View style={styles.vehicleCard}>
              {/* Card Header: Year + Make + Model */}
              <View style={styles.vehicleCardHeader}>
                <View style={styles.vehicleTitleGroup}>
                  <Text style={styles.vehicleTitle}>
                    {item.year} {item.make} {item.model}
                  </Text>
                  <View style={styles.vehicleBadgeRow}>
                    <View style={styles.regoBadge}>
                      <Text style={styles.regoText}>{item.rego}</Text>
                    </View>
                    <Badge
                      label={item.powertrain}
                      variant={item.powertrain === 'EV' ? 'success' : item.powertrain === 'Hybrid' ? 'warning' : 'outline'}
                      size="sm"
                    />
                    <Badge
                      label={item.warrantyStatus}
                      variant={isClaimActive ? 'flagged' : item.warrantyStatus === 'Complete' ? 'success' : 'primary'}
                      size="sm"
                    />
                  </View>
                </View>
              </View>

              {/* Specs Strip */}
              <View style={styles.specsStrip}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>VIN</Text>
                  <Text style={styles.specVinText} numberOfLines={1}>
                    {item.vin}
                  </Text>
                </View>
                <View style={styles.specDivider} />
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>ODOMETER</Text>
                  <View style={styles.specRow}>
                    <Gauge size={12} color={colors.textSecondary} />
                    <Text style={styles.specValueText}>
                      {item.odometer ? `${item.odometer.toLocaleString()} km` : '—'}
                    </Text>
                  </View>
                </View>
                {item.roNumber ? (
                  <>
                    <View style={styles.specDivider} />
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>REPAIR ORDER</Text>
                      <Text style={styles.specRoText}>{item.roNumber}</Text>
                    </View>
                  </>
                ) : null}
              </View>

              {/* Concern description if present */}
              {item.concernTitle ? (
                <View style={styles.concernBox}>
                  <Text style={styles.concernLabel}>Recent Note / Concern:</Text>
                  <Text style={styles.concernText} numberOfLines={2}>
                    {item.concernTitle}
                  </Text>
                </View>
              ) : null}

              {/* Card Footer Actions */}
              <View style={styles.cardActionsRow}>
                {isAdmin ? (
                  // Admins: only view cases, no creation
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleViewCasesForVehicle(item)}
                    style={styles.actionBtnAdminViewCases}
                  >
                    <FileText size={15} color={colors.primary} />
                    <Text style={styles.actionBtnAdminViewCasesText}>
                      {item.caseCount > 1
                        ? `View Cases (${item.caseCount})`
                        : item.caseCount === 1
                        ? 'View Case'
                        : 'Case History'}
                    </Text>
                    <ArrowRight size={14} color={colors.primary} />
                  </TouchableOpacity>
                ) : item.caseCount > 0 || item.latestCase ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleViewCasesForVehicle(item)}
                      style={styles.actionBtnAdminViewCases}
                    >
                      <FileText size={15} color={colors.primary} />
                      <Text style={styles.actionBtnAdminViewCasesText}>
                        {item.caseCount > 1 ? `View Cases (${item.caseCount})` : 'View Case'}
                      </Text>
                      <ArrowRight size={14} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleStartCaseForVehicle(item)}
                      style={styles.actionBtnSmallNewCase}
                    >
                      <Plus size={14} color={colors.primary} />
                      <Text style={styles.actionBtnSmallNewCaseText}>New Case</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleStartCaseForVehicle(item)}
                      style={styles.actionBtnPrimary}
                    >
                      <Plus size={15} color="#FFFFFF" />
                      <Text style={styles.actionBtnPrimaryText}>New Warranty Case</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleViewCasesForVehicle(item)}
                      style={styles.actionBtnOutline}
                    >
                      <FileText size={14} color={colors.textSecondary} />
                      <Text style={[styles.actionBtnOutlineText, { color: colors.textSecondary }]}>
                        Case Info
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Rooftop Switcher Modal - Admin Only */}
      {isAdmin && (
        <Modal
          visible={showSitePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSitePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSitePicker(false)}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Building2 size={20} color={colors.primary} />
                  <Text style={styles.modalTitle}>Select Rooftop Dealership</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSitePicker(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Select your active workshop rooftop to view vehicles and warranty tickets.
              </Text>

              <View style={styles.siteList}>
                {/* "All Dealerships & Rooftops" option */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectSite(ALL_ROOFTOPS_SITE)}
                  style={[styles.siteOption, selectedSiteId === 'ALL' && styles.siteOptionActive]}
                >
                  <View style={styles.siteOptionLeft}>
                    <View style={[styles.siteOptionRadio, selectedSiteId === 'ALL' && styles.siteOptionRadioActive]}>
                      {selectedSiteId === 'ALL' && <View style={styles.siteOptionRadioInner} />}
                    </View>
                    <View>
                      <Text style={[styles.siteOptionName, selectedSiteId === 'ALL' && styles.siteOptionNameActive]}>
                        All Rooftops & Dealerships
                      </Text>
                      <Text style={styles.siteOptionCode}>View all vehicles across all workshops</Text>
                    </View>
                  </View>
                  {selectedSiteId === 'ALL' && (
                    <Badge label="All Fleet" variant="success" size="sm" />
                  )}
                </TouchableOpacity>

                {/* Individual Rooftops */}
                {sites.map(s => {
                  const isCurrent = s.id === selectedSiteId;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.8}
                      onPress={() => handleSelectSite(s)}
                      style={[styles.siteOption, isCurrent && styles.siteOptionActive]}
                    >
                      <View style={styles.siteOptionLeft}>
                        <View style={[styles.siteOptionRadio, isCurrent && styles.siteOptionRadioActive]}>
                          {isCurrent && <View style={styles.siteOptionRadioInner} />}
                        </View>
                        <View>
                          <Text style={[styles.siteOptionName, isCurrent && styles.siteOptionNameActive]}>
                            {s.name}
                          </Text>
                          <Text style={styles.siteOptionCode}>{s.code || s.id}</Text>
                        </View>
                      </View>
                      {isCurrent && (
                        <Badge label="Active" variant="primary" size="sm" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Vehicle Cases List Modal for Admin */}
      <Modal
        visible={!!selectedVehicleForCases}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedVehicleForCases(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedVehicleForCases(null)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <FileText size={20} color={colors.primary} />
                <View>
                  <Text style={styles.modalTitle}>Warranty Cases</Text>
                  <Text style={styles.modalSubtitleVin}>
                    {selectedVehicleForCases?.year} {selectedVehicleForCases?.make} {selectedVehicleForCases?.model} • {selectedVehicleForCases?.rego}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedVehicleForCases(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a warranty ticket below to review case details:
            </Text>

            <FlatList
              data={vehicleCasesList}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              renderItem={({ item: c }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedVehicleForCases(null);
                    onOpenCase(c);
                  }}
                  style={styles.vehicleCaseItem}
                >
                  <View style={styles.vehicleCaseItemTop}>
                    <Text style={styles.vehicleCaseRoText}>RO: {c.roNumber || 'N/A'}</Text>
                    <Badge
                      label={c.status}
                      variant={
                        c.status === 'Flagged'
                          ? 'flagged'
                          : c.status === 'Awaiting Review'
                            ? 'primary'
                            : c.status === 'Submitted'
                              ? 'success'
                              : 'outline'
                      }
                      size="sm"
                    />
                  </View>
                  {c.concernTitle ? (
                    <Text style={styles.vehicleCaseConcernText} numberOfLines={2}>
                      {c.concernTitle}
                    </Text>
                  ) : null}
                  <View style={styles.vehicleCaseItemBottom}>
                    <Text style={styles.vehicleCaseDateText}>
                      {new Date(c.createdAt || Date.now()).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <View style={styles.vehicleCaseActionLink}>
                      <Text style={styles.vehicleCaseActionLinkText}>View Details</Text>
                      <ArrowRight size={12} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* No Cases Found Notice Modal */}
      <Modal
        visible={showNoCasesNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoCasesNotice(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNoCasesNotice(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <AlertCircle size={20} color={colors.warning} />
                <Text style={styles.modalTitle}>No Cases Logged</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNoCasesNotice(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              There are currently no warranty tickets or claims filed for {noticeVehicleName}.
            </Text>

            <View style={{ gap: 10, marginTop: spacing.sm }}>
              {/* Only Technicians can start a new case from here */}
              {!isAdmin && selectedVehicleForNotice && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    const v = selectedVehicleForNotice;
                    setShowNoCasesNotice(false);
                    handleStartCaseForVehicle(v);
                  }}
                  style={styles.modalActionPrimaryBtn}
                >
                  <Plus size={16} color="#FFF" />
                  <Text style={styles.modalActionPrimaryBtnText}>Start New Warranty Case</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowNoCasesNotice(false);
                  onOpenTickets('all');
                }}
                style={styles.modalActionOutlineBtn}
              >
                <FileText size={16} color={colors.primary} />
                <Text style={styles.modalActionOutlineBtnText}>View All Dealership Tickets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowNoCasesNotice(false)}
                style={{ paddingVertical: 8, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Website-Style 5-Item Symmetrical Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        {isAdmin ? (
          <>
            {/* 1. Awaiting Cases (Extreme Left) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets('awaiting')}
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

            {/* 2. Vehicles (ACTIVE) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomBarTab}
            >
              <Car size={20} color={colors.primary} />
              <Text style={[styles.bottomBarLabel, { color: colors.primary }]}>Vehicles</Text>
            </TouchableOpacity>

            {/* 3. Tickets (Center) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets('all')}
              style={styles.bottomBarTab}
            >
              <FileText size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Tickets</Text>
            </TouchableOpacity>

            {/* 4. Loaners (Left side of Profile) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenLoaners}
              style={styles.bottomBarTab}
            >
              <Key size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Loaners</Text>
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
              onPress={() => onOpenTickets('all')}
              style={styles.bottomBarTab}
            >
              <FileText size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Tickets</Text>
            </TouchableOpacity>

            {/* 2. Vehicles (ACTIVE) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomBarTab}
            >
              <Car size={20} color={colors.primary} />
              <Text style={[styles.bottomBarLabel, { color: colors.primary }]}>Vehicles</Text>
            </TouchableOpacity>

            {/* 3. Red Primary Action Button (Center) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCreateNewBlank}
              style={styles.bottomBarActionBtn}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.bottomBarActionText} numberOfLines={1}>
                New Warranty Case
              </Text>
            </TouchableOpacity>

            {/* 4. Awaiting */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenTickets('awaiting')}
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
              <View style={[styles.bottomBarAvatar, isAdmin && styles.bottomBarAvatarAdmin]}>
                <Text style={[styles.bottomBarAvatarText, isAdmin && styles.bottomBarAvatarTextAdmin]}>
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 155,
  },
  listHeaderArea: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  rooftopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.2)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rooftopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rooftopIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(215, 25, 32, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rooftopDetails: {
    flex: 1,
  },
  rooftopTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rooftopEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rooftopTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rooftopSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(215, 25, 32, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.15)',
  },
  rooftopSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  heroSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  heroEyebrowRow: {
    marginBottom: 6,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  heroSubhead: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  kpiGrid: {
    marginBottom: spacing.md,
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBFB',
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTextBox: {
    justifyContent: 'center',
    flex: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
    includeFontPadding: false,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    paddingVertical: 0,
  },
  filterStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm + 2,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(215, 25, 32, 0.08)',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionHeaderCount: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  vehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vehicleTitleGroup: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  vehicleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  regoBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  regoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  specsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  specItem: {
    flex: 1,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  specLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  specVinText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  specRoText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  concernBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  concernLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 1,
  },
  concernText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  siteList: {
    gap: 8,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  siteOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBFB',
  },
  siteOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  siteOptionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteOptionRadioActive: {
    borderColor: colors.primary,
  },
  siteOptionRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  siteOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  siteOptionNameActive: {
    color: colors.primary,
  },
  siteOptionCode: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
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
  bottomBarActionBtn: {
    flex: 1,
    maxWidth: 138,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    borderRadius: 23,
    gap: 5,
    marginHorizontal: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomBarActionText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  actionBtnAdminViewCases: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },
  actionBtnAdminViewCasesText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  actionBtnSmallNewCase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  actionBtnSmallNewCaseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  modalActionPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalActionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  modalActionOutlineBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubtitleVin: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  vehicleCaseItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  vehicleCaseItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vehicleCaseRoText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleCaseConcernText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  vehicleCaseItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  vehicleCaseDateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  vehicleCaseActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleCaseActionLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  rooftopLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rooftopLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
