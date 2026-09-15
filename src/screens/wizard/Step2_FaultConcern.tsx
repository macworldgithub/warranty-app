import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { VoiceToTechButton } from '../../components/voice/VoiceToTechButton';
import { scanbotService } from '../../services/scanbot.service';
import { RepairStage } from '../../types';

interface Step2Props {
  onNext: () => void;
  onPrev: () => void;
}

const FAULT_CATEGORIES = [
  { id: 'oil_leak', label: 'Oil leaks or seepage' },
  { id: 'ecu_sensor', label: 'ECU or sensor internal faults' },
  { id: 'software', label: 'Software updates or program refreshes' },
  { id: 'hv_battery', label: 'Battery and high-voltage (HV) components' },
  { id: 'charging', label: 'Charging system faults' },
  { id: 'powertrain_chassis', label: 'Powertrain, chassis or body component faults' },
  { id: 'general', label: 'General / other (Tier 1 only)' },
];

const REPAIR_STAGES: RepairStage[] = [
  'Pre-repair only',
  'During repair',
  'Repair complete',
];

export const Step2_FaultConcern: React.FC<Step2Props> = ({ onNext, onPrev }) => {
  const {
    concernTitle,
    faultCategory,
    partReplaced,
    oldPartSerial,
    newPartSerial,
    noiseFault,
    diagnosticsAvailable,
    repairStage,
    setConcernTitle,
    setFaultCategory,
    setPartReplaced,
    setOldPartSerial,
    setNewPartSerial,
    setNoiseFault,
    setDiagnosticsAvailable,
    setRepairStage,
    evaluateRules,
    resolvedRules,
    mandatoryCount,
  } = useCaseWizard();

  const [isScanningPart, setIsScanningPart] = useState<'old' | 'new' | null>(null);

  const handleScanPart = async (type: 'old' | 'new') => {
    setIsScanningPart(type);
    try {
      const prompt =
        type === 'new'
          ? 'Align NEW replacement part barcode / QR within bracket'
          : 'Align OLD defective part barcode / QR within bracket';

      const result = await scanbotService.scanPartBarcode(prompt);
      setIsScanningPart(null);

      if (result.success && result.serial) {
        if (type === 'new') {
          if (oldPartSerial && result.serial === oldPartSerial.trim().toUpperCase()) {
            Alert.alert(
              'Quality Gate Warning',
              'The scanned new part serial is identical to the old defective part serial. Please verify you scanned the new replacement component.'
            );
          }
          setNewPartSerial(result.serial);
        } else {
          setOldPartSerial(result.serial);
        }
      } else if (result.error && !result.error.includes('cancelled')) {
        Alert.alert('Scan Result', result.error);
      }
    } catch (err: any) {
      setIsScanningPart(null);
      Alert.alert(
        'Scanner Notice',
        'Could not open part scanner. You can enter the serial number manually.'
      );
    }
  };

  const handleCategorySelect = (cat: string) => {
    setFaultCategory(cat);
    evaluateRules();
  };

  const handleTogglePartReplaced = (val: boolean) => {
    setPartReplaced(val);
    evaluateRules();
  };

  const handleToggleNoise = (val: boolean) => {
    setNoiseFault(val);
    evaluateRules();
  };

  const handleToggleDiagnostics = (val: boolean) => {
    setDiagnosticsAvailable(val);
    evaluateRules();
  };

  const handleStageSelect = (stage: RepairStage) => {
    setRepairStage(stage);
    evaluateRules();
  };

  const isValidConcern = concernTitle.trim().length >= 3;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.introHeader}>
        <Text style={styles.sectionTitle}>Step 2 · Concern & Fault Classification</Text>
        <Text style={styles.sectionDesc}>
          Answers configure dynamic Brand Pack evidence gates (serials, video, DTCs, Tier 2 extras).
        </Text>
      </View>

      {/* Concern Description */}
      <Card title="1. Customer / Workshop Concern">
        <Input
          label="Concern Title"
          required
          placeholder="e.g. High-voltage battery cooling loop moisture detected on cluster"
          value={concernTitle}
          onChangeText={setConcernTitle}
          leftIcon="file-text"
          multiline
        />

        <VoiceToTechButton
          promptSuggestion="Dictate technician diagnosis / customer concern..."
          onTranscriptReady={note => {
            setConcernTitle(note.transcript);
          }}
        />
      </Card>

      {/* Fault Category Tree */}
      <Card title="2. OEM Fault Category">
        <Text style={styles.subtext}>
          Selecting a category recalculates required Tier 2 shots:
        </Text>

        <View style={styles.categoryList}>
          {FAULT_CATEGORIES.map(cat => {
            const isSelected = faultCategory === cat.label;
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.75}
                onPress={() => handleCategorySelect(cat.label)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
              >
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Conditional Gate Questions */}
      <Card title="3. Conditional Evidence Gates">
        {/* Part Replaced Question */}
        <View style={styles.questionBlock}>
          <View style={styles.questionRow}>
            <View style={styles.questionTextContainer}>
              <Text style={styles.questionTitle}>Part Being Replaced?</Text>
              <Text style={styles.questionDesc}>
                Enforces Old & New Part Serial capture + barcode check.
              </Text>
            </View>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleTogglePartReplaced(true)}
                style={[styles.toggleBtn, partReplaced && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, partReplaced && styles.toggleTextActive]}>
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleTogglePartReplaced(false)}
                style={[styles.toggleBtn, !partReplaced && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, !partReplaced && styles.toggleTextActive]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Serials Sub-section when Yes */}
          {partReplaced && (
            <View style={styles.serialsBox}>
              <View style={styles.serialInputRow}>
                <Input
                  label="Old Defective Part Serial"
                  placeholder="Scan or type old serial"
                  value={oldPartSerial}
                  onChangeText={setOldPartSerial}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <Button
                  title={isScanningPart === 'old' ? 'Scanning...' : 'Scan'}
                  variant="secondary"
                  size="md"
                  disabled={isScanningPart !== null}
                  leftIcon={<Icon name="barcode" size={16} color={colors.primaryLight} />}
                  onPress={() => handleScanPart('old')}
                  style={{ alignSelf: 'flex-end', height: 48 }}
                />
              </View>

              <View style={[styles.serialInputRow, { marginTop: spacing.sm }]}>
                <Input
                  label="New Replacement Part Serial"
                  placeholder="Scan or type new serial"
                  value={newPartSerial}
                  onChangeText={setNewPartSerial}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <Button
                  title={isScanningPart === 'new' ? 'Scanning...' : 'Scan'}
                  variant="secondary"
                  size="md"
                  disabled={isScanningPart !== null}
                  leftIcon={<Icon name="barcode" size={16} color={colors.primaryLight} />}
                  onPress={() => handleScanPart('new')}
                  style={{ alignSelf: 'flex-end', height: 48 }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Noise Fault Question */}
        <View style={styles.questionBlock}>
          <View style={styles.questionRow}>
            <View style={styles.questionTextContainer}>
              <Text style={styles.questionTitle}>Noise or Operational Fault?</Text>
              <Text style={styles.questionDesc}>
                Enforces MP4 fault video recording with workshop audio.
              </Text>
            </View>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleToggleNoise(true)}
                style={[styles.toggleBtn, noiseFault && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, noiseFault && styles.toggleTextActive]}>
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleToggleNoise(false)}
                style={[styles.toggleBtn, !noiseFault && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, !noiseFault && styles.toggleTextActive]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Diagnostics Question */}
        <View style={styles.questionBlock}>
          <View style={styles.questionRow}>
            <View style={styles.questionTextContainer}>
              <Text style={styles.questionTitle}>Diagnostic Data Available?</Text>
              <Text style={styles.questionDesc}>
                Enforces VDS scanner / DTC screen screenshot capture.
              </Text>
            </View>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleToggleDiagnostics(true)}
                style={[styles.toggleBtn, diagnosticsAvailable && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, diagnosticsAvailable && styles.toggleTextActive]}>
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleToggleDiagnostics(false)}
                style={[styles.toggleBtn, !diagnosticsAvailable && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, !diagnosticsAvailable && styles.toggleTextActive]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Repair Stage */}
        <View style={styles.stageSection}>
          <Text style={styles.stageTitle}>Current Repair Stage:</Text>
          <View style={styles.stageChipsRow}>
            {REPAIR_STAGES.map(stage => {
              const isSelected = repairStage === stage;
              return (
                <TouchableOpacity
                  key={stage}
                  activeOpacity={0.75}
                  onPress={() => handleStageSelect(stage)}
                  style={[
                    styles.stageChip,
                    isSelected && styles.stageChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.stageChipText,
                      isSelected && styles.stageChipTextSelected,
                    ]}
                  >
                    {stage}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Card>

      {/* Dynamic Rule Summary Pill */}
      <View style={styles.summaryBar}>
        <Icon name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.summaryText}>
          Rules Evaluated: {resolvedRules.length} Total ({mandatoryCount} Mandatory Gates)
        </Text>
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <Button
          title="Back"
          variant="secondary"
          onPress={onPrev}
          leftIcon={<Icon name="chevron-left" size={18} color={colors.textPrimary} />}
          style={{ flex: 1 }}
        />
        <Button
          title="Next: Tier 1 Evidence"
          variant="primary"
          disabled={!isValidConcern || !faultCategory}
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
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  subtext: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  categoryChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  categoryTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  questionBlock: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  questionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  questionDesc: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  serialsBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  serialInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  stageSection: {
    marginTop: spacing.md,
  },
  stageTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  stageChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stageChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  stageChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stageChipText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  stageChipTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryLight,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
