import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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

  const vinEvidence = getEvidenceForRule('vin_photo');
  const odoEvidence = getEvidenceForRule('odometer_photo');
  const frontEvidence = getEvidenceForRule('front_vehicle_photo');

  const hasVinPhoto = !!vinEvidence?.fileUri;
  const hasVinString = vin.trim().length >= 11;
  const hasOdoPhoto = !!odoEvidence?.fileUri;
  const hasOdoReading = odometer !== null && odometer >= 0;
  const hasFrontPhoto = !!frontEvidence?.fileUri;

  const isGatePassed =
    hasVinPhoto && hasVinString && hasOdoPhoto && hasOdoReading && hasFrontPhoto;

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
      setVin(res.ocrText);
      decodeVinNow(res.ocrText);
    } else if (activeCameraRule.ruleKey === 'odometer_photo' && res.ocrText) {
      const match = res.ocrText.match(/\d+/);
      if (match) {
        setOdometer(parseInt(match[0], 10));
      }
    }

    setActiveCameraRule(null);
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
          Satisfies the brand identity block (VIN plate, odometer cluster, front 3/4 reference shot).
        </Text>
      </View>

      {/* 1. VIN Capture & OCR */}
      <Card
        title="1. VIN Capture & Auto-Decode"
        rightAction={
          hasVinPhoto ? (
            <Badge label="Photo OK" variant="success" size="sm" />
          ) : (
            <Badge label="Missing Photo" variant="danger" size="sm" />
          )
        }
      >
        <View style={styles.captureRow}>
          <Button
            title={hasVinPhoto ? 'Retake VIN Photo' : 'Scan / Photo VIN Plate'}
            variant={hasVinPhoto ? 'outline' : 'primary'}
            size="md"
            leftIcon={<Icon name="camera" size={18} color={colors.textPrimary} />}
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
            title="Decode VIN"
            variant="secondary"
            size="md"
            loading={isVinDecoding}
            disabled={!vin || vin.length < 11}
            leftIcon={<Icon name="sparkles" size={16} color={colors.primaryLight} />}
            onPress={() => decodeVinNow()}
          />
        </View>

        <Input
          label="17-Character VIN String"
          required
          placeholder="e.g. LGXCE4C86P0019283"
          value={vin}
          onChangeText={setVin}
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
