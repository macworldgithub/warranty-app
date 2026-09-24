import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
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

  // Pulse animation for the submit overlay
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    if (!submitting) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [submitting]);

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
    <>
      {/* Full-screen submitting overlay */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.submittingOverlay}>
          <View style={styles.submittingCard}>
            <Animated.View style={[styles.submittingIconRing, { transform: [{ scale: pulseAnim }] }]}>
              <ActivityIndicator size="large" color="#D71920" />
            </Animated.View>
            <Text style={styles.submittingTitle}>Submitting Warranty Pack…</Text>
            <Text style={styles.submittingSubtitle}>
              Uploading evidence and locking case file.{"\n"}Please don't close the app.
            </Text>
            <View style={styles.submittingDotsRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.submittingDot} />
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.introHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Review & Submit</Text>
          <Badge
            label={missingRules.length === 0 ? 'All Evidence Attached' : `${missingRules.length} Optional Pending`}
            variant={missingRules.length === 0 ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
        <Text style={styles.sectionDesc}>
          Review case summary before submitting.
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
        title="Vehicle & Ticket Summary"
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
            <Text style={styles.metaLabel}>BRAND</Text>
            <Text style={styles.metaValue}>{brandName}</Text>
          </View>
          <View style={styles.metaItemFull}>
            <Text style={styles.metaLabel}>VEHICLE</Text>
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
            <Text style={styles.metaLabel}>SITE</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {siteName}
            </Text>
          </View>
        </View>
      </Card>

      {/* 2. Concern Summary */}
      <Card
        title="Concern"
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

      {/* 3. Evidence Checklist */}
      <Card
        title={`Evidence Items (${evidenceItems.length}/${resolvedRules.length})`}
      >
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
                    color={isPresent ? colors.success : colors.textSecondary}
                  />
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{rule.name}</Text>
                </View>

                <Badge
                  label={isPresent ? 'Ready' : 'Optional'}
                  variant={isPresent ? 'success' : 'neutral'}
                  size="sm"
                />
              </View>
            );
          })}
        </View>
      </Card>

      {/* 4. Voice to Tech Summary */}
      <Card
        title={`Voice Notes (${voiceNotes.length})`}
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
          <Text style={styles.noNotesText}>No voice notes recorded.</Text>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionBlock}>
        <Button
          title={
            isOnline
              ? 'Submit Warranty Case'
              : 'Save & Queue for Upload'
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
    </>
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
  // Submitting overlay
  submittingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  submittingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
    gap: 8,
  },
  submittingIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(215, 25, 32, 0.15)',
  },
  submittingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  submittingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  submittingDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  submittingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D71920',
    opacity: 0.35,
  },
});

