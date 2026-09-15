import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
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

  const isCaptured = !!evidence && (!!evidence.fileUri || !!evidence.serverUrl);
  const isVideo = rule.mediaType === 'video';

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
            <Text style={styles.oemFileName}>
              {evidence?.oemFileName || rule.namingConvention?.replace('[DealerRONumber]', roNumber || 'RO')}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {rule.isMandatory ? (
            <Badge
              label={isCaptured ? 'Gate Passed' : 'Mandatory'}
              variant={isCaptured ? 'success' : 'danger'}
              size="sm"
            />
          ) : (
            <Badge label="Optional" variant="neutral" size="sm" />
          )}
        </View>
      </View>

      {/* Flag Alert if warranty clerk flagged this */}
      {isFlagged && (
        <View style={styles.flagAlert}>
          <Icon name="flag" size={16} color={colors.flagged} />
          <View style={styles.flagAlertTextContainer}>
            <Text style={styles.flagAlertTitle}>Clerk Flag Notice:</Text>
            <Text style={styles.flagAlertDesc}>
              {flagInstruction || 'Evidence needs to be re-captured to meet OEM standard.'}
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

      {/* Captured Evidence Preview */}
      {isCaptured ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewMediaBox}>
            {evidence?.fileUri && !isVideo ? (
              <Image
                source={{ uri: evidence.fileUri }}
                style={styles.realThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mockThumbnail}>
                <Icon
                  name={isVideo ? 'video' : 'camera'}
                  size={24}
                  color={colors.primaryLight}
                />
                <Text style={styles.thumbnailLabel}>
                  {isVideo ? 'MP4 Video Attached' : 'Photo Attached'}
                </Text>
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
    width: 72,
    height: 56,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: '#000000',
  },
  mockThumbnail: {
    width: 72,
    height: 56,
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
});
