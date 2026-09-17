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
import { BarcodeScannerModal } from '../../components/evidence/BarcodeScannerModal';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { VoiceToTechButton } from '../../components/voice/VoiceToTechButton';
import { barcodeScannerService } from '../../services/barcodeScanner.service';
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

  const [scannerModalState, setScannerModalState] = useState<{
    open: boolean;
    type: 'old' | 'new';
  }>({ open: false, type: 'old' });

  const handleScanPart = (type: 'old' | 'new') => {
    setScannerModalState({ open: true, type });
  };

  const handlePartSerialScanned = (scannedSerial: string) => {
    const type = scannerModalState.type;
    const cleanSerial = scannedSerial.trim().toUpperCase();

    if (type === 'new') {
      if (oldPartSerial && cleanSerial === oldPartSerial.trim().toUpperCase()) {
        Alert.alert(
          'Quality Gate Warning',
          'The scanned new part serial is identical to the old defective part serial. Please verify you scanned the new replacement component.'
        );
      }
      setNewPartSerial(cleanSerial);
    } else {
      setOldPartSerial(cleanSerial);
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
        <Text style={styles.sectionTitle}>Concern & Fault</Text>
      </View>

      {/* Concern Description */}
      <Card title="Customer Concern">
        <Input
          label="Concern / Fault Description"
          required
          placeholder="e.g. AC not blowing cold air or battery error"
          value={concernTitle}
          onChangeText={setConcernTitle}
          leftIcon="file-text"
          multiline
        />

        <VoiceToTechButton
          promptSuggestion="Customer Concern & Diagnosis"
          onTranscriptReady={note => {
            setConcernTitle(note.transcript);
          }}
        />
      </Card>

      {/* Fault Category Tree */}
      <Card title="Fault Category">

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
      <Card title="Additional Details">
        {/* Part Replaced Question */}
        <View style={styles.questionBlock}>
          <View style={styles.questionRow}>
            <View style={styles.questionTextContainer}>
              <Text style={styles.questionTitle}>Part Being Replaced?</Text>
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
                  title="Scan"
                  variant="secondary"
                  size="md"
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
                  title="Scan"
                  variant="secondary"
                  size="md"
                  leftIcon={<Icon name="barcode" size={16} color={colors.primaryLight} />}
                  onPress={() => handleScanPart('new')}
                  style={{ alignSelf: 'flex-end', height: 48 }}
                />
              </View>
            </View>
          )}

          <BarcodeScannerModal
            visible={scannerModalState.open}
            title={
              scannerModalState.type === 'new'
                ? 'Scan NEW Replacement Part Serial'
                : 'Scan OLD Defective Part Serial'
            }
            isNewPart={scannerModalState.type === 'new'}
            oldSerial={oldPartSerial}
            barcodeFormats={['code-39', 'code-128', 'qr', 'data-matrix', 'pdf-417']}
            onClose={() => setScannerModalState(prev => ({ ...prev, open: false }))}
            onScanSuccess={handlePartSerialScanned}
          />
        </View>

        {/* Noise Fault Question */}
        <View style={styles.questionBlock}>
          <View style={styles.questionRow}>
            <View style={styles.questionTextContainer}>
              <Text style={styles.questionTitle}>Noise or Operational Fault?</Text>
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
          title="Next: Evidence Photos"
          variant="primary"
          disabled={!isValidConcern || !faultCategory}
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
    backgroundColor: colors.surfaceHighlight,
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
    color: colors.primary,
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
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textInverse,
  },
  serialsBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderColor: 'rgba(225, 31, 38, 0.25)',
    borderWidth: 1,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
