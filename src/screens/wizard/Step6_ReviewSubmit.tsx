import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { useNetwork } from '../../context/NetworkContext';
import { WarrantyCase } from '../../types';

interface Step6Props {
  onPrev: () => void;
  onSubmitSuccess: (submittedCase: WarrantyCase) => void;
  onJumpToStep: (step: number) => void;
}

export const Step6_ReviewSubmit: React.FC<Step6Props> = ({
  onPrev,
  onSubmitSuccess,
  onJumpToStep,
}) => {
  const {
    roNumber,
    siteName,
    brandName,
    vin,
    odometer,
    make,
    model,
    year,
    powertrain,
    concernTitle,
    faultCategory,
    resolvedRules,
    evidenceItems,
    voiceNotes,
    isReadyForSubmission,
    mandatoryCount,
    completedMandatoryCount,
    missingRules,
    submitCase,
    saveDraft,
  } = useCaseWizard();

  const { isOnline } = useNetwork();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const submitted = await submitCase();
      onSubmitSuccess(submitted);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Saved to offline queue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.introHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Step 6 Â· Review & Quality Gates</Text>
          <Badge
            label={missingRules.length === 0 ? 'All Evidence Captured' : `${missingRules.length} Optional Items Pending`}
            variant={missingRules.length === 0 ? 'success' : 'warning'}
            size="sm"
          />
        </View>
        <Text style={styles.sectionDesc}>
          Every required artefact is verified before the case pack leaves the workshop.
        </Text>
      </View>

      {/* Error Alert */}
      {submitError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}

      {/* 1. Header Identity Summary */}
      <Card
        title="Vehicle & Ticket Identity"
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onJumpToStep(0)}
            style={styles.editStepBtn}
          >
            <Text style={styles.editStepText}>Edit</Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>REPAIR ORDER</Text>
            <Text style={styles.metaValue}>{roNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>OEM BRAND</Text>
            <Text style={styles.metaValue}>{brandName}</Text>
          </View>
          <View style={styles.metaItemFull}>
            <Text style={styles.metaLabel}>VEHICLE SPEC</Text>
            <Text style={styles.metaValue}>
              {year} {make} {model} ({powertrain})
            </Text>
          </View>
          <View style={styles.metaItemFull}>
            <Text style={styles.metaLabel}>VIN</Text>
            <Text style={styles.vinText}>{vin}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ODOMETER</Text>
            <Text style={styles.metaValue}>
              {odometer ? `${odometer.toLocaleString()} km` : 'N/A'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ROOFTOP SITE</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {siteName}
            </Text>
          </View>
        </View>
      </Card>

      {/* 2. Concern Summary */}
      <Card
        title="Concern & Classification"
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onJumpToStep(2)}
            style={styles.editStepBtn}
          >
            <Text style={styles.editStepText}>Edit</Text>
          </TouchableOpacity>
        }
      >
        <Text style={styles.concernText}>"{concernTitle}"</Text>
        <View style={styles.badgeRow}>
          <Badge label={faultCategory} variant="neutral" size="sm" />
        </View>
      </Card>

      {/* 3. Mandatory Compliance Checklist */}
      <Card
        title={`OEM Compliance Checklist (${completedMandatoryCount}/${mandatoryCount})`}
      >
        <Text style={styles.checklistDesc}>
          Auto-named per Brand Pack template upon submission:
        </Text>

        <View style={styles.checklist}>
          {resolvedRules.map((rule, idx) => {
            const ev = evidenceItems.find(e => e.ruleKey === rule.ruleKey);
            const isPresent = !!ev?.fileUri || !!ev?.serverUrl;

            return (
              <View
                key={rule.id || rule.ruleKey}
                style={[
                  styles.checklistItem,
                  isPresent ? styles.itemPass : styles.itemFail,
                ]}
              >
                <View
                  style={[
                    styles.checkCircle,
                    isPresent ? styles.circlePass : styles.circleFail,
                  ]}
                >
                  <Icon
                    name={isPresent ? 'check' : 'close'}
                    size={14}
                    color={isPresent ? colors.success : colors.danger}
                  />
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{rule.name}</Text>
                  <Text style={styles.itemFilename}>
                    {ev?.oemFileName || rule.namingConvention.replace('[DealerRONumber]', roNumber)}
                  </Text>
                </View>

                <Badge
                  label={isPresent ? 'Ready' : 'Missing'}
                  variant={isPresent ? 'success' : 'danger'}
                  size="sm"
                />
              </View>
            );
          })}
        </View>
      </Card>

      {/* 4. Voice to Tech Summary */}
      <Card
        title={`Voice Notes Attached (${voiceNotes.length})`}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onJumpToStep(5)}
            style={styles.editStepBtn}
          >
            <Text style={styles.editStepText}>Edit</Text>
          </TouchableOpacity>
        }
      >
        {voiceNotes.length > 0 ? (
          voiceNotes.map(n => (
            <View key={n.id} style={styles.voiceNoteSummary}>
              <Icon name="mic" size={14} color={colors.primary} />
              <Text style={styles.voiceNoteSummaryText} numberOfLines={2}>
                "{n.transcript}"
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noNotesText}>No voice notes dictated.</Text>
        )}
      </Card>

      {/* Missing Items Alert - soft warning, does not block submission */}
      {missingRules.length > 0 && (
        <View style={[styles.gateAlert, { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
          <Icon name="alert-circle" size={20} color={colors.warning} />
          <View style={styles.gateAlertText}>
            <Text style={[styles.gateAlertTitle, { color: colors.warning }]}>
              {missingRules.length} Recommended Items Not Captured:
            </Text>
            {missingRules.map((r, i) => (
              <Text key={i} style={styles.missingItemName}>
                {'\u2022'} {r.name}
              </Text>
            ))}
            <Text style={[styles.missingItemName, { marginTop: 6, fontStyle: 'italic' }]}>
              You can still submit {'\u2014'} these items are recommended but not required.
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionBlock}>
        <Button
          title={
            isOnline
              ? 'Submit Complete Case to Review Portal'
              : 'Save & Queue for Background Upload'
          }
          variant="primary"
          size="huge"
          loading={submitting}
          disabled={submitting}
          onPress={handleSubmit}
          leftIcon={<Icon name="check-circle" size={22} color={colors.textInverse} />}
          fullWidth
        />

        <View style={styles.secondaryActionsRow}>
          <Button
            title="Back to Notes"
            variant="secondary"
            size="md"
            onPress={onPrev}
            style={{ flex: 1 }}
          />
          <Button
            title="Save Local Draft"
            variant="outline"
            size="md"
            onPress={() => {
              saveDraft();
              Alert.alert('Draft Saved', 'Your warranty ticket draft has been saved locally on this device.');
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: 80,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    flex: 1,
    fontWeight: typography.weights.medium,
  },
  editStepBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  editStepText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    width: '47%',
  },
  metaItemFull: {
    width: '100%',
  },
  metaLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  vinText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
  },
  concernText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  checklistDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  checklist: {
    gap: spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
  },
  itemPass: {
    borderColor: colors.border,
  },
  itemFail: {
    borderColor: 'rgba(220, 38, 38, 0.3)',
    backgroundColor: colors.dangerLight,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  circlePass: {
    backgroundColor: colors.successLight,
  },
  circleFail: {
    backgroundColor: colors.dangerLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  itemFilename: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginTop: 1,
  },
  voiceNoteSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  voiceNoteSummaryText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    flex: 1,
    fontStyle: 'italic',
  },
  noNotesText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  gateAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  gateAlertText: {
    flex: 1,
  },
  gateAlertTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.danger,
    marginBottom: 4,
  },
  missingItemName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionBlock: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

