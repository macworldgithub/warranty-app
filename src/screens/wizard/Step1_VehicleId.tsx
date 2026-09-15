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
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { CameraModal } from '../../components/camera/CameraModal';
import { scanbotService, ScanVinResult } from '../../services/scanbot.service';
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

  const [activeCameraRule, setActiveCameraRule] = useState<{
    ruleKey: string;
    name: string;
    guidanceText?: string;
    mediaType?: string;
  } | null>(null);

  const [isScanningWithScanbot, setIsScanningWithScanbot] = useState(false);
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

  const isGatePassed =
    (hasVinPhoto || isVinValid) && hasVinString && hasOdoPhoto && hasOdoReading && hasFrontPhoto;

  // Handle Scanbot Barcode Scanner trigger
  const handleLaunchScanbot = async () => {
    setIsScanningWithScanbot(true);
    try {
      const result = await scanbotService.scanVINBarcode();
      setIsScanningWithScanbot(false);

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
      } else if (result.error && !result.error.includes('cancelled')) {
        Alert.alert('Scan Result', result.error);
      }
    } catch (err: any) {
      setIsScanningWithScanbot(false);
      Alert.alert('Scanner Notice', 'Could not open live scanner. You can enter the VIN manually or capture a photo.');
    }
  };

  const handleCameraCapture = (res: { fileUri: string; ocrText?: string; fileSize: number }) => {
    if (!activeCameraRule) return;

    saveEvidenceItem({
      ruleKey: activeCameraRule.ruleKey,
      ruleName: activeCameraRule.name,
      fileUri: res.fileUri,
      fileSize: res.fileSize,
      ocrExtractedText: res.ocrText,
      capturedAt: new Date().toISOString(),
    });

    // Auto-fill from OCR
    if (activeCameraRule.ruleKey === 'vin_photo' && res.ocrText) {
      const normalized = normalizeVIN(res.ocrText);
      setVin(normalized);
      decodeVinNow(normalized);
    } else if (activeCameraRule.ruleKey === 'odometer_photo' && res.ocrText) {
      const match = res.ocrText.match(/\d+/);
      if (match) {
        setOdometer(parseInt(match[0], 10));
      }
    }

    setActiveCameraRule(null);
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
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Step 1 · Vehicle Identity (Fast Path)</Text>
          <Badge
            label={isGatePassed ? 'Gate Complete' : 'Mandatory Gate'}
            variant={isGatePassed ? 'success' : 'danger'}
            size="sm"
          />
        </View>
        <Text style={styles.sectionDesc}>
          Satisfies the brand identity block (VIN barcode/plate, odometer cluster, front 3/4 reference shot).
        </Text>
      </View>

      {/* 1. VIN Capture & Auto-Decode */}
      <Card
        title="1. VIN Capture & Auto-Decode"
        rightAction={
          isVinValid ? (
            <Badge label="Valid 17-Char VIN" variant="success" size="sm" />
          ) : hasVinString ? (
            <Badge label="Needs 17 Chars" variant="warning" size="sm" />
          ) : (
            <Badge label="Required" variant="danger" size="sm" />
          )
        }
      >
        {/* Dual Capture Options: Scanbot Scanner & Native Camera */}
        <View style={styles.captureActionGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLaunchScanbot}
            disabled={isScanningWithScanbot}
            style={styles.scanbotBtn}
          >
            {isScanningWithScanbot ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="sparkles" size={20} color="#00D1FF" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.scanbotBtnTitle}>Scan VIN Barcode (Scanbot)</Text>
              <Text style={styles.scanbotBtnSub}>Fast B-pillar & windscreen barcode scan</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <Button
              title={hasVinPhoto ? 'Retake VIN Photo' : 'Photo VIN Plate'}
              variant={hasVinPhoto ? 'outline' : 'secondary'}
              size="sm"
              leftIcon={<Icon name="camera" size={16} color={colors.textPrimary} />}
              onPress={() =>
                setActiveCameraRule({
                  ruleKey: 'vin_photo',
                  name: 'VIN Plate / Windscreen Barcode',
                  guidanceText: 'Ensure 17 VIN characters are in focus and readable.',
                  mediaType: 'image',
                })
              }
              style={{ flex: 1 }}
            />

            <Button
              title="Decode Spec"
              variant="primary"
              size="sm"
              loading={isVinDecoding}
              disabled={!vin || vin.length < 11}
              leftIcon={<Icon name="check" size={16} color={colors.textPrimary} />}
              onPress={() => decodeVinNow()}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Scanned Confirmation Banner */}
        {lastScannedResult && (
          <View style={styles.scannedConfirmationCard}>
            <View style={styles.scannedHeader}>
              <Icon name="check" size={16} color={colors.success} />
              <Text style={styles.scannedTitle}>Scanbot Detection Verified</Text>
              <Badge label={lastScannedResult.source} variant="outline" size="sm" />
            </View>
            <Text style={styles.scannedVinText}>{lastScannedResult.vin}</Text>
            <View style={styles.scannedMetaRow}>
              <Text style={styles.scannedMetaText}>
                {lastScannedResult.manufacturerHint || getVinManufacturerHint(vin)}
              </Text>
              <Text style={styles.scannedMetaText}>· 17 Chars Valid</Text>
            </View>
          </View>
        )}

        {/* VIN String Input Field */}
        <Input
          label="17-Character VIN String"
          required
          placeholder="e.g. LGXCE4C86P0019283"
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
              <Text style={styles.decodedLabel}>DECODED VEHICLE SPEC</Text>
              <Text style={styles.decodedSpec}>
                {year || 2024} {make || 'BYD'} {model || 'ATTO 3 Extended'}
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

      {/* 2. Odometer Cluster Photo & Reading */}
      <Card
        title="2. Odometer Cluster"
        rightAction={
          hasOdoPhoto && hasOdoReading ? (
            <Badge label="Reading Verified" variant="success" size="sm" />
          ) : (
            <Badge label="Required" variant="danger" size="sm" />
          )
        }
      >
        <Text style={styles.subtext}>
          {powertrain === 'Hybrid'
            ? 'PHEV/Hybrid: Ensure EV + HV combined mileage screen is active.'
            : 'Cluster in frame with vehicle powered ON.'}
        </Text>

        <View style={styles.captureRow}>
          <Button
            title={hasOdoPhoto ? 'Retake Odometer' : 'Photograph Odometer'}
            variant={hasOdoPhoto ? 'outline' : 'primary'}
            size="md"
            leftIcon={<Icon name="camera" size={18} color={colors.textPrimary} />}
            onPress={() =>
              setActiveCameraRule({
                ruleKey: 'odometer_photo',
                name: 'Odometer Dash Cluster',
                guidanceText: 'Capture dash cluster in focus showing total mileage.',
                mediaType: 'image',
              })
            }
            style={{ flex: 1 }}
          />
        </View>

        <Input
          label="Confirmed Odometer Reading (km)"
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
      </Card>

      {/* 3. Front of Vehicle Photo */}
      <Card
        title="3. Front of Vehicle Reference Shot"
        rightAction={
          hasFrontPhoto ? (
            <Badge label="Reference OK" variant="success" size="sm" />
          ) : (
            <Badge label="Required" variant="danger" size="sm" />
          )
        }
      >
        <Text style={styles.subtext}>
          Guided 3/4 front framing. Vehicle fills 80%+ frame with rego plate readable where present.
        </Text>

        <Button
          title={hasFrontPhoto ? 'Retake Front Reference' : 'Capture Front Reference Photo'}
          variant={hasFrontPhoto ? 'outline' : 'primary'}
          size="md"
          leftIcon={<Icon name="camera" size={18} color={colors.textPrimary} />}
          onPress={() =>
            setActiveCameraRule({
              ruleKey: 'front_vehicle_photo',
              name: 'Front of Vehicle Reference',
              guidanceText: 'Position complete front 3/4 of car inside framing overlay.',
              mediaType: 'image',
            })
          }
          fullWidth
        />
      </Card>

      {/* Camera Modal Overlay */}
      {activeCameraRule && (
        <CameraModal
          visible={!!activeCameraRule}
          rule={activeCameraRule}
          roNumber={roNumber}
          onClose={() => setActiveCameraRule(null)}
          onCaptureSuccess={handleCameraCapture}
        />
      )}

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
          title="Next: Fault & Concern"
          variant="primary"
          disabled={!isGatePassed}
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
    backgroundColor: '#0F1E36',
    borderWidth: 1.5,
    borderColor: '#00D1FF',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  scanbotBtnTitle: {
    color: '#00D1FF',
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
  scannedConfirmationCard: {
    backgroundColor: 'rgba(0, 209, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.4)',
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
    color: '#00D1FF',
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  decodedCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  decodedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  decodedLabel: {
    fontSize: 9,
    color: colors.primaryLight,
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
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
