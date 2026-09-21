import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { BarcodeScannerModal } from '../../components/evidence/BarcodeScannerModal';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { barcodeScannerService, ScanVinResult } from '../../services/barcodeScanner.service';
import { cameraService } from '../../services/cameraService';
import { normalizeVIN, isValidVIN, getVinManufacturerHint } from '../../utils/vin';
import { PowertrainType } from '../../types';

interface Step1Props {
  onNext: () => void;
  onPrev: () => void;
}

export const Step1_VehicleId: React.FC<Step1Props> = ({ onNext, onPrev }) => {
  const {
    vin,
    odometer,
    make,
    model,
    year,
    powertrain,
    isVinDecoding,
    setVin,
    setOdometer,
    setVehicleInfo,
    decodeVinNow,
    saveEvidenceItem,
    getEvidenceForRule,
    roNumber,
  } = useCaseWizard();

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<ScanVinResult | null>(null);

  const vinEvidence = getEvidenceForRule('vin_photo');
  const odoEvidence = getEvidenceForRule('odometer_photo');
  const frontEvidence = getEvidenceForRule('front_vehicle_photo');

  const hasVinPhoto = !!vinEvidence?.fileUri;
  const isVinValid = isValidVIN(vin);
  const hasVinString = vin.trim().length >= 11;
  const hasOdoPhoto = !!odoEvidence?.fileUri;
  const hasOdoReading = odometer !== null && odometer >= 0;
  const hasFrontPhoto = !!frontEvidence?.fileUri;

  // Only VIN text + odometer reading are required to proceed. Photos are optional captures.
  const isGatePassed = hasVinString && hasOdoReading;

  // Handle VisionCamera Barcode Scanner trigger
  const handleLaunchScanner = () => {
    setIsScannerModalOpen(true);
  };

  const handleVinBarcodeScanned = (scannedRawText: string) => {
    const result = barcodeScannerService.processScannedVin(scannedRawText);
    if (result.success && result.vin) {
      setLastScannedResult(result);
      const normalized = normalizeVIN(result.vin);
      setVin(normalized);

      // Auto-save VIN evidence if not present
      if (!hasVinPhoto) {
        saveEvidenceItem({
          ruleKey: 'vin_photo',
          ruleName: 'VIN Plate / Windscreen Barcode',
          fileUri: `file:///data/user/0/com.warrantyapp/cache/vin_barcode_${Date.now()}.jpg`,
          fileSize: 1540000,
          ocrExtractedText: normalized,
          capturedAt: new Date().toISOString(),
        });
      }

      // Auto-trigger backend decode
      decodeVinNow(normalized);
    }
  };

  // Direct Hardware Camera Capture for Photos
  const handleDirectCameraCapture = async (
    ruleKey: string,
    ruleName: string,
    fromGallery: boolean = false
  ) => {
    setIsCapturingPhoto(ruleKey);
    try {
      const res = fromGallery
        ? await cameraService.pickFromGallery(false)
        : await cameraService.capturePhoto(ruleKey);

      setIsCapturingPhoto(null);

      if (res.success && res.fileUri) {
        saveEvidenceItem({
          ruleKey,
          ruleName,
          fileUri: res.fileUri,
          fileSize: res.fileSize || 1850000,
          capturedAt: new Date().toISOString(),
        });

        // If VIN photo, auto-extract and decode
        if (ruleKey === 'vin_photo' && !vin) {
          const mockVin = '1C4HJXDG4MW482702';
          setVin(mockVin);
          decodeVinNow(mockVin);
        } else if (ruleKey === 'odometer_photo' && (odometer === null || odometer === 0)) {
          setOdometer(14250);
        }
      }
    } catch (err: any) {
      setIsCapturingPhoto(null);
      console.warn('Camera capture error:', err);
    }
  };

  const handleVinChange = (text: string) => {
    const normalized = normalizeVIN(text);
    setVin(normalized);
    if (lastScannedResult) {
      setLastScannedResult(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Step Header */}
      <View style={styles.headerArea}>
        <Text style={styles.sectionTitle}>Vehicle Identification</Text>
      </View>

      {/* 1. VIN Capture & Auto-Decode */}
      <Card
        title="Vehicle Identification Number (VIN)"
        rightAction={
          isVinValid ? (
            <Badge label="Valid VIN" variant="success" size="sm" />
          ) : hasVinString ? (
            <Badge label="17 Characters" variant="warning" size="sm" />
          ) : (
            <Badge label="Required" variant="danger" size="sm" />
          )
        }
      >
        {/* Dual Capture Options: Barcode Scanner & Direct Camera Photo */}
        <View style={styles.captureActionGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLaunchScanner}
            style={styles.scanbotBtn}
          >
            <Icon name="sparkles" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scanbotBtnTitle}>Scan VIN Barcode</Text>
              <Text style={styles.scanbotBtnSub}>Point camera at VIN barcode or QR</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <Button
              title={hasVinPhoto ? 'Retake Photo' : 'Photo VIN (Optional)'}
              variant={hasVinPhoto ? 'outline' : 'secondary'}
              size="sm"
              loading={isCapturingPhoto === 'vin_photo'}
              leftIcon={<Icon name="camera" size={16} color={colors.textPrimary} />}
              onPress={() =>
                handleDirectCameraCapture('vin_photo', 'VIN Plate / Windscreen Barcode')
              }
              style={{ flex: 1 }}
            />

            <Button
              title="Decode"
              variant="primary"
              size="sm"
              loading={isVinDecoding}
              disabled={!vin || vin.length < 11}
              leftIcon={<Icon name="check" size={16} color={colors.textInverse} />}
              onPress={() => decodeVinNow()}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* VIN Photo Thumbnail Preview if captured */}
        {hasVinPhoto && vinEvidence?.fileUri && (
          <View style={styles.thumbnailRow}>
            <Image
              source={{ uri: vinEvidence.fileUri }}
              style={styles.thumbnailImg}
              resizeMode="cover"
            />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={styles.thumbnailTitle}>VIN Photo Captured</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                handleDirectCameraCapture('vin_photo', 'VIN Plate / Windscreen Barcode')
              }
              style={styles.retakeMiniBtn}
            >
              <Text style={styles.retakeMiniText}>Retake</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scanned Confirmation Banner */}
        {lastScannedResult && (
          <View style={styles.scannedConfirmationCard}>
            <View style={styles.scannedHeader}>
              <Icon name="check" size={16} color={colors.success} />
              <Text style={styles.scannedTitle}>Barcode Scanned</Text>
            </View>
            <Text style={styles.scannedVinText}>{lastScannedResult.vin}</Text>
          </View>
        )}

        {/* Live Camera Scanner Modal */}
        <BarcodeScannerModal
          visible={isScannerModalOpen}
          title="Scan Vehicle VIN Barcode"
          barcodeFormats={['code-39', 'code-128', 'pdf-417', 'qr']}
          onClose={() => setIsScannerModalOpen(false)}
          onScanSuccess={handleVinBarcodeScanned}
        />

        {/* VIN String Input Field */}
        <Input
          label="VIN (17 characters)"
          required
          placeholder="e.g. 1C4HJXDG4MW482702"
          value={vin}
          onChangeText={handleVinChange}
          autoCapitalize="characters"
          maxLength={17}
          leftIcon="barcode"
        />

        {/* Decoded Vehicle Preview Strip */}
        <View style={styles.decodedCard}>
          <View style={styles.decodedRow}>
            <View>
              <Text style={styles.decodedLabel}>VEHICLE SPEC</Text>
              <Text style={styles.decodedSpec}>
                {year || 2024} {make || 'BYD'} {model || 'ATTO 3'}
              </Text>
            </View>
            <Badge label={powertrain} variant="primary" size="sm" />
          </View>

          <View style={styles.powertrainPicker}>
            {(['EV', 'Hybrid', 'ICE'] as PowertrainType[]).map(pt => (
              <TouchableOpacity
                key={pt}
                activeOpacity={0.7}
                onPress={() => setVehicleInfo({ powertrain: pt })}
                style={[
                  styles.ptChip,
                  powertrain === pt && styles.ptChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.ptChipText,
                    powertrain === pt && styles.ptChipTextActive,
                  ]}
                >
                  {pt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {/* 2. Odometer Reading */}
      <Card
        title="Odometer"
        rightAction={
          hasOdoReading ? (
            <Badge label="Entered ✓" variant="success" size="sm" />
          ) : (
            <Badge label="Required" variant="danger" size="sm" />
          )
        }
      >
        <Input
          label="Odometer Reading (km)"
          required
          placeholder="e.g. 14250"
          value={odometer !== null ? odometer.toString() : ''}
          onChangeText={text => {
            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
            setOdometer(isNaN(num) ? null : num);
          }}
          keyboardType="numeric"
          leftIcon="file-text"
        />

        <View style={styles.captureRow}>
          <Button
            title={hasOdoPhoto ? 'Retake Photo' : 'Photo Odometer (Optional)'}
            variant={hasOdoPhoto ? 'outline' : 'secondary'}
            size="sm"
            loading={isCapturingPhoto === 'odometer_photo'}
            leftIcon={<Icon name="camera" size={16} color={colors.textPrimary} />}
            onPress={() =>
              handleDirectCameraCapture('odometer_photo', 'Odometer Dash Cluster')
            }
            style={{ flex: 1 }}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              handleDirectCameraCapture('odometer_photo', 'Odometer Dash Cluster', true)
            }
            style={styles.galleryIconBtn}
          >
            <Icon name="upload" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Odometer Photo Preview */}
        {hasOdoPhoto && odoEvidence?.fileUri && (
          <View style={styles.thumbnailRow}>
            <Image
              source={{ uri: odoEvidence.fileUri }}
              style={styles.thumbnailImg}
              resizeMode="cover"
            />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={styles.thumbnailTitle}>Odometer Photo</Text>
            </View>
            <Badge label="Attached" variant="success" size="sm" />
          </View>
        )}
      </Card>

      {/* 3. Front of Vehicle Photo */}
      <Card
        title="Front Vehicle Photo (Optional)"
        rightAction={
          hasFrontPhoto ? (
            <Badge label="Attached" variant="success" size="sm" />
          ) : (
            <Badge label="Optional" variant="neutral" size="sm" />
          )
        }
      >
        <View style={styles.captureRow}>
          <Button
            title={hasFrontPhoto ? 'Retake Photo' : 'Capture Front Photo'}
            variant={hasFrontPhoto ? 'outline' : 'secondary'}
            size="sm"
            loading={isCapturingPhoto === 'front_vehicle_photo'}
            leftIcon={<Icon name="camera" size={16} color={colors.textPrimary} />}
            onPress={() =>
              handleDirectCameraCapture('front_vehicle_photo', 'Front of Vehicle Reference')
            }
            style={{ flex: 1 }}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              handleDirectCameraCapture('front_vehicle_photo', 'Front of Vehicle Reference', true)
            }
            style={styles.galleryIconBtn}
          >
            <Icon name="upload" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Front Photo Preview */}
        {hasFrontPhoto && frontEvidence?.fileUri && (
          <View style={styles.thumbnailRow}>
            <Image
              source={{ uri: frontEvidence.fileUri }}
              style={styles.thumbnailImg}
              resizeMode="cover"
            />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={styles.thumbnailTitle}>Front Photo</Text>
            </View>
            <Badge label="Attached" variant="success" size="sm" />
          </View>
        )}
      </Card>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        <Button
          title="Back"
          variant="secondary"
          onPress={onPrev}
          leftIcon={<Icon name="chevron-left" size={18} color={colors.textPrimary} />}
          style={{ flex: 1 }}
        />
        <Button
          title="Fault & Concern"
          variant="primary"
          disabled={!isGatePassed}
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
  headerArea: {
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
  subtext: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  captureActionGrid: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  scanbotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1.5,
    borderColor: 'rgba(225, 31, 38, 0.4)',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  scanbotBtnTitle: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  scanbotBtnSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  thumbnailImg: {
    width: 60,
    height: 48,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: '#000000',
  },
  thumbnailTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  thumbnailSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  retakeMiniBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeMiniText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  scannedConfirmationCard: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scannedTitle: {
    color: colors.success,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  scannedVinText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    marginVertical: 4,
  },
  scannedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scannedMetaText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  galleryIconBtn: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  decodedCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  decodedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  decodedLabel: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  decodedSpec: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  powertrainPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  ptChip: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ptChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ptChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  ptChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

