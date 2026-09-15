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

  /* -- Initial load: all sites + all brands -- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, b] = await Promise.all([sitesApi.getSites(), brandsApi.getBrands()]);
        const siteList = s || MOCK_SITES;
        const brandList = b || MOCK_BRANDS;
        setSites(siteList);
        setAllBrands(brandList);

        // Auto-select first site if none chosen
        if (siteList.length > 0 && !siteId) {
          const firstSite = siteList[0];
          setSite(firstSite);
          // Pull authorized brand IDs for the default site
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
          setSite(MOCK_SITES[0]);
          setSiteAuthorizedIds(MOCK_SITES[0].authorizedBrands ?? []);
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
    if (!siteId || siteAuthorizedIds === null) return allBrands;
    return allBrands.filter((b) => siteAuthorizedIds.includes(b.id));
  }, [allBrands, siteAuthorizedIds, siteId]);

  const isValidRo = roNumber.trim().length >= 3;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.introHeader}>
        <Text style={styles.sectionTitle}>Step 0 â€” Start Warranty Ticket</Text>
        <Text style={styles.sectionDesc}>
          Select dealership rooftop and OEM brand to initialize the live compliance rules engine.
        </Text>
      </View>

      {/* Site Selection */}
      <Card title="1. Dealership Rooftop Site">
        <Text style={styles.subtext}>Select the rooftop where this repair is being performed:</Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
        ) : (
          <View style={styles.chipsContainer}>
            {sites.map((s) => {
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

      {/* Brand Selection â€” filtered by selected site */}
      <Card title="2. OEM Vehicle Brand">
        {!siteId ? (
          <Text style={styles.subtext}>Select a rooftop above to see its authorized brands.</Text>
        ) : brandLoading ? (
          <View style={styles.brandLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.subtext, { marginLeft: 8 }]}>Loading authorized brandsâ€¦</Text>
          </View>
        ) : availableBrands.length === 0 ? (
          <Text style={styles.subtext}>No brands are linked to this site yet. Contact your admin.</Text>
        ) : (
          <>
            <Text style={styles.subtext}>
              Showing {availableBrands.length} brand{availableBrands.length !== 1 ? 's' : ''} authorized for this rooftop:
            </Text>
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
                    {b.id === 'brand_byd' && (
                      <Badge label="Attachment A" variant="success" size="sm" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {/* RO & Claim */}
      <Card title="3. Repair Order & Claim Key">
        <Input
          label="Repair Order (RO) Number"
          required
          placeholder="e.g. CR-21693"
          value={roNumber}
          onChangeText={setRoNumber}
          leftIcon="barcode"
          autoCapitalize="characters"
          sublabel="Master key for attachment naming"
          error={!isValidRo && roNumber ? 'RO number is required (min 3 chars)' : undefined}
        />
        <Input
          label="OEM Claim Number (Optional)"
          placeholder="Leave blank for warranty clerk if not issued yet"
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
          title="Next: Vehicle ID"
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


