import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EvidenceCard } from '../../components/evidence/EvidenceCard';
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

  const isTier1Complete = completedTier1.length === mandatoryTier1.length;

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
        <Text style={styles.sectionDesc}>
          Take photos or videos of the issue. All items are optional.
        </Text>
      </View>

      {/* Flagged Mode Alert */}
      {isFlaggedMode && (
        <View style={styles.flagBanner}>
          <Icon name="flag" size={18} color={colors.flagged} />
          <Text style={styles.flagBannerText}>
            Highlighting items requested for re-capture by the warranty clerk.
          </Text>
        </View>
      )}

      {/* Guided 10-Zone Capture Stepper */}
      <GuidedZoneStepper
        evidenceItems={evidenceItems}
        onSaveEvidence={saveEvidenceItem}
        onRemoveEvidence={removeEvidenceItem}
        roNumber={roNumber}
      />

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

