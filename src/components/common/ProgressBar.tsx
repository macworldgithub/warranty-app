import React, { useRef, useEffect } from 'react';
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
import { Icon } from './Icon';

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  stepTitles?: string[];
  stepShortLabels?: string[];
  mandatoryRemaining?: number;
  completedCount?: number;
  totalMandatory?: number;
  onStepPress?: (stepIndex: number) => void;
}

const defaultStepTitles = [
  'Start Ticket',
  'Vehicle Info',
  'Fault & Concern',
  'Evidence Photos',
  'Component Photos',
  'Voice Notes',
  'Review & Submit',
];

const defaultShortLabels = [
  'Ticket',
  'Vehicle',
  'Concern',
  'Evidence',
  'Extras',
  'Voice',
  'Review',
];

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps = 7,
  stepTitles = defaultStepTitles,
  stepShortLabels = defaultShortLabels,
  mandatoryRemaining,
  completedCount,
  totalMandatory,
  onStepPress,
}) => {
  const scrollViewRef = useRef<any>(null);

  // Auto-scroll stepper to keep current step visible
  useEffect(() => {
    if (scrollViewRef.current) {
      const targetX = Math.max(0, currentStep * 74 - 40);
      scrollViewRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [currentStep]);

  return (
    <View style={styles.container}>
      {/* Header Row matching screenshot */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Guided Wizard Steps</Text>
        <Text style={styles.headerCounter}>
          Step {currentStep + 1} of {totalSteps}
        </Text>
      </View>

      {/* Horizontal Stepper Row */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepperScrollContent}
      >
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          const label = stepShortLabels[idx] || `Step ${idx + 1}`;

          if (isActive) {
            return (
              <TouchableOpacity
                key={idx}
                style={styles.activeStepCard}
                onPress={() => onStepPress?.(idx)}
                activeOpacity={0.85}
              >
                <View style={styles.activeCircleBadge}>
                  <Text style={styles.activeCircleText}>{idx + 1}</Text>
                </View>
                <Text style={styles.activeStepLabel} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={idx}
              style={styles.inactiveStepItem}
              onPress={() => onStepPress?.(idx)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.inactiveCircleBadge,
                  isDone && styles.doneCircleBadge,
                ]}
              >
                {isDone ? (
                  <Icon name="check" size={13} color="#059669" />
                ) : (
                  <Text style={styles.inactiveCircleText}>{idx + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.inactiveStepLabel,
                  isDone && styles.doneStepLabel,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs + 2,
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  headerCounter: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  stepperScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  // Active Card (Red background with white circle badge and white text)
  activeStepCard: {
    backgroundColor: '#E11F26', // Booran Brand Red
    borderRadius: spacing.borderRadius.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11F26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  activeCircleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  activeCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  activeStepLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  // Inactive Steps (Subtle circular border with gray text)
  inactiveStepItem: {
    minWidth: 62,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveCircleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  inactiveCircleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  inactiveStepLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  // Completed Steps
  doneCircleBadge: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  doneStepLabel: {
    color: '#059669',
    fontWeight: typography.weights.semibold,
  },
});
