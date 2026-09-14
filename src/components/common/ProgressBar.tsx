import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Badge } from './Badge';

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  stepTitles?: string[];
  mandatoryRemaining?: number;
  completedCount?: number;
  totalMandatory?: number;
}

const defaultStepTitles = [
  'Ticket Start',
  'Vehicle ID',
  'Fault & Concern',
  'Tier 1 Evidence',
  'Tier 2 Extras',
  'Voice Notes',
  'Review & Submit',
];

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps = 7,
  stepTitles = defaultStepTitles,
  mandatoryRemaining = 0,
  completedCount = 0,
  totalMandatory = 0,
}) => {
  const progressPercent = Math.min(100, Math.max(0, ((currentStep + 1) / totalSteps) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <View>
          <Text style={styles.stepLabel}>
            Step {currentStep + 1} of {totalSteps}:
          </Text>
          <Text style={styles.stepTitle}>
            {stepTitles[currentStep] || 'Guided Step'}
          </Text>
        </View>

        {totalMandatory > 0 && (
          <Badge
            label={`${completedCount}/${totalMandatory} Gates`}
            variant={mandatoryRemaining === 0 ? 'success' : 'primary'}
            size="sm"
          />
        )}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.stepDotsRow}>
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                isDone && styles.dotDone,
                isCurrent && styles.dotCurrent,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepLabel: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  track: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.full,
  },
  stepDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
    width: 14,
    borderRadius: 3,
  },
});
