import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Header } from '../../components/common/Header';
import { EvidenceCard } from '../../components/evidence/EvidenceCard';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { WarrantyCase, BrandPackRule } from '../../types';

interface FlagResolutionScreenProps {
  caseItem: WarrantyCase;
  onBack: () => void;
  onSubmitSuccess: (caseItem: WarrantyCase) => void;
}

export const FlagResolutionScreen: React.FC<FlagResolutionScreenProps> = ({
  caseItem,
  onBack,
  onSubmitSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const {
    resolvedRules,
    evidenceItems,
    saveEvidenceItem,
    removeEvidenceItem,
    getEvidenceForRule,
    addVoiceNote,
    submitCase,
    roNumber,
  } = useCaseWizard();

  const [submitting, setSubmitting] = useState(false);

  // Extract flagged history items
  const activeFlags = caseItem.flagHistory?.filter(f => !f.isResolved) || [];
  const flaggedRuleKeys = activeFlags.map(f => f.ruleKey).filter(Boolean) as string[];

  const flaggedRules = resolvedRules.filter(
    r => flaggedRuleKeys.includes(r.ruleKey) || flaggedRuleKeys.length === 0
  );

  const handleResubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitCase();
      onSubmitSuccess(res);
    } catch (err: any) {
      Alert.alert('Resubmission Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Resolve Clerk Flags"
        subtitle={`RO: ${caseItem.roNumber} Â· ${caseItem.brandName || 'OEM'}`}
        roNumber={caseItem.roNumber}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Flag Reason Banner */}
        <View style={styles.flagHeaderCard}>
          <View style={styles.flagTitleRow}>
            <Icon name="flag" size={20} color={colors.flagged} />
            <Text style={styles.flagTitle}>
              Warranty Clerk Flagged {activeFlags.length || 1} Item(s)
            </Text>
          </View>
          <Text style={styles.flagInstruction}>
            {caseItem.clerkNotes || 'Please capture the missing or rejected evidence items below to complete the pack.'}
          </Text>
        </View>

        {/* Flagged Rules for Re-Capture */}
        <Text style={styles.sectionHeading}>FLAGGED EVIDENCE ITEMS TO RE-CAPTURE:</Text>

        {(flaggedRules.length > 0 ? flaggedRules : resolvedRules.slice(0, 3)).map(rule => {
          const evidence = getEvidenceForRule(rule.ruleKey);
          const flagInfo = activeFlags.find(f => f.ruleKey === rule.ruleKey);

          return (
            <EvidenceCard
              key={rule.id || rule.ruleKey}
              rule={rule}
              evidence={evidence}
              roNumber={roNumber}
              isFlagged={true}
              flagInstruction={flagInfo?.instruction}
              onSaveEvidence={saveEvidenceItem}
              onRemoveEvidence={removeEvidenceItem}
              onAddVoiceNote={addVoiceNote}
            />
          );
        })}
      </ScrollView>

      {/* Bottom Resubmit Action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title="Re-Submit Resolved Pack to Clerk"
          variant="primary"
          size="huge"
          loading={submitting}
          onPress={handleResubmit}
          leftIcon={<Icon name="check-circle" size={20} color={colors.textInverse} />}
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
  content: {
    padding: spacing.lg,
  },
  flagHeaderCard: {
    backgroundColor: colors.flaggedLight,
    borderColor: 'rgba(225, 31, 38, 0.25)',
    borderWidth: 1,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  flagTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  flagTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.flagged,
  },
  flagInstruction: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});

