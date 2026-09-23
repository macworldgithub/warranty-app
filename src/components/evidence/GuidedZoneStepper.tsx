import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { EvidenceItem } from '../../types';
import { cameraService } from '../../services/cameraService';
import { getBaseServerUrl } from '../../config/env';

export interface CaptureZone {
  id: string;
  ruleKey: string;
  name: string;
  shortLabel: string;
  description: string;
  isMandatory?: boolean;
}

export const GUIDED_CAPTURE_ZONES: CaptureZone[] = [
  {
    id: 'zone_1',
    ruleKey: 'front_vehicle_photo',
    name: 'Front',
    shortLabel: 'Front',
    description: 'Capture the full front of the vehicle including bumper, grille, headlights and number plate.',
    isMandatory: true,
  },
  {
    id: 'zone_2',
    ruleKey: 'rear_vehicle_photo',
    name: 'Rear',
    shortLabel: 'Rear',
    description: 'Capture the complete rear end including boot/tailgate, taillights, badges and exhaust area.',
    isMandatory: false,
  },
  {
    id: 'zone_3',
    ruleKey: 'driver_side_photo',
    name: 'Driver Side',
    shortLabel: 'Driver Side',
    description: 'Capture full profile of the driver side from front quarter panel to rear bumper.',
    isMandatory: false,
  },
  {
    id: 'zone_4',
    ruleKey: 'passenger_side_photo',
    name: 'Passenger Side',
    shortLabel: 'Passenger Side',
    description: 'Capture full profile of the passenger side showing doors, sill and wheels.',
    isMandatory: false,
  },
  {
    id: 'zone_5',
    ruleKey: 'roof_photo',
    name: 'Roof',
    shortLabel: 'Roof',
    description: 'Capture roof panel, sunroof/panoramic glass, roof rails, and antenna mount.',
    isMandatory: false,
  },
  {
    id: 'zone_6',
    ruleKey: 'bonnet_photo',
    name: 'Bonnet',
    shortLabel: 'Bonnet',
    description: 'Close inspection photo of the bonnet panel, shut lines, and leading edge.',
    isMandatory: false,
  },
  {
    id: 'zone_7',
    ruleKey: 'boot_photo',
    name: 'Boot',
    shortLabel: 'Boot',
    description: 'Open boot/tailgate view showing cargo compartment, spare wheel well, and seals.',
    isMandatory: false,
  },
  {
    id: 'zone_8',
    ruleKey: 'interior_photo',
    name: 'Interior',
    shortLabel: 'Interior',
    description: 'Wide shot of cabin dashboard, steering wheel, seats, center console and touchscreen.',
    isMandatory: false,
  },
  {
    id: 'zone_9',
    ruleKey: 'engine_bay_photo',
    name: 'Engine Bay',
    shortLabel: 'Engine Bay',
    description: 'Top-down photo of engine bay or HV battery electronics with covers visible.',
    isMandatory: false,
  },
  {
    id: 'zone_10',
    ruleKey: 'cargo_tray_photo',
    name: 'Cargo Tray',
    shortLabel: 'Cargo Tray',
    description: 'Ute tub / cargo tray condition, bedliner, tie-down rails and tailgate hinge.',
    isMandatory: false,
  },
];

interface GuidedZoneStepperProps {
  evidenceItems: EvidenceItem[];
  onSaveEvidence: (item: Partial<EvidenceItem> & { ruleKey: string }) => void;
  onRemoveEvidence?: (ruleKey: string) => void;
  roNumber?: string;
}

