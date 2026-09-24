import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { useAuth } from '../../context/AuthContext';
import { sitesApi } from '../../api/sites.api';
import { brandsApi } from '../../api/brands.api';
import { Site, Brand } from '../../types';

interface Step0Props {
  onNext: () => void;
  onCancel: () => void;
}

/* -- Mock fallback data (dev only) -- */
const MOCK_SITES: Site[] = [
  { id: 'site_cranbourne_byd', name: 'Booran BYD Cranbourne', code: 'CRANBOURNE_BYD', authorizedBrands: ['brand_byd'] },
  { id: 'site_dandenong_multi', name: 'Booran Dandenong Multi', code: 'DANDENONG_MULTI', authorizedBrands: ['brand_hyundai', 'brand_kia', 'brand_mitsubishi'] },
  { id: 'site_cheltenham_mg', name: 'Booran MG & Chery Cheltenham', code: 'CHELTENHAM_MG', authorizedBrands: ['brand_mg', 'brand_chery'] },
  { id: 'site_berwick_toyota_ford', name: 'Booran Berwick Commercials', code: 'BERWICK_COMMERCIALS', authorizedBrands: ['brand_toyota', 'brand_ford'] },
];
const MOCK_BRANDS: Brand[] = [
  { id: 'brand_byd', name: 'BYD' },
  { id: 'brand_hyundai', name: 'Hyundai' },
  { id: 'brand_kia', name: 'Kia' },
  { id: 'brand_mg', name: 'MG Motor' },
  { id: 'brand_chery', name: 'Chery' },
  { id: 'brand_toyota', name: 'Toyota' },
  { id: 'brand_ford', name: 'Ford' },
  { id: 'brand_mitsubishi', name: 'Mitsubishi' },
];

