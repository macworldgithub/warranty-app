import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Bell, FileText, CheckCircle2, Clock, Car, Key, Home, Wrench } from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Header } from '../../components/common/Header';
import { Tabs, TabItem } from '../../components/common/Tabs';
import { BottomNavBar } from '../../components/common/BottomNavBar';
import { useAuth } from '../../context/AuthContext';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { casesApi } from '../../api/cases.api';
import { offlineStorage } from '../../services/offlineStorage';
import { WarrantyCase, CaseStatus, Site } from '../../types';
import { sitesApi } from '../../api/sites.api';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import {
  notificationsService,
  AppNotificationPayload,
} from '../../services/notifications.service';

interface CaseListScreenProps {
  initialTab?: string;
  onStartNewCase: () => void;
  onOpenCase: (caseItem: WarrantyCase) => void;
  onResolveFlag: (caseItem: WarrantyCase) => void;
  onOpenProfile: () => void;
  onOpenVehicles: () => void;
  onOpenLoaners?: () => void;
  onOpenRoadTest?: () => void;
  onOpenHome?: () => void;
  onOpenHoists?: () => void;
  onLogout: () => void;
}

const getElapsedTimeInfo = (caseItem: WarrantyCase) => {
  const timestamp = caseItem.submittedAt || caseItem.updatedAt || caseItem.createdAt;
  if (!timestamp) return { text: 'Just now', diffHours: 0, isUrgent: false, isModerate: false };

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return { text: 'Recently', diffHours: 0, isUrgent: false, isModerate: false };

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let text = '';
  if (diffMinutes < 1) {
    text = 'Just now';
  } else if (diffMinutes < 60) {
    text = `${diffMinutes}m elapsed`;
  } else if (diffHours < 24) {
    const mins = diffMinutes % 60;
    text = mins > 0 ? `${diffHours}h ${mins}m elapsed` : `${diffHours}h elapsed`;
  } else {
    const remainingHours = diffHours % 24;
    text = remainingHours > 0 ? `${diffDays}d ${remainingHours}h elapsed` : `${diffDays}d elapsed`;
  }

  const isUrgent = diffHours >= 6;
  const isModerate = diffHours >= 2 && diffHours < 6;

  return { text, diffHours, diffMinutes, isUrgent, isModerate };
};

