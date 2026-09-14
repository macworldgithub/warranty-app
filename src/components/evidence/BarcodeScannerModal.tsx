import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { qualityGates } from '../../services/qualityGates';

interface BarcodeScannerModalProps {
  visible: boolean;
  title: string;
  isNewPart?: boolean;
  oldSerial?: string;
  onClose: () => void;
  onScanSuccess: (serial: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  title,
  isNewPart = false,
  oldSerial,
  onClose,
  onScanSuccess,
}) => {
  const [manualSerial, setManualSerial] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  const handleSimulateScan = (scannedCode: string) => {
    if (isNewPart && oldSerial) {
      const check = qualityGates.checkPartSerials(oldSerial, scannedCode);
      if (!check.valid && check.warning) {
        setValidationWarning(check.warning);
        return;
      }
    }
    setValidationWarning(null);
    onScanSuccess(scannedCode);
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualSerial.trim()) return;
    handleSimulateScan(manualSerial.trim().toUpperCase());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="barcode" size={20} color={colors.primary} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Warning Banner */}
          {validationWarning && (
            <View style={styles.warningBanner}>
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.warningText}>{validationWarning}</Text>
            </View>
          )}

          {/* Scanner Viewfinder Box */}
          <View style={styles.scannerBox}>
            <View style={styles.laserLine} />
            <Text style={styles.scannerInstruction}>
              Align 1D / 2D DataMatrix or QR Code within the laser guide
            </Text>
            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  handleSimulateScan(
                    isNewPart ? 'BYD-1029384-NEW-OEM' : 'BYD-9988112-OLD-DEFECT'
                  )
                }
                style={styles.presetBtn}
              >
                <Text style={styles.presetBtnText}>
                  {isNewPart ? 'Scan [OEM-NEW-PART]' : 'Scan [DEFECTIVE-OLD]'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Manual Entry Fallback */}
          <View style={styles.manualEntryContainer}>
            <Text style={styles.manualLabel}>Or Enter Part Serial Manually:</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={manualSerial}
                onChangeText={setManualSerial}
                placeholder="e.g. BYD-9920192-A"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={styles.input}
              />
              <Button
                title="Confirm"
                variant="primary"
                size="md"
                onPress={handleManualSubmit}
                disabled={!manualSerial.trim()}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  warningText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: typography.weights.bold,
  },
  scannerBox: {
    height: 160,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  laserLine: {
    position: 'absolute',
    top: 78,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  scannerInstruction: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  presetButtonsRow: {
    marginTop: spacing.sm,
  },
  presetBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.md,
  },
  presetBtnText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  manualEntryContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  manualLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: typography.weights.medium,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    height: 44,
  },
});
