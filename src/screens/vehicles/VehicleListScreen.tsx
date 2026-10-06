import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2,
  Lock,
  ClipboardList,
  Clock,
  CheckCircle2,
  Sparkles,
  Search,
  X,
  Camera,
  ArrowRight,
  FileText,
  Zap,
  Home,
  Key,
  Plus,
  Bell,
  Gauge,
  Wrench,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Header } from '../../components/common/Header';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import {
  notificationsService,
  AppNotificationPayload,
} from '../../services/notifications.service';
import { useAuth } from '../../context/AuthContext';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { casesApi } from '../../api/cases.api';
import { sitesApi } from '../../api/sites.api';
import { offlineStorage } from '../../services/offlineStorage';
import {
  rooftopVehiclesService,
  RooftopVehicle,
} from '../../services/rooftopVehicles.service';
import { GUIDED_CAPTURE_ZONES } from '../../components/evidence/GuidedZoneStepper';
import { Site, WarrantyCase } from '../../types';

interface VehicleListScreenProps {
  onOpenTickets: (tab?: string) => void;
  onStartNewCase: (initialData?: any) => void;
  onOpenCase: (caseItem: WarrantyCase) => void;
  onOpenProfile: () => void;
  onOpenLoaners?: () => void;
  onOpenRoadTest?: () => void;
  onOpenHome?: () => void;
  onOpenHoists?: () => void;
  onLogout?: () => void;
  onOpenZoneCapture?: (item: RooftopVehicle) => void;
  onStartNewInspection?: () => void;
}

