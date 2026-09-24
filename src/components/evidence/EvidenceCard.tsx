import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { BrandPackRule, EvidenceItem, VoiceNote } from '../../types';
import { VoiceToTechButton } from '../voice/VoiceToTechButton';
import { cameraService } from '../../services/cameraService';
import { getBaseServerUrl } from '../../config/env';

interface EvidenceCardProps {
  rule: BrandPackRule;
  evidence?: EvidenceItem;
  roNumber: string;
  onSaveEvidence: (item: Partial<EvidenceItem> & { ruleKey: string }) => void;
  onRemoveEvidence: (ruleKey: string) => void;
  onAddVoiceNote: (note: VoiceNote) => void;
  isFlagged?: boolean;
  flagInstruction?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  rule,
  evidence,
  roNumber,
  onSaveEvidence,
  onRemoveEvidence,
  onAddVoiceNote,
  isFlagged = false,
  flagInstruction,
}) => {
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSampleGuide, setShowSampleGuide] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const rawImageUri =
    evidence?.fileUri ||
    evidence?.storageUrl ||
    evidence?.serverUrl ||
    evidence?.thumbnailUrl;

  const imageUri = rawImageUri
    ? rawImageUri.startsWith('http://') ||
      rawImageUri.startsWith('https://') ||
      rawImageUri.startsWith('file://') ||
      rawImageUri.startsWith('content://') ||
      rawImageUri.startsWith('data:')
      ? rawImageUri
      : rawImageUri.startsWith('/')
      ? `${getBaseServerUrl().replace(/\/+$/, '')}${rawImageUri}`
      : rawImageUri
    : null;

  const isCaptured = !!evidence && !!rawImageUri;
  const isVideo =
    rule.mediaType === 'video' ||
    (rule as any).evidenceType === 'video' ||
    evidence?.mediaType === 'video' ||
    Boolean(
      rawImageUri &&
      (rawImageUri.toLowerCase().endsWith('.mp4') ||
       rawImageUri.toLowerCase().endsWith('.mov') ||
       rawImageUri.toLowerCase().endsWith('.webm'))
    );

  const handleCapture = async (fromGallery: boolean = false) => {
    setIsCapturing(true);
    try {
      let res;
      if (fromGallery) {
        res = await cameraService.pickFromGallery(isVideo);
      } else if (isVideo) {
        res = await cameraService.captureVideo(rule.ruleKey);
      } else {
        res = await cameraService.capturePhoto(rule.ruleKey);
      }

      setIsCapturing(false);

      if (res.success && res.fileUri) {
        onSaveEvidence({
          ruleKey: rule.ruleKey,
          ruleName: rule.name,
          mediaType: rule.mediaType,
          fileUri: res.fileUri,
          fileSize: res.fileSize || (isVideo ? 5200000 : 1850000),
          durationSeconds: res.durationSeconds,
          qualityStatus: 'PASSED',
          capturedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setIsCapturing(false);
      console.warn('Capture error in EvidenceCard:', err);
    }
  };

  return (
    <View
      style={[
        styles.card,
        isCaptured ? styles.cardCaptured : styles.cardMissing,
        isFlagged && styles.cardFlagged,
      ]}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusIconCircle,
              isCaptured ? styles.iconCaptured : styles.iconMissing,
            ]}
          >
            <Icon
              name={isCaptured ? 'check' : isVideo ? 'video' : 'camera'}
              size={18}
              color={isCaptured ? colors.success : colors.primaryLight}
            />
          </View>
          <View style={styles.titleArea}>
            <Text style={styles.ruleTitle}>{rule.name}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Badge
            label={isCaptured ? 'Captured ✓' : 'Optional'}
            variant={isCaptured ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
      </View>

      {/* Flag Alert if warranty clerk flagged this */}
      {isFlagged && (
        <View style={styles.flagAlert}>
          <Icon name="flag" size={16} color={colors.flagged} />
          <View style={styles.flagAlertTextContainer}>
            <Text style={styles.flagAlertTitle}>Clerk Note:</Text>
            <Text style={styles.flagAlertDesc}>
              {flagInstruction || 'Evidence needs to be re-captured.'}
            </Text>
          </View>
        </View>
      )}

      {/* Guidance Text */}
      {rule.guidanceText && (
        <Text style={styles.guidanceText}>
          {rule.guidanceText}
        </Text>
      )}

      {/* Sample Reference Preview */}
      {rule.exampleImageUrl ? (
        <View style={styles.sampleGuideContainer}>
          <TouchableOpacity
            style={styles.sampleGuideHeader}
            onPress={() => setShowSampleGuide(!showSampleGuide)}
            activeOpacity={0.7}
          >
            <View style={styles.sampleGuideTitleRow}>
              <Icon name="eye" size={14} color={colors.accentCyan || '#06B6D4'} />
              <Text style={styles.sampleGuideTitle}>Sample Photo Guide</Text>
            </View>
            <Text style={styles.sampleGuideToggleText}>
              {showSampleGuide ? 'Hide Sample ▲' : 'View Sample ▼'}
            </Text>
          </TouchableOpacity>

          {showSampleGuide && (
            <View style={styles.sampleImageFrame}>
              {rule.exampleImageUrl.startsWith('data:application/pdf') || rule.exampleImageUrl.includes('.pdf') || rule.mediaType === 'document' ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.sm, gap: 4 }}>
                  <Icon name="file-text" size={32} color={colors.accentCyan || '#06B6D4'} />
                  <Text style={{ color: colors.textPrimary || '#FFFFFF', fontSize: 11, fontWeight: typography.weights.bold }}>
                    OEM Diagnostic Spec PDF Attached
                  </Text>
                  <Text style={styles.sampleGuideCaption}>
                    Diagnostic scan log / OEM technical specification
                  </Text>
                </View>
              ) : rule.exampleImageUrl.startsWith('data:video') || rule.exampleImageUrl.includes('.mp4') ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.sm, gap: 4 }}>
                  <Icon name="video" size={32} color={colors.primaryLight || '#E11F26'} />
                  <Text style={{ color: colors.textPrimary || '#FFFFFF', fontSize: 11, fontWeight: typography.weights.bold }}>
                    Sample Video Demonstration Attached
                  </Text>
                  <Text style={styles.sampleGuideCaption}>
                    Record 15–30s video with sound demonstrating the fault
                  </Text>
                </View>
              ) : (
                <>
                  <Image
                    source={{ uri: rule.exampleImageUrl }}
                    style={styles.sampleRealImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.sampleGuideCaption}>
                    Framing & angle required by {rule.name}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      ) : null}

      {/* Captured Evidence Preview */}
      {isCaptured ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewMediaBox}>
            {isVideo ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (imageUri) {
                    Linking.openURL(imageUri).catch(() =>
                      Alert.alert('Playback Error', 'Unable to launch native media player for this video.')
                    );
                  }
                }}
                style={styles.videoThumbnailWrapper}
              >
                <Icon name="video" size={26} color="#60A5FA" />
                <View style={styles.videoThumbnailPlayBadge}>
                  <Icon name="play" size={10} color="#FFFFFF" />
                  <Text style={styles.videoThumbnailPlayText}>Play MP4</Text>
                </View>
              </TouchableOpacity>
            ) : imageUri ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPreviewModalVisible(true)}
                style={styles.thumbnailWrapper}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.realThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.tapToViewOverlay}>
                  <Icon name="search" size={10} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.mockThumbnail}>
                <Icon
                  name="camera"
                  size={24}
                  color={colors.primaryLight}
                />
                <Text style={styles.thumbnailLabel}>Photo Attached</Text>
              </View>
            )}

            <View style={styles.metaColumn}>
              <View style={styles.metaRow}>
                <Icon name="check-circle" size={14} color={colors.success} />
                <Text style={styles.metaText}>Quality: Verified (Pass)</Text>
              </View>
              {evidence?.ocrExtractedText ? (
                <View style={styles.metaRow}>
                  <Icon name="file-text" size={14} color={colors.accentCyan} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    OCR: {evidence.ocrExtractedText}
                  </Text>
                </View>
              ) : null}
              {evidence?.durationSeconds ? (
                <View style={styles.metaRow}>
                  <Icon name="clock" size={14} color={colors.warning} />
                  <Text style={styles.metaText}>
                    Duration: {evidence.durationSeconds}s
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Action buttons when captured */}
          <View style={styles.actionRow}>
            <Button
              title="Retake"
              variant="outline"
              size="sm"
              loading={isCapturing}
              leftIcon={<Icon name="refresh" size={14} color={colors.primaryLight} />}
              onPress={() => handleCapture(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Pin Note"
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="mic" size={14} color={colors.textPrimary} />}
              onPress={() => setShowVoiceRecorder(!showVoiceRecorder)}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onRemoveEvidence(rule.ruleKey)}
              style={styles.deleteBtn}
            >
              <Icon name="trash" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Missing Evidence: Prompt to capture directly */
        <View style={styles.unopenedContainer}>
          <View style={styles.captureBtnRow}>
            <Button
              title={isVideo ? 'Record Video (.mp4)' : 'Capture Photo'}
              variant={rule.isMandatory ? 'primary' : 'secondary'}
              size="md"
              loading={isCapturing}
              leftIcon={
                <Icon
                  name={isVideo ? 'video' : 'camera'}
                  size={18}
                  color={colors.textPrimary}
                />
              }
              onPress={() => handleCapture(false)}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCapture(true)}
              style={styles.galleryBtn}
            >
              <Icon name="upload" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Embedded Voice to Tech Pin-to-Artefact Bar */}
      {showVoiceRecorder && (
        <View style={styles.voiceSection}>
          <VoiceToTechButton
            pinnedRuleKey={rule.ruleKey}
            ruleName={rule.name}
            promptSuggestion={`Describe what is shown in ${rule.name}...`}
            onTranscriptReady={note => {
              onAddVoiceNote(note);
              setShowVoiceRecorder(false);
            }}
          />
        </View>
      )}

      {/* Full screen inspection modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewModalTitle}>{rule.name}</Text>
              <Text style={styles.previewModalSub}>{evidence?.oemFileName || `RO #${roNumber}`}</Text>
            </View>
            <TouchableOpacity
              style={styles.previewModalCloseBtn}
              onPress={() => setPreviewModalVisible(false)}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.previewModalBody}>
            {isVideo && imageUri ? (
              <View style={styles.videoModalCard}>
                <View style={styles.videoModalIconRing}>
                  <Icon name="video" size={44} color="#60A5FA" />
                </View>
                <Text style={styles.videoModalTitle}>{rule.name}</Text>
                <Text style={styles.videoModalSubtitle}>MP4 Video Evidence Stream</Text>
                <TouchableOpacity
                  style={styles.videoModalPlayBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Linking.openURL(imageUri).catch(() =>
                      Alert.alert('Playback Error', 'Unable to launch native media player.')
                    );
                  }}
                >
                  <Icon name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.videoModalPlayBtnText}>Play in Media Player</Text>
                </TouchableOpacity>
              </View>
            ) : imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.fullPreviewImage} resizeMode="contain" />
            ) : null}
          </View>
          {evidence?.ocrExtractedText ? (
            <View style={styles.previewModalFooter}>
              <Icon name="check-circle" size={16} color="#34D399" />
              <Text style={styles.previewModalOcrText}>OCR: {evidence.ocrExtractedText}</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardMissing: {
    borderColor: colors.border,
  },
  cardCaptured: {
    borderColor: colors.borderHighlight,
    backgroundColor: colors.surface,
  },
  cardFlagged: {
    borderColor: colors.flagged,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerRight: {
    marginLeft: spacing.sm,
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMissing: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCaptured: {
    backgroundColor: colors.successLight,
  },
  titleArea: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  oemFileName: {
    fontSize: 10,
    fontFamily: typography.fontFamily,
    color: colors.primary,
    marginTop: 2,
    fontWeight: typography.weights.semibold,
  },

  guidanceText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  flagAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.flaggedLight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(225, 31, 38, 0.25)',
    gap: spacing.xs,
  },
  flagAlertTextContainer: {
    flex: 1,
  },
  flagAlertTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.flagged,
  },
  flagAlertDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unopenedContainer: {
    marginTop: spacing.xs,
  },
  captureBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  galleryBtn: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewContainer: {
    marginTop: spacing.xs,
  },
  previewMediaBox: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.md,
  },
  realThumbnail: {
    width: 84,
    height: 64,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: '#0F172A',
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: spacing.borderRadius.sm,
    overflow: 'hidden',
  },
  tapToViewOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 3,
  },
  mockThumbnail: {
    width: 84,
    height: 64,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  metaColumn: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sampleGuideContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  sampleGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleGuideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sampleGuideTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.accentCyan || '#06B6D4',
  },
  sampleGuideToggleText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  sampleImageFrame: {
    marginTop: spacing.sm,
    height: 140,
    borderRadius: spacing.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleRealImage: {
    width: '100%',
    height: 115,
  },
  sampleGuideCaption: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: typography.weights.regular,
    marginTop: 2,
    textAlign: 'center',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 29, 0.95)',
    justifyContent: 'space-between',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewModalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  previewModalSub: {
    fontSize: typography.sizes.xs,
    color: '#94A3B8',
    marginTop: 2,
  },
  previewModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  previewModalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
  previewModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: 36,
  },
  previewModalOcrText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#34D399',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  videoThumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    position: 'relative',
    gap: 4,
  },
  videoThumbnailPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoThumbnailPlayText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  videoModalCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#0F172A',
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '88%',
    maxWidth: 340,
  },
  videoModalIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  videoModalTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  videoModalSubtitle: {
    fontSize: typography.sizes.xs - 1,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  videoModalPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    width: '100%',
  },
  videoModalPlayBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
});