export const CaseListScreen: React.FC<CaseListScreenProps> = ({
  initialTab,
  onStartNewCase,
  onOpenCase,
  onResolveFlag,
  onOpenProfile,
  onOpenVehicles,
  onOpenLoaners,
  onOpenRoadTest,
  onOpenHome,
  onOpenHoists,
  onLogout: _onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId, setActiveSiteId } = useAuth();
  const { startNewCase } = useCaseWizard();

  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [siteOptions, setSiteOptions] = useState<Site[]>([]);
  const [selectedAdminSiteId, setSelectedAdminSiteId] = useState<string>('all');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const isClerk = user?.role === 'CLERK';
  const clerkSiteId = activeSiteId || user?.defaultSiteId || user?.authorizedSiteIds?.[0];
  const isAdmin = user?.role === 'ADMIN' || isClerk || user?.role === 'SERVICE_MANAGER';
  const isNetworkAdmin = user?.role === 'ADMIN' || user?.role === 'SERVICE_MANAGER';

  useEffect(() => {
    if (!isClerk && !isNetworkAdmin) return;
    const authorizedIds = user?.authorizedSiteIds || [];
    sitesApi.getSites()
      .then((siteList) => {
        const activeSites = siteList.filter((site) => site.isActive !== false);
        setSiteOptions(activeSites);
        if (isClerk) {
          setAssignedSites(activeSites.filter((site) => authorizedIds.includes(site.id)));
        }
      })
      .catch(() => {
        setSiteOptions([]);
        if (isClerk) {
          setAssignedSites(authorizedIds.map((id) => ({
            id,
            code: id,
            name: id.replace(/^site_/, '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
          })));
        }
      });
  }, [isClerk, isNetworkAdmin, user?.authorizedSiteIds]);

  useEffect(() => {
    setUnreadNotifCount(notificationsService.getUnreadCount());
    const unsubscribe = notificationsService.onNotification(() => {
      setUnreadNotifCount(notificationsService.getUnreadCount());
    });
    return () => unsubscribe();
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const filters: any = { limit: 100 };
      if (isClerk && clerkSiteId) {
        filters.siteId = clerkSiteId;
      } else if (!isAdmin && user?.id) {
        filters.technicianId = user.id;
        filters.technicianName = user.name;
      }
      const data = await casesApi.getCases(filters);
      const pending = isAdmin ? [] : offlineStorage.getPendingUploads();
      const serverList: WarrantyCase[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      const serverIds = new Set(serverList.map((c: WarrantyCase) => c.id));
      const merged: WarrantyCase[] = [
        ...pending.filter((p) => !serverIds.has(p.id)),
        ...serverList,
      ];

      // Merge local offline vehicle evidence items into each warranty case
      const mergedWithLocal: WarrantyCase[] = merged.map((c) => {
        if (!c.vin) return c;
        const localInsp = offlineStorage.getVehicleInspection(c.vin);
        if (!localInsp || !localInsp.evidenceItems || localInsp.evidenceItems.length === 0) {
          return c;
        }
        const existingKeys = new Set((c.evidenceItems || []).map((e) => e.ruleKey || e.id));
        const combined = [
          ...(c.evidenceItems || []),
          ...localInsp.evidenceItems.filter((e) => !existingKeys.has(e.ruleKey || e.id)),
        ];
        return {
          ...c,
          evidenceItems: combined,
        };
      });

      setCases(mergedWithLocal);
    } catch {
      // Load offline pending drafts with local evidence items
      const pending = isAdmin ? [] : offlineStorage.getPendingUploads();
      const pendingWithLocal = pending.map((c) => {
        if (!c.vin) return c;
        const localInsp = offlineStorage.getVehicleInspection(c.vin);
        if (!localInsp || !localInsp.evidenceItems || localInsp.evidenceItems.length === 0) {
          return c;
        }
        const existingKeys = new Set((c.evidenceItems || []).map((e) => e.ruleKey || e.id));
        return {
          ...c,
          evidenceItems: [
            ...(c.evidenceItems || []),
            ...localInsp.evidenceItems.filter((e) => !existingKeys.has(e.ruleKey || e.id)),
          ],
        };
      });
      setCases(pendingWithLocal);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clerkSiteId, isAdmin, isClerk, user?.id, user?.name]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    const unsub = offlineStorage.subscribe(() => {
      fetchCases();
    });
    return () => unsub();
  }, [fetchCases]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const handleCreateNew = () => {
    startNewCase();
    onStartNewCase();
  };

  // Filter cases
  const filteredCases = cases.filter(item => {
    // If user is a technician, restrict strictly to their own cases
    if (!isAdmin && user) {
      const isMyCase =
        (user.id && item.technicianId === user.id) ||
        (user.name && item.technicianName?.toLowerCase() === user.name.toLowerCase()) ||
        (!item.technicianId && !item.technicianName); // offline drafts
      if (!isMyCase) return false;
    }

    const matchesSearch =
      !searchQuery ||
      item.roNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.concernTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technicianName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (isNetworkAdmin && selectedAdminSiteId !== 'all' && item.siteId !== selectedAdminSiteId) {
      return false;
    }

    if (activeTab === 'all') return true;
    if (activeTab === 'flagged') return item.status === 'Flagged';
    if (activeTab === 'awaiting') return item.status === 'Awaiting Review';
    if (activeTab === 'submitted') return item.status === 'Submitted';
    if (activeTab === 'drafts') return item.status === 'Draft' || item.status === 'Uploading';
    return true;
  });

  // Base my-cases list for accurate badge counts
  const myCases = cases.filter(item => {
    if (!isAdmin && user) {
      const isMyCase =
        (user.id && item.technicianId === user.id) ||
        (user.name && item.technicianName?.toLowerCase() === user.name.toLowerCase()) ||
        (!item.technicianId && !item.technicianName);
      if (!isMyCase) return false;
    }
    if (isNetworkAdmin && selectedAdminSiteId !== 'all' && item.siteId !== selectedAdminSiteId) {
      return false;
    }
    return true;
  });

  const flaggedCount = myCases.filter(c => c.status === 'Flagged').length;
  const awaitingCount = myCases.filter(c => c.status === 'Awaiting Review').length;
  const submittedCount = myCases.filter(c => c.status === 'Submitted').length;

  const tabs: TabItem[] = [
    { key: 'all', label: 'All Cases', count: myCases.length },
    { key: 'flagged', label: 'Flagged', count: flaggedCount },
    { key: 'awaiting', label: 'Awaiting Review', count: awaitingCount },
    { key: 'submitted', label: 'Submitted', count: submittedCount },
  ];

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'Submitted':
        return <Badge label="Complete" variant="success" size="sm" />;
      case 'Flagged':
        return <Badge label="Flagged" variant="flagged" size="sm" icon={<Icon name="flag" size={12} color={colors.flagged} />} />;
      case 'Awaiting Review':
        return <Badge label="Awaiting Review" variant="primary" size="sm" />;
      case 'Uploading':
        return <Badge label="Uploading" variant="warning" size="sm" />;
      case 'Draft':
      default:
        return <Badge label="Draft" variant="neutral" size="sm" />;
    }
  };

  const handleNotificationSelect = (notif: AppNotificationPayload) => {
    const targetCase = notif.caseItem || cases.find((c) => c.id === notif.caseId);
    if (targetCase) {
      if (!isAdmin && (notif.type === 'FLAGGED' || targetCase.status === 'Flagged')) {
        onResolveFlag(targetCase);
      } else {
        onOpenCase(targetCase);
      }
    } else {
      setActiveTab('all');
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Clean App Header: Logo left, Notification Bell right */}
      <Header
        showBrandLogo
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setShowNotifModal(true);
            }}
            style={styles.bellBtn}
            accessibilityLabel="Warranty Alerts"
          >
            <Bell size={20} color="#FFFFFF" />
            {(unreadNotifCount > 0 || flaggedCount > 0) && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifCount > 0 ? unreadNotifCount : flaggedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* Case List with integrated Hero & Horizontal KPI Boxes Header */}
      <FlatList
        data={filteredCases}
        keyExtractor={item => item.id || item.roNumber}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeaderArea}>
            {isNetworkAdmin && (
              <View style={styles.rooftopSwitcherCard}>
                <View style={styles.rooftopSwitcherHeader}>
                  <View>
                    <Text style={styles.rooftopSwitcherEyebrow}>ADMIN NETWORK VIEW</Text>
                    <Text style={styles.rooftopSwitcherTitle}>Filter by rooftop</Text>
                  </View>
                  <Text style={styles.rooftopSwitcherCount}>
                    {selectedAdminSiteId === 'all' ? 'All sites' : 'Filtered'}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.adminRooftopFilterOptions}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedAdminSiteId('all')}
                    style={[
                      styles.adminRooftopOption,
                      selectedAdminSiteId === 'all' && styles.rooftopOptionActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedAdminSiteId === 'all' }}
                    accessibilityLabel="Show all rooftops"
                  >
                    <Home size={14} color={selectedAdminSiteId === 'all' ? '#FFFFFF' : colors.textSecondary} />
                    <Text
                      style={[
                        styles.rooftopOptionText,
                        selectedAdminSiteId === 'all' && styles.rooftopOptionTextActive,
                      ]}
                    >
                      All Rooftops
                    </Text>
                  </TouchableOpacity>

                  {siteOptions.map((site) => {
                    const selected = selectedAdminSiteId === site.id;
                    return (
                      <TouchableOpacity
                        key={site.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedAdminSiteId(site.id)}
                        style={[
                          styles.adminRooftopOption,
                          selected && styles.rooftopOptionActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Filter to ${site.name}`}
                      >
                        <Home size={14} color={selected ? '#FFFFFF' : colors.textSecondary} />
                        <Text style={[styles.rooftopOptionText, selected && styles.rooftopOptionTextActive]} numberOfLines={1}>
                          {site.name.replace(/^Booran\s+/i, '')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {isClerk && assignedSites.length > 0 && (
              <View style={styles.rooftopSwitcherCard}>
                <View style={styles.rooftopSwitcherHeader}>
                  <View>
                    <Text style={styles.rooftopSwitcherEyebrow}>ACTIVE ROOFTOP</Text>
                    <Text style={styles.rooftopSwitcherTitle}>Switch assigned location</Text>
                  </View>
                  <Text style={styles.rooftopSwitcherCount}>{assignedSites.length} assigned</Text>
                </View>
                <View style={styles.rooftopSwitcherOptions}>
                  {assignedSites.map((site) => {
                    const selected = site.id === clerkSiteId;
                    return (
                      <TouchableOpacity
                        key={site.id}
                        activeOpacity={0.8}
                        onPress={() => setActiveSiteId(site.id)}
                        style={[styles.rooftopOption, selected && styles.rooftopOptionActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Switch to ${site.name}`}
                      >
                        <Home size={14} color={selected ? '#FFFFFF' : colors.textSecondary} />
                        <Text style={[styles.rooftopOptionText, selected && styles.rooftopOptionTextActive]} numberOfLines={1}>
                          {site.name.replace(/^Booran\s+/i, '')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* When on Awaiting Tab: Direct Clean Awaiting Header (Remove Booran Intelligence hero and KPI bars) */}
            {activeTab === 'awaiting' ? (
              <View style={styles.awaitingHeaderSection}>
                <View style={styles.awaitingHeaderTop}>
                  <View style={styles.awaitingHeaderBadge}>
                    <Clock size={15} color={colors.warning} />
                    <Text style={styles.awaitingHeaderBadgeText}>AWAITING CLERK QUEUE</Text>
                  </View>
                  <View style={styles.awaitingCountPill}>
                    <Text style={styles.awaitingCountPillText}>
                      {awaitingCount} {awaitingCount === 1 ? 'Case Pending' : 'Cases Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.awaitingHeaderTitle}>Cases Awaiting Review</Text>
                <Text style={styles.awaitingHeaderSub}>
                  Submitted warranty cases pending verification by the dealership warranty clerk. Track elapsed time and review status below.
                </Text>
              </View>
            ) : (
              <>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                  <View style={styles.heroEyebrowRow}>
                    <Text style={styles.heroEyebrow}>BOORAN MOTOR GROUP · EVIDENCE INTELLIGENCE</Text>
                  </View>
                  <Text style={styles.heroHeadline}>Vehicle Warranty & Evidence</Text>
                  <Text style={styles.heroSubhead}>
                    Guided photo capture, diagnostic verification, and automated OEM claims.
                  </Text>
                </View>

                {/* 2 Boxes per Line Grid */}
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiRow}>
                    {/* 1. Total Cases */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setActiveTab('all')}
                      style={[styles.kpiCard, activeTab === 'all' && styles.kpiCardActive]}
                    >
                      <View style={[styles.kpiIconBox, { backgroundColor: colors.backgroundSecondary }]}>
                        <FileText size={18} color={colors.textPrimary} />
                      </View>
                      <View style={styles.kpiTextBox}>
                        <Text style={styles.kpiValue}>{cases.length}</Text>
                        <Text style={styles.kpiLabel}>Total Cases</Text>
                      </View>
                    </TouchableOpacity>

                    {/* 2. Awaiting */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setActiveTab('awaiting')}
                      style={[styles.kpiCard, activeTab === 'awaiting' && styles.kpiCardActive]}
                    >
                      <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                        <Clock size={18} color={colors.warning} />
                      </View>
                      <View style={styles.kpiTextBox}>
                        <Text style={[styles.kpiValue, { color: colors.warning }]}>
                          {awaitingCount}
                        </Text>
                        <Text style={styles.kpiLabel}>Awaiting</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.kpiRow}>
                    {/* 3. Submitted / Complete */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setActiveTab('submitted')}
                      style={[styles.kpiCard, activeTab === 'submitted' && styles.kpiCardActive]}
                    >
                      <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
                        <CheckCircle2 size={18} color={colors.success} />
                      </View>
                      <View style={styles.kpiTextBox}>
                        <Text style={[styles.kpiValue, { color: colors.success }]}>
                          {submittedCount}
                        </Text>
                        <Text style={styles.kpiLabel}>Complete</Text>
                      </View>
                    </TouchableOpacity>

                    {/* 4. Flagged by Clerk */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setActiveTab('flagged')}
                      style={[styles.kpiCard, activeTab === 'flagged' && styles.kpiCardActive]}
                    >
                      <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
                        <Icon name="flag" size={18} color={colors.flagged} />
                      </View>
                      <View style={styles.kpiTextBox}>
                        <Text style={[styles.kpiValue, { color: colors.flagged }]}>
                          {flaggedCount}
                        </Text>
                        <Text style={styles.kpiLabel}>Flagged</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* Flagged Attention Banner if any */}
            {flaggedCount > 0 && activeTab !== 'awaiting' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (isAdmin) {
                    setActiveTab('flagged');
                  } else {
                    setShowNotifModal(true);
                  }
                }}
                style={styles.flagBanner}
              >
                <Icon name="flag" size={18} color={colors.flagged} />
                <View style={styles.flagBannerText}>
                  <Text style={styles.flagBannerTitle}>
                    {flaggedCount} Case{flaggedCount > 1 ? 's' : ''} Flagged for Evidence Correction
                  </Text>
                  <Text style={styles.flagBannerDesc}>
                    {isAdmin
                      ? 'Audit flagged tickets and review corrected technician submissions.'
                      : 'Tap to view missing shots and re-submit.'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.flagged} />
              </TouchableOpacity>
            )}

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Icon name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by RO #, VIN, Make, or Concern..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Tabs Filter */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                {activeTab === 'awaiting' ? 'Cases Awaiting Review' : 'All Tickets'}
              </Text>
              <Text style={styles.sectionHeaderCount}>
                {filteredCases.length} {filteredCases.length === 1 ? 'ticket' : 'tickets'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {activeTab === 'awaiting' ? (
              <>
                <Clock size={48} color={colors.surfaceElevated} />
                <Text style={styles.emptyTitle}>No Cases Awaiting Review</Text>
                <Text style={styles.emptySubtitle}>
                  There are currently no submitted warranty tickets waiting for clerk review.
                </Text>
              </>
            ) : (
              <>
                <Icon name="file-text" size={48} color={colors.surfaceElevated} />
                <Text style={styles.emptyTitle}>No Warranty Cases Found</Text>
                <Text style={styles.emptySubtitle}>
                  {isAdmin
                    ? 'No warranty cases match your current filter.'
                    : 'Tap below to start a new technician evidence capture ticket.'}
                </Text>
                {!isAdmin && (
                  <Button
                    title="Start New Case"
                    variant="primary"
                    onPress={handleCreateNew}
                    leftIcon={<Icon name="plus" size={18} color={colors.textPrimary} />}
                    style={{ marginTop: spacing.lg }}
                  />
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isFlagged = item.status === 'Flagged';
          const isAwaiting = item.status === 'Awaiting Review';
          const elapsedInfo = getElapsedTimeInfo(item);
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (!isAdmin && isFlagged ? onResolveFlag(item) : onOpenCase(item))}
              style={[
                styles.caseCard,
                isFlagged && styles.caseCardFlagged,
                isAwaiting && styles.caseCardAwaiting,
              ]}
            >
              {/* Top Row: RO Number + Badges + Status */}
              <View style={styles.cardHeader}>
                <View style={styles.roGroup}>
                  <Text style={styles.roText}>{item.roNumber || 'NO RO'}</Text>
                  <Badge label={item.brandName || item.make || 'OEM'} variant="outline" size="sm" />
                  {item.claimNumber ? (
                    <Badge label={`OEM: ${item.claimNumber}`} variant="success" size="sm" />
                  ) : null}
                  {isAdmin && item.technicianName ? (
                    <Badge label={`Tech: ${item.technicianName}`} variant="neutral" size="sm" />
                  ) : null}
                </View>
                <View style={styles.statusBadgeWrapper}>
                  {getStatusBadge(item.status)}
                </View>
              </View>

              {/* Time Elapsed Banner for Awaiting Review cases */}
              {isAwaiting && (
                <View
                  style={[
                    styles.elapsedBanner,
                    elapsedInfo.isUrgent
                      ? styles.elapsedBannerUrgent
                      : elapsedInfo.isModerate
                      ? styles.elapsedBannerModerate
                      : styles.elapsedBannerNormal,
                  ]}
                >
                  <Clock
                    size={13}
                    color={
                      elapsedInfo.isUrgent
                        ? colors.flagged
                        : elapsedInfo.isModerate
                        ? '#B45309'
                        : colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.elapsedBannerTime,
                      {
                        color: elapsedInfo.isUrgent
                          ? colors.flagged
                          : elapsedInfo.isModerate
                          ? '#B45309'
                          : colors.primary,
                      },
                    ]}
                  >
                    ⏱️ {elapsedInfo.text}
                  </Text>
                  <View style={styles.elapsedBannerDot} />
                  <Text style={styles.elapsedBannerLabel}>
                    {elapsedInfo.isUrgent
                      ? 'Priority Review · Over SLA'
                      : 'Pending Warranty Clerk'}
                  </Text>
                </View>
              )}

              {/* Concern Title & Classification */}
              <View style={styles.concernContainer}>
                <Text style={styles.concernTitle}>
                  {item.concernTitle || 'Warranty inspection and diagnosis'}
                </Text>
                {item.faultCategory ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText} numberOfLines={1}>
                      {item.faultCategory}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Clerk / Flag Note Callout if present */}
              {isFlagged && (item.clerkNotes || item.flagHistory?.length) ? (
                <View style={styles.noteCallout}>
                  <Icon name="alert-circle" size={14} color={colors.flagged} />
                  <Text style={styles.noteText}>
                    {item.clerkNotes || item.flagHistory?.[0]?.instruction || 'Evidence requires retake or correction.'}
                  </Text>
                </View>
              ) : null}

              {/* Vehicle Identity Strip */}
              {(() => {
                const frontEv = item.evidenceItems?.find((e) => e.ruleKey === 'front_vehicle_photo' && (e.fileUri || e.storageUrl));
                const carThumbUri = frontEv?.fileUri || frontEv?.storageUrl || item.evidenceItems?.find(e => e.fileUri || e.storageUrl)?.fileUri || item.evidenceItems?.find(e => e.fileUri || e.storageUrl)?.storageUrl;
                return (
                  <View style={styles.vehicleStrip}>
                    <View style={styles.vehicleDetail}>
                      {carThumbUri ? (
                        <Image
                          source={{ uri: carThumbUri }}
                          style={styles.cardCarMiniThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <Icon name="car" size={14} color={colors.textSecondary} />
                      )}
                      <Text style={styles.vehicleText} numberOfLines={1} ellipsizeMode="tail">
                        {item.year || ''} {item.make} {item.model || ''}
                      </Text>
                    </View>

                    {item.vin ? (
                      <View style={styles.vinBadge}>
                        <Text style={styles.vinLabel}>VIN</Text>
                        <Text style={styles.vinText} numberOfLines={1} ellipsizeMode="middle">
                          {item.vin.length > 11 ? `...${item.vin.slice(-8)}` : item.vin}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })()}

              {/* Evidence Images Strip */}
              {item.evidenceItems && item.evidenceItems.length > 0 && (
                <View style={styles.evidenceThumbnailsRow}>
                  {item.evidenceItems.slice(0, 4).map((ev, thumbIdx) => {
                    const rawUri = ev.storageUrl || ev.fileUri || ev.serverUrl || ev.thumbnailUrl;
                    const isValidUri = rawUri &&
                      !rawUri.includes('images.unsplash.com') &&
                      (rawUri.startsWith('http') || rawUri.startsWith('file:') || rawUri.startsWith('content:'));
                    return (
                      <View key={ev.id || `${thumbIdx}`} style={styles.evidenceThumbBox}>
                        {isValidUri ? (
                          <Image
                            source={{ uri: rawUri }}
                            style={styles.evidenceThumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.evidenceThumbFallback}>
                            <Car size={15} color="#DC2626" />
                          </View>
                        )}
                        <Text style={styles.evidenceThumbTag} numberOfLines={1}>
                          {ev.ruleName || ev.name || `Shot ${thumbIdx + 1}`}
                        </Text>
                      </View>
                    );
                  })}
                  {item.evidenceItems.length > 4 && (
                    <View style={styles.evidenceMorePill}>
                      <Text style={styles.evidenceMoreText}>+{item.evidenceItems.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Bottom Metadata & Gate Progress */}
              <View style={styles.cardFooter}>
                {isAwaiting ? (
                  <View style={styles.footerElapsedItem}>
                    <Clock size={12} color={elapsedInfo.isUrgent ? colors.flagged : '#B45309'} />
                    <Text
                      style={[
                        styles.footerElapsedText,
                        { color: elapsedInfo.isUrgent ? colors.flagged : '#B45309' },
                      ]}
                    >
                      Awaiting review ({elapsedInfo.text})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.footerItem}>
                    <Icon name="clock" size={13} color={colors.textMuted} />
                    <Text style={styles.footerText}>
                      {new Date(item.createdAt || Date.now()).toLocaleDateString('en-AU', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}

                <View style={styles.evidenceCounter}>
                  <Icon name="camera" size={13} color={colors.primaryLight} />
                  <Text style={styles.evidenceCountText}>
                    {item.evidenceItems?.length || 0} Evidence Items
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab="tickets"
        onOpenHome={onOpenHome || (() => setActiveTab('all'))}
        onOpenDrive={onOpenRoadTest}
        onOpenHoists={onOpenHoists}
        onOpenLoaners={onOpenLoaners}
        onOpenVehicles={onOpenVehicles}
        onOpenTickets={() => setActiveTab('all')}
        onOpenProfile={onOpenProfile}
        actionButton={{
          label: 'New Ticket',
          icon: 'plus',
          onPress: onStartNewCase,
        }}
      />

      {/* Notification Bell History Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onSelectNotification={handleNotificationSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileAvatarBtn: {
    padding: 2,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarAdmin: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  headerAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  bellBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  listHeaderArea: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  rooftopSwitcherCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rooftopSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rooftopSwitcherEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primary,
  },
  rooftopSwitcherTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rooftopSwitcherCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rooftopSwitcherOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  adminRooftopFilterOptions: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  rooftopOption: {
    minWidth: '47%',
    flexGrow: 1,
    flexBasis: 145,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminRooftopOption: {
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rooftopOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rooftopOptionText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rooftopOptionTextActive: {
    color: '#FFFFFF',
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
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.flaggedLight,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.25)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  flagBannerText: {
    flex: 1,
  },
  flagBannerTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.flagged,
  },
  flagBannerDesc: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 155,
  },
  caseCard: {
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
  caseCardFlagged: {
    borderColor: colors.flagged,
    backgroundColor: '#FEF8F8',
  },
  caseCardAwaiting: {
    borderColor: 'rgba(217, 119, 6, 0.35)',
    backgroundColor: '#FFFFFF',
  },
  awaitingHeaderSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  awaitingHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  awaitingHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  awaitingHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  awaitingCountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  awaitingCountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  awaitingHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  awaitingHeaderSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  elapsedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: spacing.xs + 3,
    gap: 6,
  },
  elapsedBannerNormal: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  elapsedBannerModerate: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  elapsedBannerUrgent: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.3)',
  },
  elapsedBannerTime: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  elapsedBannerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  elapsedBannerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  footerElapsedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerElapsedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    gap: spacing.xs,
  },
  roGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadgeWrapper: {
    flexShrink: 0,
  },
  roText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  concernContainer: {
    marginBottom: spacing.xs + 2,
  },
  concernTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  noteCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.flaggedLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.flagged,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: spacing.xs + 2,
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.flagged,
    lineHeight: 16,
    fontWeight: typography.weights.medium,
  },
  vehicleStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: spacing.xs + 2,
  },
  vehicleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  vehicleText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    flexShrink: 1,
  },
  vinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  vinLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  vinText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  cardCarMiniThumb: {
    width: 22,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
  },
  evidenceThumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
    paddingTop: 4,
  },
  evidenceThumbBox: {
    width: 58,
    alignItems: 'center',
  },
  evidenceThumbImage: {
    width: 56,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenceThumbFallback: {
    width: 56,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  evidenceThumbTag: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  evidenceMorePill: {
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenceMoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  evidenceCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceCountText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
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
});
