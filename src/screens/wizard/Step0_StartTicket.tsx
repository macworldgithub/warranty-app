import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, b] = await Promise.all([
          sitesApi.getSites(),
          brandsApi.getBrands(),
        ]);
        setSites(s || []);
        setBrands(b || []);

        if (s.length > 0 && !siteId) {
          setSite(s[0]);
        }
        if (b.length > 0 && !brandId) {
          setBrand(b[0]);
        }
      } catch (err) {
        // Mock fallback
        const mockSites: Site[] = [
          { id: 'site_cranbourne_byd', name: 'Booran BYD Cranbourne', code: 'CRANBOURNE_BYD' },
          { id: 'site_dandenong_multi', name: 'Booran Dandenong Multi', code: 'DANDENONG_MULTI' },
          { id: 'site_berwick_toyota_ford', name: 'Booran Berwick Commercials', code: 'BERWICK_COMMERCIALS' },
        ];
        const mockBrands: Brand[] = [
          { id: 'brand_byd', name: 'BYD' },
          { id: 'brand_hyundai', name: 'Hyundai' },
          { id: 'brand_kia', name: 'Kia' },
          { id: 'brand_mg', name: 'MG Motor' },
          { id: 'brand_toyota', name: 'Toyota' },
        ];
        setSites(mockSites);
        setBrands(mockBrands);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isValidRo = roNumber.trim().length >= 3;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.introHeader}>
        <Text style={styles.sectionTitle}>Step 0 · Start Warranty Ticket</Text>
        <Text style={styles.sectionDesc}>
          Select dealership rooftop and OEM brand to initialize the live compliance rules engine.
        </Text>
      </View>

      {/* Site Selection Card */}
      <Card title="1. Dealership Rooftop Site">
        <Text style={styles.subtext}>Technician home site defaults automatically:</Text>
        <View style={styles.chipsContainer}>
          {sites.map(s => {
            const isSelected = s.id === siteId;
            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.75}
                onPress={() => setSite(s)}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
              >
                <Icon
                  name="shield"
                  size={14}
                  color={isSelected ? colors.primaryLight : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Brand Selection Card */}
      <Card title="2. OEM Vehicle Brand">
        <Text style={styles.subtext}>
          Loads the active Brand Pack standard (BYD Attachment A / Multi-brand):
        </Text>
        <View style={styles.chipsGrid}>
          {brands.map(b => {
            const isSelected = b.id === brandId;
            return (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.75}
                onPress={() => setBrand(b)}
                style={[
                  styles.brandChip,
                  isSelected && styles.brandChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.brandChipText,
                    isSelected && styles.brandChipTextSelected,
                  ]}
                >
                  {b.name}
                </Text>
                {b.id === 'brand_byd' && (
                  <Badge label="Attachment A" variant="success" size="sm" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* RO & Claim Information */}
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
        <Button
          title="Cancel"
          variant="ghost"
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <Button
          title="Next: Vehicle ID"
          variant="primary"
          disabled={!isValidRo || !siteId || !brandId}
          onPress={onNext}
          rightIcon={<Icon name="chevron-right" size={18} color={colors.textPrimary} />}
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
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  chipTextSelected: {
    color: colors.primaryLight,
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
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  brandChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  brandChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  brandChipTextSelected: {
    color: colors.primaryLight,
    fontWeight: typography.weights.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
