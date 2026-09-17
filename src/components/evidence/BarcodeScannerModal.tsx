import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
  CodeType,
} from 'react-native-vision-camera';
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
  barcodeFormats?: CodeType[];
  onClose: () => void;
  onScanSuccess: (serial: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  title,
  isNewPart = false,
  oldSerial,
  barcodeFormats = ['code-39', 'code-128', 'pdf-417', 'qr', 'data-matrix'],
  onClose,
  onScanSuccess,
}) => {
  const [manualSerial, setManualSerial] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'not-determined'>('not-determined');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);

  // Obtain back camera device, falling back to front camera for emulators if needed
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const device = backDevice || frontDevice;

  // Code Scanner hook using native VisionCamera MLKit engine
  const codeScanner = useCodeScanner({
    codeTypes: barcodeFormats,
    onCodeScanned: (codes: any[]) => {
      if (codes && codes.length > 0 && !scannedValue) {
        const firstCode = codes[0];
        const raw = firstCode.value;
        if (raw) {
          setScannedValue(raw);
          handleScannedResult(raw);
        }
      }
    },
  });

  // Request VisionCamera + Android permissions
  const askForPermissions = async () => {
    try {
      const status = await Camera.requestCameraPermission();
      if (status === 'granted') {
        setPermissionStatus('granted');
        return true;
      }

      if (Platform.OS === 'android') {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Access Required',
            message: 'Warranty App needs camera access to scan vehicle VIN and part barcodes.',
            buttonPositive: 'Allow',
          }
        );
        if (res === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
          return true;
        }
      }

      setPermissionStatus('denied');
      return false;
    } catch (err) {
      console.warn('[BarcodeScannerModal] Permission check exception:', err);
      setPermissionStatus('granted');
      return true;
    }
  };

  useEffect(() => {
    if (visible) {
      setValidationWarning(null);
      setScannedValue(null);
      askForPermissions();
    }
  }, [visible]);

  const handleScannedResult = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toUpperCase();
    if (isNewPart && oldSerial) {
      const check = qualityGates.checkPartSerials(oldSerial, cleanCode);
      if (!check.valid && check.warning) {
        setValidationWarning(check.warning);
        return;
      }
    }
    setValidationWarning(null);
    onScanSuccess(cleanCode);
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualSerial.trim()) return;
    handleScannedResult(manualSerial.trim());
  };

  if (!visible) return null;

  const isCameraActive = !!device && permissionStatus === 'granted';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="barcode" size={20} color={colors.primary} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.headerControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsTorchOn(!isTorchOn)}
                style={[styles.torchBtn, isTorchOn && styles.torchBtnActive]}
              >
                <Icon
                  name={isTorchOn ? 'zap' : 'zap-off'}
                  size={16}
                  color={isTorchOn ? colors.warning : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Icon name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Engine & Permission Status Tag */}
          <View style={styles.engineTagRow}>
            <Badge
              label={
                permissionStatus === 'granted'
                  ? 'Camera Permission Granted'
                  : permissionStatus === 'denied'
                  ? 'Camera Permission Denied'
                  : 'Checking Permissions...'
              }
              variant={permissionStatus === 'granted' ? 'success' : 'danger'}
              size="sm"
            />
            <Text style={styles.formatsLabel}>VisionCamera MLKit (Free)</Text>
          </View>

          {/* Warning Banner */}
          {validationWarning && (
            <View style={styles.warningBanner}>
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.warningText}>{validationWarning}</Text>
            </View>
          )}

          {/* Live Scanner Viewfinder Box */}
          <View style={styles.scannerBox}>
            {isCameraActive ? (
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={visible}
                codeScanner={codeScanner}
                torch={isTorchOn ? 'on' : 'off'}
                enableZoomGesture
              />
            ) : (
              <View style={styles.fallbackCameraPlaceholder}>
                <Icon
                  name={permissionStatus === 'denied' ? 'alert-circle' : 'camera'}
                  size={32}
                  color={permissionStatus === 'denied' ? colors.danger : colors.primary}
                />
                <Text style={styles.cameraPlaceholderText}>
                  {permissionStatus === 'denied'
                    ? 'Camera permission denied in Android settings.'
                    : !device
                    ? 'No camera device detected on this device/emulator.'
                    : 'Initializing Live Camera Preview...'}
                </Text>

                {permissionStatus === 'denied' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={askForPermissions}
                    style={styles.grantPermissionBtn}
                  >
                    <Text style={styles.grantPermissionText}>Grant Permission Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Viewfinder Laser Frame Overlay */}
            <View style={styles.viewfinderFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.laserLine} />
            </View>

            <Text style={styles.scannerInstruction}>
              Align 1D / 2D Barcode within laser guide
            </Text>

            {/* Quick Test Preset Trigger */}
            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  handleScannedResult(
                    isNewPart ? 'BYD-1029384-NEW-OEM' : 'BYD-9988112-OLD-DEFECT'
                  )
                }
                style={styles.presetBtn}
              >
                <Icon name="sparkles" size={14} color={colors.textPrimary} />
                <Text style={styles.presetBtnText}>
                  {isNewPart ? 'Simulate OEM New Part' : 'Simulate Old Defect Part'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Manual Serial Entry Fallback */}
          <View style={styles.manualEntryContainer}>
            <Text style={styles.manualLabel}>Or Enter Serial / Barcode Text Manually:</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={manualSerial}
                onChangeText={setManualSerial}
                placeholder="e.g. BYD-9920192-A or VIN"
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
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
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  torchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchBtnActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: colors.warning,
    borderWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  formatsLabel: {
    fontSize: 11,
    color: colors.textMuted,
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
    height: 220,
    backgroundColor: '#0A0E17',
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  fallbackCameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  cameraPlaceholderText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  grantPermissionBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
  },
  grantPermissionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  viewfinderFrame: {
    position: 'absolute',
    width: 220,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  scannerInstruction: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    pointerEvents: 'none',
  },
  presetButtonsRow: {
    position: 'absolute',
    bottom: 8,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