export const VehicleListScreen: React.FC<VehicleListScreenProps> = ({
  onOpenTickets,
  onStartNewCase,
  onOpenCase,
  onOpenProfile,
  onOpenLoaners,
  onOpenHome,
  onOpenHoists,
  onLogout,
  onOpenZoneCapture,
  onStartNewInspection,
}) => {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId } = useAuth();
  const { startNewCase } = useCaseWizard();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SERVICE_MANAGER';
  const isClerk = user?.role === 'CLERK';
  const technicianSiteId = isAdmin
    ? 'all'
    : activeSiteId || user?.defaultSiteId || user?.authorizedSiteIds?.[0] || '';
  const canCaptureInspection = !isClerk;

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedAdminSiteId, setSelectedAdminSiteId] = useState<string>('all');
  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'complete' | 'defects'>('all');
  const [syncTimestamp, setSyncTimestamp] = useState<number>(Date.now());

  // Notification state
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [flaggedCount, setFlaggedCount] = useState<number>(0);

  // Poll for notification updates and offline captures
  useEffect(() => {
    const updateNotifs = () => {
      const count = notificationsService.getUnreadCount();
      setUnreadNotifCount(count);
      setSyncTimestamp(Date.now());
    };
    updateNotifs();
    const interval = setInterval(updateNotifs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadSites = async () => {
      try {
        const s = await sitesApi.getSites();
        setSites((s || []).filter((site) => site.isActive !== false));
      } catch (err) {
        console.warn('Failed to load live rooftop sites', err);
        setSites([]);
      }
    };
    loadSites();
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const filters: any = { limit: 100 };
      if (isClerk) {
        filters.siteId = technicianSiteId;
      }
      const data = await casesApi.getCases(filters);
      const pending = isClerk ? [] : offlineStorage.getPendingUploads();
      const serverList: WarrantyCase[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      const serverIds = new Set(serverList.map((c: WarrantyCase) => c.id));
      const merged = [
        ...pending.filter((p) => !serverIds.has(p.id)),
        ...serverList,
      ];
      setCases(merged);
      const flagged = merged.filter((c) => c.status === 'Flagged').length;
      setFlaggedCount(flagged);
    } catch {
      const pending = isClerk ? [] : offlineStorage.getPendingUploads();
      setCases(pending);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isClerk, technicianSiteId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const effectiveSiteId = isAdmin ? selectedAdminSiteId : technicianSiteId;

  const currentSite = useMemo(() => {
    if (isAdmin && effectiveSiteId === 'all') {
      return {
        id: 'all',
        name: 'All Rooftops & Dealerships',
        code: 'ALL',
      };
    }

    return (
      sites.find((s) => s.id === effectiveSiteId) ||
      sites[0] ||
      {
        id: effectiveSiteId,
        name: effectiveSiteId || 'No rooftop assigned',
        code: effectiveSiteId || '',
      }
    );
  }, [effectiveSiteId, isAdmin, sites]);

  const vehicles = useMemo(() => {
    return rooftopVehiclesService.getVehiclesForRooftop(effectiveSiteId, cases);
  }, [effectiveSiteId, cases, syncTimestamp]);

  // Dynamic Zone Metrics Calculator for each vehicle
  const getVehicleZoneMetrics = useCallback((veh: RooftopVehicle) => {
    const cleanVin = (veh.vin || '').toUpperCase();
    const zoneInspection = offlineStorage.getVehicleInspection(cleanVin);
    const caseEvidence = veh.latestCase?.evidenceItems || [];

    // All captured ruleKeys for this vehicle
    const capturedRuleKeys = new Set<string>([
      ...(zoneInspection?.capturedZoneKeys || []),
      ...caseEvidence.filter((e) => e.fileUri || e.serverUrl || e.storageUrl).map((e) => e.ruleKey),
    ]);

    // Check each of the 10 zones from GUIDED_CAPTURE_ZONES
    const zonesStatus = GUIDED_CAPTURE_ZONES.map((zone, idx) => {
      const isExplicitlyCaptured = capturedRuleKeys.has(zone.ruleKey);
      const isInheritedCaptured =
        (zoneInspection?.status === 'COMPLETE') ||
        (veh.inspectionStatus === 'COMPLETE') ||
        (veh.capturedZones !== undefined && idx < veh.capturedZones);

      return {
        ...zone,
        isCaptured: isExplicitlyCaptured || isInheritedCaptured,
      };
    });

    const capturedCount = zonesStatus.filter((z) => z.isCaptured).length;
    const missingZones = zonesStatus.filter((z) => !z.isCaptured);
    const isComplete =
      capturedCount >= 10 ||
      veh.inspectionStatus === 'COMPLETE' ||
      zoneInspection?.status === 'COMPLETE';

    // Defects from inspection or case
    const defects = [
      ...(zoneInspection?.defects || []),
      ...(veh.latestCase?.flagHistory || []).map((f) => ({
        zoneKey: f.ruleKey || 'defect',
        description: f.instruction,
        flaggedAt: f.flaggedAt,
      })),
    ];
    const totalDefects = Math.max(veh.defectCount || 0, defects.length);

    // Dynamic AI Finding Text
    let aiPrefix = '';
    let aiText = '';

    if (totalDefects > 0) {
      const defectSummary = defects[0]?.description || veh.defectSummary || 'Defect detected';
      aiPrefix = `${totalDefects} defect${totalDefects > 1 ? 's' : ''} flagged by Vision AI`;
      aiText = ` (${defectSummary}).`;
    } else if (isComplete || capturedCount >= 10) {
      aiPrefix = 'Inspection Complete.';
      aiText = ' All 10 zones captured and verified. Vision AI analysis confirms zero surface defects.';
    } else {
      aiPrefix = 'AI found 0 defects so far.';
      const nextMissing = missingZones.slice(0, 3).map((z) => z.shortLabel.toLowerCase());
      const missingStr =
        nextMissing.length > 1
          ? `${nextMissing.slice(0, -1).join(', ')} and ${nextMissing[nextMissing.length - 1]}`
          : nextMissing[0] || 'remaining zones';
      aiText = ` Continue ${missingStr}.`;
    }

    return {
      zonesStatus,
      capturedCount,
      totalZones: 10,
      missingZones,
      isComplete,
      totalDefects,
      aiPrefix,
      aiText,
    };
  }, []);

  // KPI Calculations (Real & Dynamic)
  const totalCount = vehicles.length;
  const inProgressCount = useMemo(() => {
    return vehicles.filter((v) => !getVehicleZoneMetrics(v).isComplete).length;
  }, [vehicles, getVehicleZoneMetrics]);
  const completeCount = useMemo(() => {
    return vehicles.filter((v) => getVehicleZoneMetrics(v).isComplete).length;
  }, [vehicles, getVehicleZoneMetrics]);
  const defectsCount = useMemo(() => {
    return vehicles.filter((v) => getVehicleZoneMetrics(v).totalDefects > 0).length;
  }, [vehicles, getVehicleZoneMetrics]);

  // Filtered Inspections
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((veh) => {
      const metrics = getVehicleZoneMetrics(veh);

      if (activeFilter === 'in_progress' && metrics.isComplete) return false;
      if (activeFilter === 'complete' && !metrics.isComplete) return false;
      if (activeFilter === 'defects' && metrics.totalDefects === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchVin = veh.vin.toLowerCase().includes(q);
        const matchModel = `${veh.make} ${veh.model}`.toLowerCase().includes(q);
        const matchRego = veh.rego.toLowerCase().includes(q);
        const matchRo = (veh.inspectionNumber || veh.roNumber || '').toLowerCase().includes(q);
        if (!matchVin && !matchModel && !matchRego && !matchRo) return false;
      }

      return true;
    });
  }, [vehicles, activeFilter, searchQuery, getVehicleZoneMetrics]);

  const handleContinueCapture = (item: RooftopVehicle) => {
    if (!canCaptureInspection) {
      handleViewReport(item);
      return;
    }

    if (onOpenZoneCapture) {
      onOpenZoneCapture(item);
      return;
    }
    const zoneInspection = offlineStorage.getVehicleInspection(item.vin);
    startNewCase({
      currentStep: 3,
      vin: item.vin,
      make: item.make,
      model: item.model,
      year: item.year,
      powertrain: item.powertrain,
      odometer: item.odometer,
      roNumber: item.inspectionNumber || item.roNumber || '180001',
      evidenceItems: zoneInspection?.evidenceItems || item.latestCase?.evidenceItems || [],
    });
    onStartNewCase({
      currentStep: 3,
      vin: item.vin,
      rego: item.rego,
      make: item.make,
      model: item.model,
      year: item.year,
      powertrain: item.powertrain,
      odometer: item.odometer,
      roNumber: item.inspectionNumber || item.roNumber || '180001',
    });
  };

  const handleViewReport = (item: RooftopVehicle) => {
    if (item.latestCase) {
      onOpenCase(item.latestCase);
    } else {
      const zoneInspection = offlineStorage.getVehicleInspection(item.vin);
      const metrics = getVehicleZoneMetrics(item);
      const fallbackCase: WarrantyCase = {
        id: item.id || `case_${item.vin}`,
        siteId: item.siteId,
        siteName: item.siteName,
        brandId: 'brand_byd',
        brandName: item.make,
        roNumber: item.inspectionNumber || item.roNumber || '180001',
        vin: item.vin,
        odometer: item.odometer,
        make: item.make,
        model: item.model,
        year: item.year,
        powertrain: item.powertrain,
        status: metrics.isComplete ? 'Closed' : 'Draft',
        technicianId: user?.id || 'tech_1',
        technicianName: user?.name || 'Shaun Sumaru',
        concernTitle: item.concernTitle || `${item.make} ${item.model} Condition Inspection`,
        faultCategory: 'Condition Inspection',
        partReplaced: false,
        noiseFault: false,
        diagnosticsAvailable: true,
        repairStage: 'Pre-repair only',
        evidenceItems: zoneInspection?.evidenceItems || [],
        voiceNotes: [],
        flagHistory: (zoneInspection?.defects || []).map((d, i) => ({
          id: `fl_${i}`,
          ruleKey: d.zoneKey,
          reasonCode: 'OTHER',
          instruction: d.description,
          flaggedAt: d.flaggedAt,
          isResolved: false,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onOpenCase(fallbackCase);
    }
  };

  const userInitials = useMemo(() => {
    if (!user?.name) return 'SH';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const userFirstName = useMemo(() => {
    if (!user?.name) return 'shaun';
    return user.name.trim().toLowerCase().split(/\s+/)[0];
  }, [user?.name]);

  const handleSelectNotification = (notif: AppNotificationPayload) => {
    setShowNotifModal(false);
    const targetCase = notif.caseItem || cases.find((c) => c.id === notif.caseId);
    if (targetCase) {
      onOpenCase(targetCase);
    } else {
      onOpenTickets('all');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Top Red Brand Header Bar (With Logout on Extreme Right) ── */}
      <Header
        showBrandLogo
        onLogout={onLogout}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowNotifModal(true)}
            style={styles.bellBtn}
            accessibilityLabel="Warranty Alerts"
          >
            <Bell size={20} color="#FFFFFF" />
            {(unreadNotifCount > 0 || flaggedCount > 0) && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotifCount > 0 ? unreadNotifCount : flaggedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* ── 2. Scrollable Body Content ─────────────────────────────────── */}
      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item.id || item.vin}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeaderArea}>
            {/* Assigned Rooftop Card */}
            <View style={styles.rooftopCard}>
              <View style={styles.rooftopLeft}>
                <View style={styles.rooftopIconCircle}>
                  <Building2 size={18} color="#DC2626" />
                </View>
                <View style={styles.rooftopDetails}>
                  <Text style={styles.rooftopEyebrow}>
                    {isAdmin ? 'ADMIN NETWORK VIEW' : 'YOUR ASSIGNED ROOFTOP'}
                  </Text>
                  <Text style={styles.rooftopTitle} numberOfLines={1}>
                    {currentSite.name}
                  </Text>
                </View>
              </View>
              <View style={styles.rooftopLockedBadge}>
                <Lock size={12} color="#64748B" />
                <Text style={styles.rooftopLockedText}>{isAdmin ? 'All Sites' : 'Assigned'}</Text>
              </View>
            </View>

            {isAdmin && (
              <View style={styles.adminSiteFilterBlock}>
                <Text style={styles.adminSiteFilterLabel}>Filter by rooftop</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.adminSiteFilterRow}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedAdminSiteId('all')}
                    style={[
                      styles.siteFilterChip,
                      selectedAdminSiteId === 'all' ? styles.siteFilterChipActive : styles.siteFilterChipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.siteFilterChipText,
                        selectedAdminSiteId === 'all' && styles.siteFilterChipTextActive,
                      ]}
                    >
                      All Rooftops
                    </Text>
                  </TouchableOpacity>

                  {sites.map((site) => {
                    const isSelected = selectedAdminSiteId === site.id;
                    return (
                      <TouchableOpacity
                        key={site.id}
                        onPress={() => setSelectedAdminSiteId(site.id)}
                        style={[
                          styles.siteFilterChip,
                          isSelected ? styles.siteFilterChipActive : styles.siteFilterChipInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.siteFilterChipText,
                            isSelected && styles.siteFilterChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {site.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Hero Header Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>BOORAN VEHICLE INSPECT</Text>
              <Text style={styles.heroTitle}>Vehicle Inspection</Text>
              <Text style={styles.heroSubtitle}>
                Photograph each vehicle zone, let AI surface scratches, dents and defects, then deliver a condition report.
              </Text>
            </View>

            {/* 2x2 KPI Stat Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                {/* 1. Total Inspections */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter('all')}
                  style={[
                    styles.kpiCard,
                    activeFilter === 'all' && styles.kpiCardActiveRed,
                  ]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <ClipboardList size={18} color="#DC2626" />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
                      {totalCount}
                    </Text>
                    <Text style={styles.kpiLabel}>TOTAL INSPECTIONS</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. In Progress */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter('in_progress')}
                  style={[
                    styles.kpiCard,
                    activeFilter === 'in_progress' && styles.kpiCardActiveRed,
                  ]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Clock size={18} color="#DC2626" />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
                      {inProgressCount}
                    </Text>
                    <Text style={styles.kpiLabel}>IN PROGRESS</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.kpiRow}>
                {/* 3. Complete */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter('complete')}
                  style={[
                    styles.kpiCard,
                    activeFilter === 'complete' && styles.kpiCardActiveGreen,
                  ]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <CheckCircle2 size={18} color="#10B981" />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: '#059669' }]}>
                      {completeCount}
                    </Text>
                    <Text style={styles.kpiLabel}>COMPLETE</Text>
                  </View>
                </TouchableOpacity>

                {/* 4. AI Analysis */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter('defects')}
                  style={[
                    styles.kpiCard,
                    activeFilter === 'defects' && styles.kpiCardActiveAmber,
                  ]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Sparkles size={18} color="#D97706" />
                  </View>
                  <View style={styles.kpiTextBox}>
                    <Text style={[styles.kpiValue, { color: '#0F172A', fontSize: 16 }]}>
                      Vision LLM
                    </Text>
                    <Text style={styles.kpiLabel}>AI ANALYSIS</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by VIN, model, rego, or inspection #"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                style={[
                  styles.filterPill,
                  activeFilter === 'all' ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'all' && styles.filterPillTextActive,
                  ]}
                >
                  All ({totalCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('in_progress')}
                style={[
                  styles.filterPill,
                  activeFilter === 'in_progress' ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'in_progress' && styles.filterPillTextActive,
                  ]}
                >
                  In Progress ({inProgressCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('complete')}
                style={[
                  styles.filterPill,
                  activeFilter === 'complete' ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'complete' && styles.filterPillTextActive,
                  ]}
                >
                  Complete ({completeCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('defects')}
                style={[
                  styles.filterPill,
                  activeFilter === 'defects' ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'defects' && styles.filterPillTextActive,
                  ]}
                >
                  Defects found ({defectsCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Recent inspections</Text>
              <Text style={styles.sectionHeaderCount}>{filteredVehicles.length} reports</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <>
                <FileText size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Inspections Found</Text>
                <Text style={styles.emptySubtitle}>
                  No vehicle inspection records match your selected filter criteria.
                </Text>
                {canCaptureInspection ? (
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => onStartNewCase()}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.emptyActionBtnText}>Start New Inspection</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => onOpenTickets('awaiting')}
                  >
                    <FileText size={16} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.emptyActionBtnText}>Review Queue</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const metrics = getVehicleZoneMetrics(item);
          const inspectionNum = item.inspectionNumber || item.roNumber || '180001';

          return (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => (canCaptureInspection && onOpenZoneCapture ? onOpenZoneCapture(item) : handleViewReport(item))}
              style={styles.inspectionCard}
            >
              {/* Card Header: Year + Make + Model */}
              <Text style={styles.cardVehicleTitle}>
                {item.year} {item.make} {item.model}
              </Text>

              {/* Tags Row */}
              <View style={styles.tagsRow}>
                <View style={styles.regoTag}>
                  <Text style={styles.regoTagText}>{item.rego}</Text>
                </View>

                <View style={styles.powertrainTag}>
                  <Text style={styles.powertrainTagText}>{item.powertrain}</Text>
                </View>

                <View style={metrics.isComplete ? styles.statusTagComplete : styles.statusTagInProgress}>
                  <Text
                    style={
                      metrics.isComplete ? styles.statusTagTextComplete : styles.statusTagTextInProgress
                    }
                  >
                    {metrics.isComplete ? 'COMPLETE' : 'IN PROGRESS'}
                  </Text>
                </View>

                {metrics.totalDefects > 0 && (
                  <View style={styles.defectTag}>
                    <Zap size={11} color="#DC2626" />
                    <Text style={styles.defectTagText}>
                      {metrics.totalDefects} DEFECT{metrics.totalDefects > 1 ? 'S' : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* 3-Column Metadata Strip */}
              <View style={styles.metadataBox}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>VIN</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.vin}
                  </Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>ODOMETER</Text>
                  <View style={styles.metaValueWithIcon}>
                    <Gauge size={12} color="#475569" style={{ marginRight: 3 }} />
                    <Text style={styles.metaValue}>
                      {item.odometer ? `${item.odometer.toLocaleString()} km` : '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>INSPECTION #</Text>
                  <Text style={[styles.metaValue, styles.metaValueInspectionNum]}>
                    {inspectionNum}
                  </Text>
                </View>
              </View>

              {/* Dynamic Guided Zone Capture Segmented Progress Bar */}
              <View style={styles.guidedZoneHeader}>
                <Text style={styles.guidedZoneTitle}>Guided zone capture</Text>
                <Text style={styles.guidedZoneCount}>{metrics.capturedCount} of 10 zones</Text>
              </View>
              <View style={styles.segmentsRow}>
                {metrics.zonesStatus.map((zone) => (
                  <View
                    key={zone.id}
                    style={[
                      styles.segmentBar,
                      zone.isCaptured ? styles.segmentFilled : styles.segmentUnfilled,
                    ]}
                  />
                ))}
              </View>

              {/* Dynamic AI Finding Banner */}
              <View style={styles.aiBanner}>
                <Sparkles size={16} color="#D97706" style={{ marginTop: 1 }} />
                <Text style={styles.aiBannerText}>
                  <Text style={{ fontWeight: '700', color: '#92400E' }}>
                    {metrics.aiPrefix}
                  </Text>
                  {metrics.aiText}
                </Text>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActionsRow}>
                {!metrics.isComplete && canCaptureInspection ? (
                  <>
                    <TouchableOpacity
                      style={styles.btnContinueCapture}
                      onPress={() => handleContinueCapture(item)}
                      activeOpacity={0.8}
                    >
                      <Camera size={16} color="#DC2626" />
                      <Text style={styles.btnContinueCaptureText}>Continue Capture</Text>
                      <ArrowRight size={14} color="#DC2626" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnViewReport}
                      onPress={() => handleViewReport(item)}
                      activeOpacity={0.8}
                    >
                      <FileText size={15} color="#475569" />
                      <Text style={styles.btnViewReportText}>View Report</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.btnViewReport, { flex: 1.1 }]}
                      onPress={() => handleViewReport(item)}
                      activeOpacity={0.8}
                    >
                      <FileText size={15} color="#1E293B" />
                      <Text style={[styles.btnViewReportText, { color: '#0F172A' }]}>
                        View Report
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.btnPassedBadge}>
                      <CheckCircle2 size={16} color="#059669" />
                      <Text style={styles.btnPassedText}>Inspection Complete</Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── 3. Fixed Bottom Navigation Bar (Home, Tickets, Hoists, Loaners, shaun) ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        {/* 1. Home */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenHome}
          style={styles.bottomBarTab}
        >
          <Home size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Home</Text>
        </TouchableOpacity>

        {/* 2. Tickets */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onOpenTickets('all')}
          style={styles.bottomBarTab}
        >
          <FileText size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Tickets</Text>
        </TouchableOpacity>

        {/* 3. Hoists */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenHoists}
          style={styles.bottomBarTab}
        >
          <Wrench size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Hoists</Text>
        </TouchableOpacity>

        {/* 4. Loaners */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenLoaners}
          style={styles.bottomBarTab}
        >
          <Key size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Loaners</Text>
        </TouchableOpacity>

        {/* 5. User Profile / Initials Avatar */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenProfile}
          style={styles.bottomBarTab}
        >
          <View style={styles.bottomBarAvatarCircle}>
            <Text style={styles.bottomBarAvatarText}>{userInitials}</Text>
          </View>
          <Text style={styles.bottomBarLabel} numberOfLines={1}>
            {userFirstName}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onSelectNotification={handleSelectNotification}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D71920',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listHeaderArea: {
    marginBottom: 6,
  },
  rooftopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
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
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rooftopDetails: {
    flex: 1,
  },
  rooftopEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  rooftopTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#64748B',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '500',
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiCardActiveRed: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  kpiCardActiveGreen: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  kpiCardActiveAmber: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTextBox: {
    flex: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DC2626',
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  adminSiteFilterBlock: {
    marginBottom: 14,
  },
  adminSiteFilterLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  adminSiteFilterRow: {
    gap: 8,
    paddingRight: 6,
  },
  siteFilterChip: {
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  siteFilterChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  siteFilterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  siteFilterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  siteFilterChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  inspectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardVehicleTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  regoTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regoTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  powertrainTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  powertrainTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  statusTagInProgress: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagTextInProgress: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  statusTagComplete: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagTextComplete: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  defectTag: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  defectTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  metadataBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  metaValueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaValueInspectionNum: {
    color: '#DC2626',
    fontWeight: '900',
  },
  guidedZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  guidedZoneTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  guidedZoneCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  segmentBar: {
    flex: 1,
    height: 7,
    borderRadius: 3.5,
  },
  segmentFilled: {
    backgroundColor: '#DC2626',
  },
  segmentUnfilled: {
    backgroundColor: '#E2E8F0',
  },
  aiBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  aiBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 16,
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnContinueCapture: {
    flex: 1.25,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnContinueCaptureText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  btnViewReport: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnViewReportText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
  },
  btnPassedBadge: {
    flex: 1.1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnPassedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyActionBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomBarTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    gap: 3,
  },
  bottomBarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  bottomBarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: 4,
  },
  bottomBarActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  bottomBarAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  bottomBarAvatarText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
  },
});