export const Step0_StartTicket: React.FC<Step0Props> = ({ onNext, onCancel }) => {
  const { user } = useAuth();
  const {
    siteId,
    siteName,
    brandId,
    brandName,
    roNumber,
    claimNumber,
    setSite,
    setBrand,
    setRoNumber,
    setClaimNumber,
  } = useCaseWizard();

  const [sites, setSites] = useState<Site[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandLoading, setBrandLoading] = useState(false);
  // authorizedBrandIds for the currently selected site (null = not yet loaded)
  const [siteAuthorizedIds, setSiteAuthorizedIds] = useState<string[] | null>(null);

  // Sites filtered to the technician's authorizedSiteIds
  const authorizedSites = useMemo(() => {
    const allowed = user?.authorizedSiteIds;
    if (!allowed || allowed.length === 0) return sites; // admin/no restriction: show all
    return sites.filter((s) => allowed.includes(s.id));
  }, [sites, user?.authorizedSiteIds]);

  // True when there is exactly one allowed rooftop (no picker needed)
  const singleSiteLocked = authorizedSites.length === 1;

  /* -- Initial load: all sites + all brands -- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, b] = await Promise.all([sitesApi.getSites(), brandsApi.getBrands()]);
        const siteList = s || MOCK_SITES;
        const brandList = b || MOCK_BRANDS;
        setSites(siteList);
        setAllBrands(brandList);

        // Determine allowed sites for this technician
        const allowed = user?.authorizedSiteIds;
        const allowedSites =
          allowed && allowed.length > 0
            ? siteList.filter((st) => allowed.includes(st.id))
            : siteList;

        // Auto-select first allowed site if none chosen
        if (allowedSites.length > 0 && !siteId) {
          const firstSite = allowedSites[0];
          setSite(firstSite);
          const authIds = firstSite.authorizedBrands ?? (firstSite as any).authorizedBrandIds ?? null;
          setSiteAuthorizedIds(authIds);
        } else if (siteId) {
          // Restore authorized IDs for already-selected site
          const current = siteList.find((s) => s.id === siteId);
          const authIds = current?.authorizedBrands ?? (current as any)?.authorizedBrandIds ?? null;
          setSiteAuthorizedIds(authIds);
        }
      } catch (err) {
        // Dev fallback
        setSites(MOCK_SITES);
        setAllBrands(MOCK_BRANDS);
        if (!siteId) {
          const allowed = user?.authorizedSiteIds;
          const fallbackSite =
            allowed && allowed.length > 0
              ? MOCK_SITES.find((s) => allowed.includes(s.id)) || MOCK_SITES[0]
              : MOCK_SITES[0];
          setSite(fallbackSite);
          setSiteAuthorizedIds(fallbackSite.authorizedBrands ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* -- When user selects a different site, fetch its authorized brands -- */
  const handleSiteSelect = async (site: Site) => {
    // Clear brand selection if it won't be valid for the new site
    setSite(site);
    setBrandLoading(true);
    setSiteAuthorizedIds(null); // trigger loading state
    setBrand({ id: '', name: '' }); // clear previous selection

    try {
      // Use local data if the site object already carries authorizedBrands
      const localIds = site.authorizedBrands ?? (site as any).authorizedBrandIds;
      if (localIds && localIds.length > 0) {
        setSiteAuthorizedIds(localIds);
      } else {
        // Fetch from API endpoint
        const { authorizedBrandIds } = await sitesApi.getSiteAuthorizedBrands(site.id);
        setSiteAuthorizedIds(authorizedBrandIds);
      }
    } catch {
      // Fallback: show all brands
      setSiteAuthorizedIds(null);
    } finally {
      setBrandLoading(false);
    }
  };

  /* -- Derived: brands that are authorized for the selected site -- */
  const availableBrands = useMemo(() => {
    if (!siteId) return allBrands;
    const currentSite = sites.find((s) => s.id === siteId);
    const authIds = siteAuthorizedIds ?? currentSite?.authorizedBrands ?? (currentSite as any)?.authorizedBrandIds;
    if (authIds && authIds.length > 0) {
      const filtered = allBrands.filter((b) => authIds.includes(b.id));
      if (filtered.length > 0) return filtered;
    }
    // Fallback: match by brand name in site name
    if (currentSite) {
      const siteLower = (currentSite.name || '').toLowerCase();
      const matched = allBrands.filter((b) => siteLower.includes((b.name || '').toLowerCase()));
      if (matched.length > 0) return matched;
    }
    return allBrands;
  }, [allBrands, siteAuthorizedIds, siteId, sites]);

  // Automatically select the brand if only 1 exists (e.g. BYD for Cranbourne) or if previous brand invalid
  useEffect(() => {
    if (availableBrands.length > 0) {
      const isValid = availableBrands.some((b) => b.id === brandId);
      if (!isValid) {
        setBrand(availableBrands[0]);
      }
    }
  }, [availableBrands, brandId]);

  const isValidRo = roNumber.trim().length >= 3;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.introHeader}>
        <Text style={styles.sectionTitle}>Start Warranty Ticket</Text>
      </View>

      <Card title="Dealership Site">

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
        ) : singleSiteLocked ? (
          // Single assigned rooftop — show as read-only locked badge
          <View style={styles.lockedSiteRow}>
            <Icon name="shield" size={16} color={colors.primary} />
            <Text style={styles.lockedSiteText}>{authorizedSites[0].name}</Text>
            <Badge label="Your Rooftop" variant="success" size="sm" />
          </View>
        ) : (
          <View style={styles.chipsContainer}>
            {authorizedSites.map((s) => {
              const isSelected = s.id === siteId;
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.75}
                  onPress={() => handleSiteSelect(s)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Icon name="shield" size={14} color={isSelected ? colors.primaryLight : colors.textSecondary} />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Card>

      {/* Brand Selection - filtered by selected site */}
      <Card title="Vehicle Brand">
        {!siteId ? (
          <Text style={styles.subtext}>Select a dealership site above.</Text>
        ) : brandLoading ? (
          <View style={styles.brandLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.subtext, { marginLeft: 8 }]}>Loading brands...</Text>
          </View>
        ) : availableBrands.length === 0 ? (
          <Text style={styles.subtext}>No brands linked to this site.</Text>
        ) : (
          <>
            <View style={styles.chipsGrid}>
              {availableBrands.map((b) => {
                const isSelected = b.id === brandId;
                return (
                  <TouchableOpacity
                    key={b.id}
                    activeOpacity={0.75}
                    onPress={() => setBrand(b)}
                    style={[styles.brandChip, isSelected && styles.brandChipSelected]}
                  >
                    <Text style={[styles.brandChipText, isSelected && styles.brandChipTextSelected]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>

      <Card title="Repair Order">
        <Input
          label="Repair Order (RO) Number"
          required
          placeholder="e.g. CR-21693"
          value={roNumber}
          onChangeText={setRoNumber}
          leftIcon="barcode"
          autoCapitalize="characters"
          error={!isValidRo && roNumber ? 'RO number is required (min 3 chars)' : undefined}
        />
        <Input
          label="Claim Number (Optional)"
          placeholder="e.g. CLM-10294"
          value={claimNumber}
          onChangeText={setClaimNumber}
          leftIcon="file-text"
          autoCapitalize="characters"
        />
      </Card>

      {/* Actions */}
      <View style={styles.actionRow}>
        <Button title="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button
          title="Vehicle Info"
          variant="primary"
          disabled={!isValidRo || !siteId || !brandId}
          onPress={onNext}
          rightIcon={<Icon name="chevron-right" size={18} color={colors.textInverse} />}
          style={{ flex: 2 }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  introHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  subtext: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chipsContainer: {
    gap: spacing.sm,
  },
  lockedSiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  lockedSiteText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  brandChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  brandChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  brandChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  brandLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});


