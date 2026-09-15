import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { WarrantyCase } from '../../types';

interface CaseDetailScreenProps {
  caseItem: WarrantyCase;
  onBack: () => void;
  onEditEvidence: (caseItem: WarrantyCase) => void;
}

export const CaseDetailScreen: React.FC<CaseDetailScreenProps> = ({
  caseItem,
  onBack,
  onEditEvidence,
}) => {
  const insets = useSafeAreaInsets();
  const isFlagged = caseItem.status === 'Flagged';

  return (
    <View style={styles.container}>
      <Header
        title={`RO: ${caseItem.roNumber}`}
        subtitle={caseItem.siteName || 'Booran Workshop'}
        roNumber={caseItem.roNumber}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Status & Flag Notice */}
        {isFlagged && (
          <View style={styles.flagCard}>
            <View style={styles.flagHeader}>
              <Icon name="flag" size={20} color={colors.flagged} />
              <Text style={styles.flagTitle}>Evidence Action Required</Text>
            </View>
            <Text style={styles.flagDesc}>
              {caseItem.clerkNotes || 'Warranty clerk flagged this pack for missing or unclear evidence.'}
            </Text>
            {caseItem.flagHistory?.map((f, i) => (
              <View key={i} style={styles.flagHistoryItem}>
                <Text style={styles.flagHistoryCode}>{f.reasonCode}</Text>
                <Text style={styles.flagHistoryText}>{f.instruction}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Vehicle Identity Card */}
        <Card title="Vehicle Identification">
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>MAKE & MODEL</Text>
              <Text style={styles.fieldValue}>
                {caseItem.year} {caseItem.make} {caseItem.model}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>POWERTRAIN</Text>
              <Badge label={caseItem.powertrain || 'EV'} variant="primary" size="sm" />
            </View>
            <View style={styles.gridItemFull}>
              <Text style={styles.fieldLabel}>VIN</Text>
              <Text style={styles.vinValue}>{caseItem.vin || 'NOT CAPTURED'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>ODOMETER</Text>
              <Text style={styles.fieldValue}>
                {caseItem.odometer ? `${caseItem.odometer.toLocaleString()} km` : 'N/A'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>CLAIM NUMBER</Text>
              <Text style={styles.fieldValue}>{caseItem.claimNumber || 'Pending'}</Text>
            </View>
          </View>
        </Card>

        {/* Fault & Concern Card */}
        <Card title="Concern & Fault Type">
          <Text style={styles.concernTitleText}>
            {caseItem.concernTitle || 'No title entered'}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={caseItem.faultCategory || 'General'} variant="neutral" size="sm" />
            <Badge label={caseItem.repairStage || 'Repair complete'} variant="neutral" size="sm" />
            {caseItem.partReplaced && <Badge label="Part Replaced" variant="warning" size="sm" />}
            {caseItem.noiseFault && <Badge label="Noise/Video" variant="danger" size="sm" />}
          </View>
        </Card>

        {/* Captured Evidence Gallery */}
        <Card title={`Captured Evidence (${caseItem.evidenceItems?.length || 0})`}>
          {caseItem.evidenceItems && caseItem.evidenceItems.length > 0 ? (
            caseItem.evidenceItems.map((ev, idx) => (
              <View key={idx} style={styles.evidenceRow}>
                <View style={styles.evidenceIcon}>
                  <Icon
                    name={ev.mediaType === 'video' ? 'video' : 'camera'}
                    size={18}
                    color={colors.primaryLight}
                  />
                </View>
                <View style={styles.evidenceDetails}>
                  <Text style={styles.evidenceName}>{ev.ruleName || ev.ruleKey}</Text>
                  <Text style={styles.oemName}>{ev.oemFileName}</Text>
                </View>
                <Badge label="Verified" variant="success" size="sm" />
              </View>
            ))
          ) : (
            <Text style={styles.noEvidenceText}>No evidence items recorded yet.</Text>
          )}
        </Card>

        {/* Voice to Tech Notes */}
        {caseItem.voiceNotes && caseItem.voiceNotes.length > 0 && (
          <Card title={`Voice to Tech Notes (${caseItem.voiceNotes.length})`}>
            {caseItem.voiceNotes.map((vn, idx) => (
              <View key={idx} style={styles.voiceNoteRow}>
                <Icon name="mic" size={16} color={colors.primary} />
                <View style={styles.voiceNoteTextContainer}>
                  <Text style={styles.voiceNoteTranscript}>"{vn.transcript}"</Text>
                  <Text style={styles.voiceNoteMeta}>
                    Recorded · {vn.durationSeconds}s duration
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={isFlagged ? "Resolve Clerk Flag" : "Re-open Case Evidence"}
          variant={isFlagged ? "danger" : "primary"}
          size="lg"
          onPress={() => onEditEvidence(caseItem)}
          leftIcon={<Icon name={isFlagged ? "flag" : "camera"} size={18} color={colors.textPrimary} />}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  flagCard: {
    backgroundColor: colors.flaggedLight,
    borderWidth: 1,
    borderColor: 'rgba(225, 31, 38, 0.25)',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  flagTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.flagged,
  },
  flagDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  flagHistoryItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    marginTop: spacing.xs,
  },
  flagHistoryCode: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: colors.flagged,
  },
  flagHistoryText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '47%',
  },
  gridItemFull: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  vinValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
  },
  concernTitleText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  evidenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  evidenceDetails: {
    flex: 1,
  },
  evidenceName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  oemName: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noEvidenceText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  voiceNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  voiceNoteTextContainer: {
    flex: 1,
  },
  voiceNoteTranscript: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  voiceNoteMeta: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
