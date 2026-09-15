import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { VoiceToTechButton } from '../../components/voice/VoiceToTechButton';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { VoiceNote } from '../../types';

interface Step5Props {
  onNext: () => void;
  onPrev: () => void;
}

const PROMPT_SUGGESTIONS = [
  'Describe customer concern & diagnostic path',
  'What did you observe on the component failure / leak?',
  'State DTC codes and freeze-frame values on VDS',
  'Detail post-repair calibration & road test result',
];

export const Step5_VoiceNotes: React.FC<Step5Props> = ({ onNext, onPrev }) => {
  const {
    voiceNotes,
    addVoiceNote,
    removeVoiceNote,
    resolvedRules,
  } = useCaseWizard();

  const [activeSuggestion, setActiveSuggestion] = useState(PROMPT_SUGGESTIONS[0]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (note: VoiceNote) => {
    setEditingNoteId(note.id);
    setEditText(note.transcript);
  };

  const handleSaveEdit = (noteId: string) => {
    const existing = voiceNotes.find(n => n.id === noteId);
    if (existing && editText.trim()) {
      removeVoiceNote(noteId);
      addVoiceNote({
        ...existing,
        transcript: editText.trim(),
        isEdited: true,
      });
    }
    setEditingNoteId(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.introHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Step 5 Â· Voice to Tech Dictation</Text>
          <Badge
            label={`${voiceNotes.length} Note${voiceNotes.length !== 1 ? 's' : ''}`}
            variant={voiceNotes.length > 0 ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
        <Text style={styles.sectionDesc}>
          Dictate technical observations directly from the workshop floor without greasy typing.
        </Text>
      </View>

      {/* Suggested Prompts */}
      <Card title="Quick Voice Prompts">
        <Text style={styles.subtext}>Tap a suggestion to guide your dictation:</Text>
        <View style={styles.suggestionsContainer}>
          {PROMPT_SUGGESTIONS.map((sug, idx) => {
            const isSelected = activeSuggestion === sug;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.75}
                onPress={() => setActiveSuggestion(sug)}
                style={[
                  styles.suggestionChip,
                  isSelected && styles.suggestionChipSelected,
                ]}
              >
                <Icon
                  name="sparkles"
                  size={12}
                  color={isSelected ? colors.primaryLight : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.suggestionText,
                    isSelected && styles.suggestionTextSelected,
                  ]}
                >
                  {sug}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <VoiceToTechButton
          promptSuggestion={activeSuggestion}
          onTranscriptReady={note => addVoiceNote(note)}
        />
      </Card>

      {/* Recorded Voice Notes List */}
      <Card title={`Recorded Case Notes (${voiceNotes.length})`}>
        {voiceNotes.length > 0 ? (
          voiceNotes.map(note => {
            const isEditing = editingNoteId === note.id;
            const pinnedRule = resolvedRules.find(r => r.ruleKey === note.pinnedToRuleKey);

            return (
              <View key={note.id} style={styles.noteItem}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteHeaderLeft}>
                    <Icon name="mic" size={16} color={colors.primary} />
                    <Text style={styles.noteDuration}>
                      {note.durationSeconds}s audio recording
                    </Text>
                    {note.isEdited && (
                      <Badge label="Edited" variant="neutral" size="sm" />
                    )}
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => removeVoiceNote(note.id)}
                    style={styles.deleteNoteBtn}
                  >
                    <Icon name="trash" size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                {pinnedRule && (
                  <View style={styles.pinnedPill}>
                    <Icon name="pin" size={12} color={colors.primaryLight} />
                    <Text style={styles.pinnedPillText}>
                      Pinned to: {pinnedRule.name}
                    </Text>
                  </View>
                )}

                {isEditing ? (
                  <View style={styles.editArea}>
                    <TextInput
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      style={styles.editInput}
                    />
                    <View style={styles.editActions}>
                      <Button
                        title="Cancel"
                        variant="ghost"
                        size="sm"
                        onPress={() => setEditingNoteId(null)}
                      />
                      <Button
                        title="Save Changes"
                        variant="primary"
                        size="sm"
                        onPress={() => handleSaveEdit(note.id)}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleStartEdit(note)}
                    style={styles.transcriptTouch}
                  >
                    <Text style={styles.transcriptText}>
                      "{note.transcript}"
                    </Text>
                    <Text style={styles.tapToEditHint}>Tap text to edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyNotesBox}>
            <Icon name="mic" size={32} color={colors.surfaceElevated} />
            <Text style={styles.emptyNotesText}>
              No voice notes recorded yet. Dictate your technician findings above.
            </Text>
          </View>
        )}
      </Card>

      {/* Nav Row */}
      <View style={styles.navRow}>
        <Button
          title="Back"
          variant="secondary"
          onPress={onPrev}
          leftIcon={<Icon name="chevron-left" size={18} color={colors.textPrimary} />}
          style={{ flex: 1 }}
        />
        <Button
          title="Next: Review & Submit"
          variant="primary"
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
  introHeader: {
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
    marginBottom: spacing.sm,
  },
  suggestionsContainer: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    gap: spacing.xs,
  },
  suggestionChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  suggestionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  suggestionTextSelected: {
    color: colors.primaryLight,
    fontWeight: typography.weights.bold,
  },
  noteItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteDuration: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  deleteNoteBtn: {
    padding: 4,
  },
  pinnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.xs,
    gap: 4,
  },
  pinnedPillText: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: typography.weights.semibold,
  },
  transcriptTouch: {
    marginTop: 2,
  },
  transcriptText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  tapToEditHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  editArea: {
    marginTop: spacing.xs,
  },
  editInput: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 60,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyNotesBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyNotesText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