export const GuidedZoneStepper: React.FC<GuidedZoneStepperProps> = ({
  evidenceItems,
  onSaveEvidence,
  onRemoveEvidence,
  roNumber,
}) => {
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const scrollRef = useRef<any>(null);

  const currentZone = GUIDED_CAPTURE_ZONES[selectedZoneIndex];

  // Helper to resolve evidence item for a zone
  const getZoneEvidence = (ruleKey: string): EvidenceItem | undefined => {
    return evidenceItems.find(e => e.ruleKey === ruleKey);
  };

  // Helper to resolve full image URI
  const resolveUri = (ev?: EvidenceItem): string | null => {
    if (!ev) return null;
    const raw = ev.storageUrl || ev.fileUri || ev.serverUrl || ev.thumbnailUrl;
    if (!raw) return null;
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('file://') ||
      raw.startsWith('content://') ||
      raw.startsWith('data:')
    ) {
      return raw;
    }
    if (raw.startsWith('/')) {
      const base = getBaseServerUrl().replace(/\/+$/, '');
      return `${base}${raw}`;
    }
    return raw;
  };

  const currentEvidence = getZoneEvidence(currentZone.ruleKey);
  const currentImageUri = resolveUri(currentEvidence);

  // Count how many zones have been photographed
  const completedZonesCount = GUIDED_CAPTURE_ZONES.filter(z => {
    const ev = getZoneEvidence(z.ruleKey);
    return !!ev?.fileUri || !!ev?.storageUrl || !!ev?.serverUrl;
  }).length;

  // Handle Photo Capture
  const handleCapture = async (fromGallery: boolean = false) => {
    setIsCapturing(true);
    try {
      let res;
      if (fromGallery) {
        res = await cameraService.pickFromGallery(false);
      } else {
        res = await cameraService.capturePhoto(currentZone.ruleKey);
      }

      setIsCapturing(false);

      if (res.success && res.fileUri) {
        onSaveEvidence({
          ruleKey: currentZone.ruleKey,
          ruleName: currentZone.name,
          mediaType: 'image',
          fileUri: res.fileUri,
          fileSize: res.fileSize || 1850000,
          qualityStatus: 'PASSED',
          capturedAt: new Date().toISOString(),
          oemFileName: `${roNumber ? roNumber.replace(/[^a-zA-Z0-9]/g, '') : 'CASE'}_${currentZone.shortLabel.replace(/\s+/g, '')}.jpg`,
        });

        // Automatically scroll & focus on the next unphotographed zone
        const nextIndex = GUIDED_CAPTURE_ZONES.findIndex(
          (z, i) => i > selectedZoneIndex && !getZoneEvidence(z.ruleKey)
        );
        if (nextIndex !== -1) {
          setSelectedZoneIndex(nextIndex);
          scrollRef.current?.scrollTo({ x: Math.max(0, nextIndex * 76 - 40), animated: true });
        }
      }
    } catch (err) {
      setIsCapturing(false);
      console.warn('Capture error in GuidedZoneStepper:', err);
    }
  };

  const handleSelectZone = (index: number) => {
    setSelectedZoneIndex(index);
    scrollRef.current?.scrollTo({ x: Math.max(0, index * 76 - 40), animated: true });
  };

  return (
    <View style={styles.cardContainer}>
      {/* Top Header Card matching screenshot */}
      <View style={styles.headerBlock}>
        <View style={styles.topHeaderRow}>
          <Text style={styles.mainTitle}>Guided zone capture</Text>
          <Text style={styles.zonesPhotographedCount}>
            {completedZonesCount} of {GUIDED_CAPTURE_ZONES.length} zones photographed
          </Text>
        </View>

        {/* Stepper Pills */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepperRow}
        >
          {GUIDED_CAPTURE_ZONES.map((zone, idx) => {
            const isSelected = idx === selectedZoneIndex;
            const evidence = getZoneEvidence(zone.ruleKey);
            const isPhotographed = !!evidence?.fileUri || !!evidence?.storageUrl || !!evidence?.serverUrl;

            if (isSelected) {
              return (
                <TouchableOpacity
                  key={zone.id}
                  style={styles.activeZoneCard}
                  onPress={() => handleSelectZone(idx)}
                  activeOpacity={0.85}
                >
                  <View style={styles.activeCircle}>
                    <Text style={styles.activeCircleText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.activeZoneLabel} numberOfLines={1}>
                    {zone.shortLabel}
                  </Text>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={zone.id}
                style={styles.inactiveZoneCard}
                onPress={() => handleSelectZone(idx)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.inactiveCircle,
                    isPhotographed && styles.photographedCircle,
                  ]}
                >
                  {isPhotographed ? (
                    <Icon name="check" size={12} color="#059669" />
                  ) : (
                    <Text style={styles.inactiveCircleText}>{idx + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.inactiveZoneLabel,
                    isPhotographed && styles.photographedZoneLabel,
                  ]}
                  numberOfLines={1}
                >
                  {zone.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Zone Detail Card (Lower Section in screenshot) */}
      <View style={styles.detailSection}>
        <View style={styles.detailHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.zoneHeading}>
              {currentZone.name}{' '}
              <Text style={styles.zoneCounterText}>
                zone {selectedZoneIndex + 1} of {GUIDED_CAPTURE_ZONES.length}
              </Text>
            </Text>
            <Text style={styles.zoneInstructionText}>
              {currentZone.description}
            </Text>
          </View>
        </View>

        {/* If Photo Captured: Show Image Preview Card */}
        {currentImageUri ? (
          <View style={styles.capturedPreviewBox}>
            <TouchableOpacity
              style={styles.thumbnailTouch}
              onPress={() => setPreviewModalVisible(true)}
              activeOpacity={0.88}
            >
              <Image
                source={{ uri: currentImageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.zoomPill}>
                <Icon name="search" size={11} color="#FFFFFF" />
                <Text style={styles.zoomPillText}>Inspect</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.capturedMetaColumn}>
              <View style={styles.statusPassRow}>
                <Icon name="check-circle" size={15} color="#059669" />
                <Text style={styles.statusPassText}>Photographed</Text>
              </View>
              <Text style={styles.fileNameText} numberOfLines={1}>
                {currentEvidence?.oemFileName || `${currentZone.name}.jpg`}
              </Text>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => handleCapture(false)}
                disabled={isCapturing}
              >
                <Icon name="refresh" size={13} color={colors.primary} />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Action Buttons matching screenshot */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.takePhotoBtn}
            onPress={() => handleCapture(false)}
            disabled={isCapturing}
            activeOpacity={0.85}
          >
            {isCapturing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.takePhotoBtnText}>Take photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => handleCapture(true)}
            disabled={isCapturing}
            activeOpacity={0.75}
          >
            <Icon name="upload" size={16} color={colors.textPrimary} />
            <Text style={styles.browseBtnText}>Browse</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lightbox Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.lightboxOverlay}>
          <View style={styles.lightboxHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lightboxTitle}>{currentZone.name} Photo</Text>
              <Text style={styles.lightboxSub}>
                Zone {selectedZoneIndex + 1} of {GUIDED_CAPTURE_ZONES.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setPreviewModalVisible(false)}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.lightboxBody}>
            {currentImageUri ? (
              <Image source={{ uri: currentImageUri }} style={styles.lightboxImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBlock: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mainTitle: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  zonesPhotographedCount: {
    fontSize: typography.sizes.xs,
    color: '#64748B',
    fontWeight: typography.weights.medium,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  // Active Card (Red background with white circle badge and white text)
  activeZoneCard: {
    backgroundColor: '#E11F26', // Booran Brand Red
    borderRadius: spacing.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11F26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  activeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  activeZoneLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  // Inactive Zone Item
  inactiveZoneCard: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  inactiveCircleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  inactiveZoneLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  // Photographed state
  photographedCircle: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  photographedZoneLabel: {
    color: '#059669',
    fontWeight: typography.weights.semibold,
  },
  // Lower Detail Section
  detailSection: {
    padding: spacing.md,
    backgroundColor: '#FAFAFA',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  zoneHeading: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  zoneCounterText: {
    fontSize: typography.sizes.xs,
    color: '#64748B',
    fontWeight: typography.weights.regular,
  },
  zoneInstructionText: {
    fontSize: typography.sizes.xs,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  // Captured Preview
  capturedPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
  },
  thumbnailTouch: {
    position: 'relative',
    width: 100,
    height: 75,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  zoomPill: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  zoomPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  capturedMetaColumn: {
    flex: 1,
    gap: 4,
  },
  statusPassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPassText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#059669',
  },
  fileNameText: {
    fontSize: typography.sizes.xs - 1,
    color: '#64748B',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  retakeBtnText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  // Action Buttons matching screenshot
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  takePhotoBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#E11F26',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#E11F26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  takePhotoBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  browseBtn: {
    flex: 1,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  browseBtnText: {
    color: '#0F172A',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 29, 0.95)',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lightboxTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  lightboxSub: {
    fontSize: typography.sizes.xs,
    color: '#94A3B8',
    marginTop: 2,
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
});
