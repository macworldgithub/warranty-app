import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { voiceApi } from '../../api/voice.api';
import { voiceRecordingService } from '../../services/voiceRecordingService';
import { VoiceNote } from '../../types';

interface VoiceToTechButtonProps {
  onTranscriptReady: (note: VoiceNote) => void;
  pinnedRuleKey?: string;
  ruleName?: string;
  promptSuggestion?: string;
}

export const VoiceToTechButton: React.FC<VoiceToTechButtonProps> = ({
  onTranscriptReady,
  pinnedRuleKey,
  ruleName,
  promptSuggestion,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);

  const startRecording = async () => {
    setIsRecording(true);
    setDuration(0);
    try {
      await voiceRecordingService.startRecording(sec => {
        setDuration(sec);
      });
    } catch (err) {
      setIsRecording(false);
      console.warn('Microphone start error:', err);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsTranscribing(true);
    setModalVisible(true);

    try {
      const result = await voiceRecordingService.stopAndTranscribe();
      if (result.transcript && result.transcript.trim()) {
        setTranscript(result.transcript.trim());
      } else {
        setTranscript('No speech detected. Please hold and speak clearly.');
      }
    } catch (err: any) {
      console.warn('[VoiceToTechButton] Deepgram transcribe error:', err);
      setTranscript('Unable to transcribe audio. Please check network connection.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveNote = () => {
    if (!transcript.trim()) return;

    const newNote: VoiceNote = {
      id: `vn_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      durationSeconds: duration || 8,
      transcript: transcript.trim(),
      recordedAt: new Date().toISOString(),
      pinnedToRuleKey: pinnedRuleKey,
      pinnedToEvidenceKey: pinnedRuleKey,
      isEdited: false,
    };

    onTranscriptReady(newNote);
    setModalVisible(false);
    setTranscript('');
  };


  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={startRecording}
        onPressOut={stopRecordingAndTranscribe}
        style={[
          styles.holdButton,
          isRecording && styles.holdButtonRecording,
        ]}
      >
        <View style={styles.iconCircle}>
          <Icon
            name="mic"
            size={22}
            color={isRecording ? colors.danger : colors.primaryLight}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.buttonTitle}>
            {isRecording ? 'Listening... (Release to Transcribe)' : 'Hold to Dictate Note'}
          </Text>
          <Text style={styles.buttonSubtitle}>
            {promptSuggestion || 'Voice to Tech · Australian Workshop STT'}
          </Text>
        </View>
        {isRecording && (
          <Badge label={`${duration}s`} variant="danger" size="sm" />
        )}
      </TouchableOpacity>

      {/* Transcript Review Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Icon name="sparkles" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Voice to Tech Transcript</Text>
              </View>
              <Badge label="Australian English" variant="success" size="sm" />
            </View>

            {ruleName && (
              <View style={styles.pinnedBadgeRow}>
                <Icon name="pin" size={14} color={colors.primaryLight} />
                <Text style={styles.pinnedText}>Pinned to: {ruleName}</Text>
              </View>
            )}

            {isTranscribing ? (
              <View style={styles.transcribingState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.transcribingText}>
                  Processing workshop audio through Voice-to-Tech...
                </Text>
              </View>
            ) : (
              <View style={styles.transcriptInputContainer}>
                <Text style={styles.editPromptText}>
                  Tap below to edit before saving to case:
                </Text>
                <TextInput
                  multiline
                  value={transcript}
                  onChangeText={setTranscript}
                  style={styles.transcriptInput}
                  placeholder="Technician notes..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Attach Note"
                variant="primary"
                onPress={handleSaveNote}
                disabled={isTranscribing || !transcript.trim()}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  holdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    minHeight: spacing.minTapTarget,
  },
  holdButtonRecording: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  buttonSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  pinnedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  pinnedText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.weights.medium,
  },
  transcribingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  transcribingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
  transcriptInputContainer: {
    marginBottom: spacing.lg,
  },
  editPromptText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transcriptInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
