import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Header } from '../../components/common/Header';
import { Tabs, TabItem } from '../../components/common/Tabs';
import { useAuth } from '../../context/AuthContext';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { casesApi } from '../../api/cases.api';
import { offlineStorage } from '../../services/offlineStorage';
import { WarrantyCase, CaseStatus } from '../../types';

interface CaseListScreenProps {
  onStartNewCase: () => void;
  onOpenCase: (caseItem: WarrantyCase) => void;
  onResolveFlag: (caseItem: WarrantyCase) => void;
  onLogout: () => void;
}

export const CaseListScreen: React.FC<CaseListScreenProps> = ({
  onStartNewCase,
  onOpenCase,
  onResolveFlag,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { startNewCase } = useCaseWizard();

  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCases = useCallback(async () => {
    try {
      const data = await casesApi.getCases();
      const pending = offlineStorage.getPendingUploads();
      const serverList = Array.isArray(data) ? data : [];
      const serverIds = new Set(serverList.map(c => c.id));
      const merged = [
        ...pending.filter(p => !serverIds.has(p.id)),
        ...serverList,
      ];
      setCases(merged);
    } catch (_err) {
      // Load offline pending drafts
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

  const handleCreateNew = () => {
    startNewCase();
    onStartNewCase();
  };

  // Filter cases
  const filteredCases = cases.filter(item => {
    const matchesSearch =
      !searchQuery ||
      item.roNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.concernTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'flagged') return item.status === 'Flagged';
    if (activeTab === 'awaiting') return item.status === 'Awaiting Review';
    if (activeTab === 'submitted') return item.status === 'Submitted';
    if (activeTab === 'drafts') return item.status === 'Draft' || item.status === 'Uploading';
    return true;
  });

  const flaggedCount = cases.filter(c => c.status === 'Flagged').length;
  const awaitingCount = cases.filter(c => c.status === 'Awaiting Review').length;
  const submittedCount = cases.filter(c => c.status === 'Submitted').length;

  const tabs: TabItem[] = [
    { key: 'all', label: 'All Cases', count: cases.length },
    { key: 'flagged', label: 'Flagged', count: flaggedCount },
    { key: 'awaiting', label: 'Awaiting Review', count: awaitingCount },
    { key: 'submitted', label: 'Submitted', count: submittedCount },
  ];

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'Submitted':
        return <Badge label="Submitted" variant="success" size="sm" />;
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

  return (
    <View style={styles.container}>
      {/* App Header */}
      <Header
        title="Warranty Evidence"
        subtitle={`Technician: ${user?.name || 'Workshop'}`}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onLogout}
            style={styles.logoutBtn}
          >
            <Icon name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      {/* Flagged Attention Banner if any */}
      {flaggedCount > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('flagged')}
          style={styles.flagBanner}
        >
          <Icon name="flag" size={18} color={colors.flagged} />
          <View style={styles.flagBannerText}>
            <Text style={styles.flagBannerTitle}>
              {flaggedCount} Case{flaggedCount > 1 ? 's' : ''} Flagged by Warranty Clerk
            </Text>
            <Text style={styles.flagBannerDesc}>
              Tap to view missing shots and re-submit.
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

      {/* Case List */}
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={colors.surfaceElevated} />
            <Text style={styles.emptyTitle}>No Warranty Cases Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap below to start a new technician evidence capture ticket.
            </Text>
            <Button
              title="Start New Case"
              variant="primary"
              onPress={handleCreateNew}
              leftIcon={<Icon name="plus" size={18} color={colors.textPrimary} />}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        }
        renderItem={({ item }) => {
          const isFlagged = item.status === 'Flagged';
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (isFlagged ? onResolveFlag(item) : onOpenCase(item))}
              style={[
                styles.caseCard,
                isFlagged && styles.caseCardFlagged,
              ]}
            >
              {/* Top Row: RO Number + Status Badge */}
              <View style={styles.cardHeader}>
                <View style={styles.roGroup}>
                  <Text style={styles.roText}>{item.roNumber || 'NO RO'}</Text>
                  <Badge label={item.brandName || item.make || 'OEM'} variant="outline" size="sm" />
                </View>
                {getStatusBadge(item.status)}
              </View>

              {/* Concern Title */}
              <Text style={styles.concernTitle} numberOfLines={2}>
                {item.concernTitle || item.faultCategory || 'Warranty inspection and diagnosis'}
              </Text>

              {/* Vehicle Identity Strip */}
              <View style={styles.vehicleStrip}>
                <View style={styles.vehicleDetail}>
                  <Icon name="car" size={14} color={colors.textSecondary} />
                  <Text style={styles.vehicleText}>
                    {item.year || ''} {item.make} {item.model || ''}
                  </Text>
                </View>

                {item.vin ? (
                  <Text style={styles.vinText}>
                    VIN: ...{item.vin.slice(-8)}
                  </Text>
                ) : null}
              </View>

              {/* Bottom Metadata & Gate Progress */}
              <View style={styles.cardFooter}>
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

      {/* Floating "+ New Warranty Case" Button */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title="+ New Warranty Case"
          variant="primary"
          size="huge"
          onPress={handleCreateNew}
          leftIcon={<Icon name="plus" size={22} color={colors.textPrimary} />}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.flaggedLight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(225, 31, 38, 0.25)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    height: 42,
    gap: spacing.sm,
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
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  caseCardFlagged: {
    borderColor: colors.flagged,
    backgroundColor: colors.surfaceHighlight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  concernTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  vehicleStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.md,
  },
  vehicleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  vinText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  evidenceCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceCountText: {
    fontSize: typography.sizes.xs,
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
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
