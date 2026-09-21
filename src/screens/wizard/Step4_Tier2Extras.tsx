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
import { Card } from '../../components/common/Card';
import { EvidenceCard } from '../../components/evidence/EvidenceCard';
import { useCaseWizard } from '../../context/CaseWizardContext';

interface Step4Props {
  onNext: () => void;
  onPrev: () => void;
}

export const Step4_Tier2Extras: React.FC<Step4Props> = ({ onNext, onPrev }) => {
  const {
    resolvedRules,
    faultCategory,
    evidenceItems,
    saveEvidenceItem,
    removeEvidenceItem,
    getEvidenceForRule,
    addVoiceNote,
    roNumber,
    isFlaggedMode,
    flaggedRuleKeys,
  } = useCaseWizard();

  // Filter Tier 2 rules
  const tier2Rules = resolvedRules.filter(r => r.tier === 2);
  const mandatoryTier2 = tier2Rules.filter(r => r.isMandatory);
  const completedTier2 = mandatoryTier2.filter(r => {
    const ev = getEvidenceForRule(r.ruleKey);
    return !!ev?.fileUri || !!ev?.serverUrl;
  });

  const isTier2Complete = completedTier2.length === mandatoryTier2.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.introHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Component Photos</Text>
          <Badge
            label={
              tier2Rules.length > 0
                ? `${completedTier2.length} Captured`
                : 'None Required'
            }
            variant={completedTier2.length > 0 || tier2Rules.length === 0 ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
        <Text style={styles.sectionDesc}>
          Additional photos for "{faultCategory}" (optional).
        </Text>
      </View>

      {/* Tier 2 Rule Items */}
      {tier2Rules.length > 0 ? (
        tier2Rules.map(rule => {
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
        })
      ) : (
        /* Empty State when no Tier 2 is needed */
        <Card>
          <View style={styles.noExtrasBox}>
            <Icon name="check-circle" size={36} color={colors.success} />
            <Text style={styles.noExtrasTitle}>
              No Extra Photos Needed
            </Text>
            <Text style={styles.noExtrasDesc}>
              No additional component photos required for "{faultCategory}". You may proceed.
            </Text>
          </View>
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
          title="Voice Notes"
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
  noExtrasBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  noExtrasTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  noExtrasDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

