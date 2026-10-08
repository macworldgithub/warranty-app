import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { EvidenceCard } from '../../components/evidence/EvidenceCard';
import { ManufacturerBulletins } from '../../components/evidence/ManufacturerBulletins';
import { GuidedZoneStepper } from '../../components/evidence/GuidedZoneStepper';
import { useCaseWizard } from '../../context/CaseWizardContext';

interface Step3Props {
  onNext: () => void;
  onPrev: () => void;
}

export const Step3_GuidedEvidence: React.FC<Step3Props> = ({ onNext, onPrev }) => {
  const {
    resolvedRules,
    evidenceItems,
    saveEvidenceItem,
    removeEvidenceItem,
    getEvidenceForRule,
    addVoiceNote,
    roNumber,
    brandName,
    brandId,
    activeBrandPack,
    isLoadingRules,
    isFlaggedMode,
    flaggedRuleKeys,
  } = useCaseWizard();

  // Filter Tier 1 rules (excluding initial VIN/Odo/Front from Step 1)
  const tier1Rules = resolvedRules.filter(
    r =>
      r.tier === 1 &&
      r.ruleKey !== 'vin_photo' &&
      r.ruleKey !== 'odometer_photo' &&
      r.ruleKey !== 'front_vehicle_photo'
  );

  // Check how many mandatory Tier 1 items are completed
  const mandatoryTier1 = tier1Rules.filter(r => r.isMandatory);
  const completedTier1 = mandatoryTier1.filter(r => {
    const ev = getEvidenceForRule(r.ruleKey);
    return !!ev?.fileUri || !!ev?.serverUrl;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.introHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Evidence Photos</Text>
          <Badge
            label={`${completedTier1.length} Captured`}
            variant={completedTier1.length > 0 ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
        <Text style={styles.sectionDesc}>Capture the evidence required for this manufacturer and repair.</Text>
      </View>

      <Card
        title={`${brandName || 'Selected manufacturer'} evidence path`}
        subtitle={
          activeBrandPack
            ? `${activeBrandPack.name} · Version ${activeBrandPack.version}`
            : 'Loading the manufacturer warranty requirements'
        }
        rightAction={
          isLoadingRules ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Badge label={`${tier1Rules.length} capture items`} variant="primary" size="sm" />
          )
        }
      >
        <Text style={styles.pathDescription}>
          These capture items come from the active {brandName || 'manufacturer'} warranty pack.
          Follow this path for the selected manufacturer’s warranty evidence.
        </Text>
      </Card>

      {/* Flagged Mode Alert */}
      <ManufacturerBulletins key={brandId} brandId={brandId || undefined} brandName={brandName} />
      {isFlaggedMode && (
        <View style={styles.flagBanner}>
          <Icon name="flag" size={18} color={colors.flagged} />
          <Text style={styles.flagBannerText}>
            Highlighting items requested for re-capture by the warranty clerk.
          </Text>
        </View>
      )}

      {/* Use the legacy generic path only while no manufacturer rules are available. */}
      {!isLoadingRules && resolvedRules.length === 0 && (
        <GuidedZoneStepper
          evidenceItems={evidenceItems}
          onSaveEvidence={saveEvidenceItem}
          onRemoveEvidence={removeEvidenceItem}
          roNumber={roNumber}
        />
      )}

      {/* Dynamic Evidence Cards */}
      {tier1Rules.map(rule => {
        const evidence = getEvidenceForRule(rule.ruleKey);
        const isFlagged = isFlaggedMode && flaggedRuleKeys.includes(rule.ruleKey);

        return (
          <EvidenceCard
            key={rule.id || rule.ruleKey}
            rule={rule}
            evidence={evidence}
            roNumber={roNumber}
            isFlagged={isFlagged}
            onSaveEvidence={saveEvidenceItem}
            onRemoveEvidence={removeEvidenceItem}
            onAddVoiceNote={addVoiceNote}
          />
        );
      })}

      {!isLoadingRules && resolvedRules.length > 0 && tier1Rules.length === 0 && (
        <Card title="No additional capture items">
          <Text style={styles.pathDescription}>
            The selected manufacturer pack has no Tier 1 evidence items for this repair.
            Continue to review the other required evidence sections.
          </Text>
        </Card>
      )}

      {/* Nav Row */}
      <View style={styles.navRow}>
        <Button
          title="Back"
          variant="secondary"
          onPress={onPrev}
          leftIcon={<Icon name="chevron-left" size={18} color={colors.textPrimary} />}
          style={{ flex: 1 }}
        />
        <Button
          title="Component Photos"
          variant="primary"
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pathDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.flaggedLight,
    borderWidth: 1,
    borderColor: colors.flagged,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  flagBannerText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

