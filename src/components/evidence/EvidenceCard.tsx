import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { BrandPackRule, EvidenceItem, VoiceNote } from '../../types';
import { CameraModal } from '../camera/CameraModal';
import { VoiceToTechButton } from '../voice/VoiceToTechButton';

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
  const [cameraVisible, setCameraVisible] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const isCaptured = !!evidence && (!!evidence.fileUri || !!evidence.serverUrl);
  const isVideo = rule.mediaType === 'video';

  const handleCaptureSuccess = (res: {
    fileUri: string;
    ocrText?: string;
    fileSize: number;
    durationSeconds?: number;
  }) => {
    onSaveEvidence({
      ruleKey: rule.ruleKey,
      ruleName: rule.name,
      mediaType: rule.mediaType,
      fileUri: res.fileUri,
      fileSize: res.fileSize,
      durationSeconds: res.durationSeconds,
      ocrExtractedText: res.ocrText,
      qualityStatus: 'PASSED',
      capturedAt: new Date().toISOString(),
    });
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
            <View style={styles.mockThumbnail}>
              <Icon
                name={isVideo ? 'video' : 'camera'}
                size={24}
                color={colors.primaryLight}
              />
              <Text style={styles.thumbnailLabel}>
                {isVideo ? 'MP4 Video Ready' : '4K JPEG Captured'}
              </Text>
            </View>

            <View style={styles.metaColumn}>
              <View style={styles.metaRow}>
                <Icon name="check-circle" size={14} color={colors.success} />
                <Text style={styles.metaText}>Quality: Pass (No Blur)</Text>
              </View>
              {evidence?.ocrExtractedText ? (
                <View style={styles.metaRow}>
                  <Icon name="file-text" size={14} color={colors.accentCyan} />
                  <Text style={styles.metaText}>
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
              leftIcon={<Icon name="refresh" size={14} color={colors.primaryLight} />}
              onPress={() => setCameraVisible(true)}
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
        /* Missing Evidence: Prompt to capture */
        <View style={styles.unopenedContainer}>
          <Button
            title={isVideo ? 'Record Video (.mp4)' : 'Capture Photo'}
            variant={rule.isMandatory ? 'primary' : 'secondary'}
            size="md"
            leftIcon={
              <Icon
                name={isVideo ? 'video' : 'camera'}
                size={18}
                color={colors.textPrimary}
              />
            }
            onPress={() => setCameraVisible(true)}
            fullWidth
          />
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

      {/* Fullscreen Camera Modal with OEM Overlay */}
      <CameraModal
        visible={cameraVisible}
        rule={rule}
        roNumber={roNumber}
        onClose={() => setCameraVisible(false)}
        onCaptureSuccess={handleCaptureSuccess}
      />
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
    borderColor: colors.success,
    backgroundColor: colors.surfaceHighlight,
  },
  cardFlagged: {
    borderColor: colors.flagged,
    backgroundColor: colors.flaggedLight,
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
    flex: 1,
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconCaptured: {
    backgroundColor: colors.successLight,
  },
  iconMissing: {
    backgroundColor: colors.surfaceElevated,
  },
  titleArea: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  oemFileName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: spacing.sm,
  },
  flagAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.flaggedLight,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.flagged,
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
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
  },
  guidanceText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  previewContainer: {
    marginTop: spacing.xs,
  },
  previewMediaBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mockThumbnail: {
    width: 80,
    height: 60,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  thumbnailLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.weights.medium,
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
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unopenedContainer: {
    marginTop: spacing.xs,
  },
  voiceSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
