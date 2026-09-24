import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
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
import { EvidenceItem, WarrantyCase } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { casesApi } from '../../api';
import { getBaseServerUrl } from '../../config/env';

interface CaseDetailScreenProps {
  caseItem: WarrantyCase;
  onBack: () => void;
  onEditEvidence: (caseItem: WarrantyCase) => void;
  onCaseUpdated?: (updatedCase: WarrantyCase) => void;
}

const REJECT_REASONS = [
  { code: 'POOR_LIGHTING_BLUR', label: 'Blurry / Glare' },
  { code: 'UNREADABLE_VIN', label: 'Unreadable VIN' },
  { code: 'MISSING_SHOT', label: 'Missing Shot' },
  { code: 'NO_DTC', label: 'Missing DTC Scan' },
  { code: 'WRONG_ANGLE', label: 'Wrong Angle' },
  { code: 'NO_SERIAL', label: 'Missing Barcode' },
  { code: 'OTHER', label: 'Other Discrepancy' },
];

export const CaseDetailScreen: React.FC<CaseDetailScreenProps> = ({
  caseItem,
  onBack,
  onEditEvidence,
  onCaseUpdated,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [currentCase, setCurrentCase] = useState<WarrantyCase>(caseItem);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  // Helper to resolve full evidence image URI (supporting relative /uploads, file://, http(s)://)
  const getEvidenceUri = (ev?: Partial<EvidenceItem>): string | null => {
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

  // Helper to open / play video evidence via system media player
  const handlePlayVideo = async (uri: string | null) => {
    if (!uri) {
      Alert.alert('Cannot Play Video', 'No valid video file URL found for this evidence.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen || Platform.OS === 'android') {
        await Linking.openURL(uri);
      } else {
        Alert.alert('Cannot Play Video', 'No application found to stream or play this video.');
      }
    } catch (err) {
      console.warn('Failed to open video with Linking.openURL:', err);
      Linking.openURL(uri).catch(() => {
        Alert.alert('Playback Error', 'Unable to launch native media player for this video.');
      });
    }
  };

  // Accept Form State
  const [claimNumber, setClaimNumber] = useState(
    currentCase.claimNumber || `CLM-${currentCase.roNumber || Date.now().toString().slice(-4)}`
  );
  const [acceptNotes, setAcceptNotes] = useState('');

  // Reject Form State
  const [selectedReasonCode, setSelectedReasonCode] = useState('POOR_LIGHTING_BLUR');
  const [rejectComments, setRejectComments] = useState('');

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'CLERK' ||
    user?.role === 'SERVICE_MANAGER' ||
    user?.role === 'SERVICE_ADVISOR';

  const isAwaiting = currentCase.status === 'Awaiting Review';
  const isFlagged = currentCase.status === 'Flagged';
  const isSubmitted = currentCase.status === 'Submitted';

  // Handle Accept / Approve Case
  const handleConfirmAccept = async () => {
    setActionLoading(true);
    try {
      const updated = await casesApi.markSubmitted(currentCase.id, {
        claimNumber: claimNumber.trim() || `CLM-${currentCase.roNumber}`,
        internalClerkNotes: acceptNotes.trim() || 'Approved by Admin in mobile portal',
      });
      const resolvedCase: WarrantyCase = updated?.id
        ? updated
        : {
          ...currentCase,
          status: 'Submitted' as const,
          claimNumber: claimNumber.trim() || `CLM-${currentCase.roNumber}`,
          clerkNotes: acceptNotes.trim() || 'Approved by Admin in mobile portal',
        };
      setCurrentCase(resolvedCase);
      onCaseUpdated?.(resolvedCase);
      setAcceptModalVisible(false);
      Alert.alert(
        'Case Accepted & Approved',
        `RO #${currentCase.roNumber} has been verified and marked as Submitted under claim #${resolvedCase.claimNumber}.`
      );
    } catch (err: any) {
      Alert.alert('Accept Failed', err.message || 'Could not approve case. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject / Flag Case
  const handleConfirmReject = async () => {
    if (!rejectComments.trim()) {
      Alert.alert('Comment Required', 'Please provide specific instructions or reason for rejection.');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await casesApi.flagCase(currentCase.id, {
        evidenceRuleKey: currentCase.evidenceItems?.[0]?.ruleKey || 'general',
        reasonCode: selectedReasonCode,
        instruction: rejectComments.trim(),
        flaggedBy: user?.name ? `${user.name} (Admin)` : 'Warranty Admin',
      });
      const resolvedCase: WarrantyCase = updated?.id
        ? updated
        : {
          ...currentCase,
          status: 'Flagged' as const,
          clerkNotes: rejectComments.trim(),
          flagHistory: [
            ...(currentCase.flagHistory || []),
            {
              id: `flag_${Date.now()}`,
              reasonCode: selectedReasonCode as any,
              instruction: rejectComments.trim(),
              flaggedAt: new Date().toISOString(),
              flaggedBy: user?.name ? `${user.name} (Admin)` : 'Warranty Admin',
            },
          ],
        };
      setCurrentCase(resolvedCase);
      onCaseUpdated?.(resolvedCase);
      setRejectModalVisible(false);
      setRejectComments('');
      Alert.alert(
        'Case Rejected & Flagged',
        `RO #${currentCase.roNumber} has been flagged. Push notification and retake instruction sent to the technician.`
      );
    } catch (err: any) {
      Alert.alert('Rejection Failed', err.message || 'Could not flag case. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={`RO: ${currentCase.roNumber}`}
        subtitle={currentCase.siteName || 'Booran Workshop'}
        roNumber={currentCase.roNumber}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* Status Banners */}
        {isAwaiting && (
          <View style={styles.awaitingCard}>
            <View style={styles.awaitingHeader}>
              <View style={styles.awaitingIconContainer}>
                <Icon name="clock" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.awaitingTitle}>Awaiting Warranty Review</Text>
                <Text style={styles.awaitingDesc}>
                  Submitted by {currentCase.technicianName || 'Technician'}. All mandatory Attachment A evidence has been uploaded for verification.
                </Text>
              </View>
            </View>
            {isAdmin && (
              <View style={styles.adminActionHint}>
                <Icon name="shield" size={14} color="#B45309" />
                <Text style={styles.adminActionHintText}>
                  As Admin/Clerk, review the captured evidence and select Accept or Reject below.
                </Text>
              </View>
            )}
          </View>
        )}

        {isFlagged && (
          <View style={styles.flagCard}>
            <View style={styles.flagHeader}>
              <Icon name="flag" size={20} color={colors.flagged} />
              <Text style={styles.flagTitle}>Evidence Action Required</Text>
            </View>
            <Text style={styles.flagDesc}>
              {currentCase.clerkNotes || 'Warranty clerk flagged this pack for missing or unclear evidence.'}
            </Text>
            {currentCase.flagHistory?.map((f, i) => (
              <View key={i} style={styles.flagHistoryItem}>
                <Text style={styles.flagHistoryCode}>{f.reasonCode}</Text>
                <Text style={styles.flagHistoryText}>{f.instruction}</Text>
              </View>
            ))}
          </View>
        )}

        {isSubmitted && (
          <View style={styles.submittedCard}>
            <View style={styles.submittedHeader}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.submittedTitle}>Case Approved & Submitted</Text>
            </View>
            <Text style={styles.submittedDesc}>
              Claim #{currentCase.claimNumber || 'Recorded'} has been submitted to the OEM portal. Case edits are locked.
            </Text>
          </View>
        )}

        {/* Vehicle Identity Card */}
        <Card title="Vehicle Identification">
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>MAKE & MODEL</Text>
              <Text style={styles.fieldValue}>
                {currentCase.year} {currentCase.make} {currentCase.model}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>POWERTRAIN</Text>
              <Badge label={currentCase.powertrain || 'EV'} variant="primary" size="sm" />
            </View>
            <View style={styles.gridItemFull}>
              <Text style={styles.fieldLabel}>VIN</Text>
              <Text style={styles.vinValue}>{currentCase.vin || 'NOT CAPTURED'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>ODOMETER</Text>
              <Text style={styles.fieldValue}>
                {currentCase.odometer ? `${currentCase.odometer.toLocaleString()} km` : 'N/A'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>STATUS</Text>
              <Badge
                label={currentCase.status}
                variant={
                  currentCase.status === 'Submitted'
                    ? 'success'
                    : currentCase.status === 'Flagged'
                      ? 'danger'
                      : currentCase.status === 'Awaiting Review'
                        ? 'warning'
                        : 'neutral'
                }
                size="sm"
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>CLAIM NUMBER</Text>
              <Text style={styles.fieldValue}>{currentCase.claimNumber || 'Pending'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>TECHNICIAN</Text>
              <Text style={styles.fieldValue}>{currentCase.technicianName || 'Jake Smith'}</Text>
            </View>
          </View>
        </Card>

        {/* Fault & Concern Card */}
        <Card title="Concern & Fault Type">
          <Text style={styles.concernTitleText}>
            {currentCase.concernTitle || 'No title entered'}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={currentCase.faultCategory || 'General'} variant="neutral" size="sm" />
            <Badge label={currentCase.repairStage || 'Repair complete'} variant="neutral" size="sm" />
            {currentCase.partReplaced && <Badge label="Part Replaced" variant="warning" size="sm" />}
            {currentCase.noiseFault && <Badge label="Noise/Video" variant="danger" size="sm" />}
          </View>
        </Card>

        {/* Captured Evidence Gallery */}
        <Card title={`Captured Evidence (${currentCase.evidenceItems?.length || 0})`}>
          {currentCase.evidenceItems && currentCase.evidenceItems.length > 0 ? (
            <View style={styles.evidenceGallery}>
              {currentCase.evidenceItems.map((ev, idx) => {
                const imgUri = getEvidenceUri(ev);
                const isVideo = ev.mediaType === 'video';

                return (
                  <View key={ev.id || `${ev.ruleKey}-${idx}`} style={styles.evidenceCardContainer}>
                    {/* Header with Title and Verification Status */}
                    <View style={styles.evidenceCardHeader}>
                      <View style={styles.evidenceHeaderLeft}>
                        <View
                          style={[
                            styles.evidenceMiniIcon,
                            isVideo && styles.evidenceMiniIconVideo,
                          ]}
                        >
                          <Icon
                            name={isVideo ? 'video' : 'camera'}
                            size={16}
                            color={isVideo ? '#D97706' : colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.evidenceCardTitle} numberOfLines={1}>
                            {ev.ruleName || ev.name || ev.ruleKey}
                          </Text>
                          <Text style={styles.evidenceCardSub} numberOfLines={1}>
                            {ev.oemFileName || `Item #${idx + 1}`}
                          </Text>
                        </View>
                      </View>

                      <Badge
                        label={
                          ev.isVerifiedByClerk
                            ? 'Verified'
                            : ev.qualityStatus === 'PASSED'
                            ? 'Pass'
                            : ev.qualityStatus || 'Captured'
                        }
                        variant={
                          ev.isVerifiedByClerk || ev.qualityStatus === 'PASSED'
                            ? 'success'
                            : ev.qualityStatus === 'FAILED'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      />
                    </View>

                    {/* Image / Video Media Preview */}
                    {isVideo ? (
                      <View style={styles.videoCardWrapper}>
                        <View style={styles.videoCardHeader}>
                          <View style={styles.videoBadge}>
                            <Icon name="video" size={13} color="#3B82F6" />
                            <Text style={styles.videoBadgeText}>MP4 Video Evidence</Text>
                          </View>
                          {ev.durationSeconds ? (
                            <View style={styles.videoDurationPill}>
                              <Text style={styles.videoDurationText}>{ev.durationSeconds}s</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.videoCenterPlayContainer}>
                          <TouchableOpacity
                            style={styles.videoPlayCircle}
                            activeOpacity={0.8}
                            onPress={() => handlePlayVideo(imgUri)}
                          >
                            <Icon name="play" size={26} color="#FFFFFF" />
                          </TouchableOpacity>
                          <Text style={styles.videoCenterHint}>Tap to stream in media player</Text>
                        </View>

                        <View style={styles.videoCardBottomActions}>
                          <TouchableOpacity
                            style={styles.videoInspectChip}
                            activeOpacity={0.8}
                            onPress={() => setSelectedEvidence(ev)}
                          >
                            <Icon name="search" size={11} color="#CBD5E1" />
                            <Text style={styles.videoInspectChipText}>Evidence Info</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.videoDirectPlayBtn}
                            activeOpacity={0.8}
                            onPress={() => handlePlayVideo(imgUri)}
                          >
                            <Icon name="play" size={12} color="#FFFFFF" />
                            <Text style={styles.videoDirectPlayBtnText}>Play MP4</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.evidenceImageWrapper}
                        activeOpacity={0.88}
                        onPress={() => setSelectedEvidence(ev)}
                      >
                        {imgUri ? (
                          <Image
                            source={{ uri: imgUri }}
                            style={styles.evidenceImagePreview}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.evidencePlaceholderBox}>
                            <Icon
                              name="camera"
                              size={32}
                              color={colors.textMuted}
                            />
                            <Text style={styles.evidencePlaceholderText}>
                              Photo Evidence Captured
                            </Text>
                          </View>
                        )}

                        {/* Enlarge / Full-screen Indicator */}
                        <View style={styles.zoomChip}>
                          <Icon name="search" size={11} color="#FFFFFF" />
                          <Text style={styles.zoomChipText}>Tap to inspect</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* OCR Extracted Text Display */}
                    {ev.ocrExtractedText ? (
                      <View style={styles.evidenceOcrBanner}>
                        <Icon name="check-circle" size={14} color="#059669" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.evidenceOcrLabel}>OCR Match Result</Text>
                          <Text style={styles.evidenceOcrValue} numberOfLines={1}>
                            {ev.ocrExtractedText}
                          </Text>
                        </View>
                        {ev.ocrConfidence ? (
                          <Text style={styles.evidenceOcrConfidence}>
                            {Math.round(ev.ocrConfidence)}%
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noEvidenceText}>No evidence items recorded yet.</Text>
          )}
        </Card>

        {/* Voice to Tech Notes */}
        {currentCase.voiceNotes && currentCase.voiceNotes.length > 0 && (
          <Card title={`Voice to Tech Notes (${currentCase.voiceNotes.length})`}>
            {currentCase.voiceNotes.map((vn, idx) => (
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

      {/* Bottom Actions Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {isAdmin ? (
          isSubmitted ? (
            /* Case Submitted: Locked View */
            <View style={styles.submittedBar}>
              <Icon name="lock" size={16} color={colors.textSecondary} />
              <Text style={styles.submittedBarText}>
                Claim Submitted · OEM Approved
              </Text>
            </View>
          ) : isFlagged ? (
            /* Flagged Case: Removed accept/reject buttons for Admin while case is returned to technician */
            <View style={styles.adminFlaggedBar}>
              <Icon name="flag" size={16} color={colors.flagged} />
              <Text style={styles.adminFlaggedText}>
                Case Flagged · Returned to Technician for Correction
              </Text>
            </View>
          ) : isAwaiting ? (
            /* Admin on Awaiting Case: Two prominent options Accept or Reject with Comments */
            <View style={styles.adminButtonGroup}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => setRejectModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>Reject with Comments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => setAcceptModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>Accept Case</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.submittedBar}>
              <Icon name="info" size={16} color={colors.textSecondary} />
              <Text style={styles.submittedBarText}>
                Case in Draft · Technician In Progress
              </Text>
            </View>
          )
        ) : isAwaiting ? (
          /* Technician on Awaiting Case: Informative status */
          <View style={styles.techAwaitingBar}>
            <Icon name="clock" size={18} color="#B45309" />
            <Text style={styles.techAwaitingText}>
              Case Submitted · Awaiting Clerk Audit
            </Text>
          </View>
        ) : isSubmitted ? (
          /* Case Submitted: Locked View */
          <View style={styles.submittedBar}>
            <Icon name="lock" size={16} color={colors.textSecondary} />
            <Text style={styles.submittedBarText}>
              Claim Submitted · Edits Locked
            </Text>
          </View>
        ) : (
          /* Standard Technician Action: Resolve Flag or Edit */
          <Button
            title={isFlagged ? "Resolve Clerk Flag" : "Re-open Case Evidence"}
            variant={isFlagged ? "danger" : "primary"}
            size="lg"
            onPress={() => onEditEvidence(currentCase)}
            leftIcon={<Icon name={isFlagged ? "flag" : "camera"} size={18} color={colors.textPrimary} />}
            fullWidth
          />
        )}
      </View>

      {/* ========================================================= */}
      {/* ACCEPT CASE MODAL                                        */}
      {/* ========================================================= */}
      <Modal
        visible={acceptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAcceptModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.acceptIconBadge}>
                <Icon name="check-circle" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Accept Warranty Case</Text>
                <Text style={styles.modalSubtitle}>
                  RO #{currentCase.roNumber} · {currentCase.make} {currentCase.model}
                </Text>
              </View>
            </View>

            <Text style={styles.modalInstruction}>
              Confirm that all mandatory Attachment A evidence and OEM checklist items are complete and verified.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OEM Claim / Reference #</Text>
              <TextInput
                style={styles.textInput}
                value={claimNumber}
                onChangeText={setClaimNumber}
                placeholder="E.g., BYD-CLM-2026-9841"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Clerk Approval Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={acceptNotes}
                onChangeText={setAcceptNotes}
                placeholder="Verified Attachment A evidence and scanner DTCs."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setAcceptModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmAcceptBtn, actionLoading && styles.btnDisabled]}
                onPress={handleConfirmAccept}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Accept & Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* REJECT WITH COMMENTS MODAL                                */}
      {/* ========================================================= */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.rejectIconBadge}>
                <Icon name="flag" size={24} color={colors.flagged} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reject with Comments</Text>
                <Text style={styles.modalSubtitle}>
                  RO #{currentCase.roNumber} · Send Back to Tech
                </Text>
              </View>
            </View>

            <Text style={styles.modalInstruction}>
              Select the primary reason for rejection and provide specific instructions for the workshop technician.
            </Text>

            {/* Reason Chips Selector */}
            <Text style={styles.inputLabel}>Rejection Reason</Text>
            <View style={styles.reasonChipContainer}>
              {REJECT_REASONS.map((r) => {
                const isSelected = selectedReasonCode === r.code;
                return (
                  <TouchableOpacity
                    key={r.code}
                    style={[
                      styles.reasonChip,
                      isSelected && styles.reasonChipSelected,
                    ]}
                    onPress={() => setSelectedReasonCode(r.code)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        isSelected && styles.reasonChipTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Instruction / Comments Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Rejection Instructions / Technician Comments <Text style={{ color: colors.flagged }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={rejectComments}
                onChangeText={setRejectComments}
                placeholder="E.g., The VIN compliance plate photo is blurry. Please wipe the lens, use a torch, and retake."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmRejectBtn,
                  (!rejectComments.trim() || actionLoading) && styles.btnDisabled,
                ]}
                onPress={handleConfirmReject}
                disabled={!rejectComments.trim() || actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="flag" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Confirm Rejection</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* FULL-SCREEN EVIDENCE LIGHTBOX MODAL                       */}
      {/* ========================================================= */}
      <Modal
        visible={!!selectedEvidence}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvidence(null)}
      >
        <View style={styles.lightboxOverlay}>
          {/* Top Header Bar */}
          <View style={[styles.lightboxHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {selectedEvidence?.ruleName || selectedEvidence?.name || selectedEvidence?.ruleKey}
              </Text>
              <Text style={styles.lightboxSubtitle} numberOfLines={1}>
                {selectedEvidence?.oemFileName || `RO #${currentCase.roNumber}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setSelectedEvidence(null)}
              activeOpacity={0.8}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Screen Image / Video Body */}
          <View style={styles.lightboxBody}>
            {(() => {
              const selectedUri = selectedEvidence ? getEvidenceUri(selectedEvidence) : null;
              const isSelectedVideo = Boolean(
                selectedEvidence?.mediaType === 'video' ||
                selectedEvidence?.storageUrl?.toLowerCase().endsWith('.mp4') ||
                selectedEvidence?.storageUrl?.toLowerCase().endsWith('.mov') ||
                selectedEvidence?.fileUri?.toLowerCase().endsWith('.mp4') ||
                selectedEvidence?.fileUri?.toLowerCase().endsWith('.mov') ||
                selectedUri?.toLowerCase().endsWith('.mp4') ||
                selectedUri?.toLowerCase().endsWith('.mov')
              );

              if (selectedEvidence && isSelectedVideo) {
                return (
                  <View style={styles.lightboxVideoContainer}>
                    <View style={styles.lightboxVideoIconRing}>
                      <Icon name="video" size={44} color="#60A5FA" />
                    </View>
                    <Text style={styles.lightboxVideoTitle} numberOfLines={2}>
                      {selectedEvidence.ruleName || selectedEvidence.name || selectedEvidence.ruleKey || 'Video Evidence Recording'}
                    </Text>
                    <Text style={styles.lightboxVideoSubtitle}>
                      {selectedEvidence.durationSeconds ? `${selectedEvidence.durationSeconds}s Duration • ` : ''}H.264 / AAC MP4 Recording
                    </Text>

                    <TouchableOpacity
                      style={styles.lightboxPlayButton}
                      activeOpacity={0.85}
                      onPress={() => handlePlayVideo(selectedUri)}
                    >
                      <Icon name="play" size={22} color="#FFFFFF" />
                      <Text style={styles.lightboxPlayButtonText}>Play Video in Media Player</Text>
                    </TouchableOpacity>

                    <Text style={styles.lightboxVideoHint}>
                      Streams with native hardware acceleration, audio, and scrub controls.
                    </Text>
                  </View>
                );
              }

              if (selectedEvidence && selectedUri) {
                return (
                  <Image
                    source={{ uri: selectedUri }}
                    style={styles.lightboxImage}
                    resizeMode="contain"
                  />
                );
              }

              return (
                <View style={styles.lightboxNoImage}>
                  <Icon
                    name={isSelectedVideo ? 'video' : 'camera'}
                    size={48}
                    color="#94A3B8"
                  />
                  <Text style={styles.lightboxNoImageText}>
                    {isSelectedVideo
                      ? 'Video Media File'
                      : 'Image File Not Available'}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Bottom Bar Info */}
          <View
            style={[
              styles.lightboxFooter,
              { paddingBottom: Math.max(insets.bottom + 12, 24) },
            ]}
          >
            {selectedEvidence?.ocrExtractedText ? (
              <View style={styles.lightboxOcrBox}>
                <Icon name="check-circle" size={16} color="#34D399" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lightboxOcrLabel}>OCR Readout Verified</Text>
                  <Text style={styles.lightboxOcrText}>
                    {selectedEvidence.ocrExtractedText}
                  </Text>
                </View>
                {selectedEvidence.ocrConfidence ? (
                  <Badge
                    label={`${Math.round(selectedEvidence.ocrConfidence)}% Conf.`}
                    variant="success"
                    size="sm"
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.lightboxMetaRow}>
              <View style={styles.lightboxMetaItem}>
                <Text style={styles.lightboxMetaLabel}>QUALITY</Text>
                <Text style={styles.lightboxMetaValue}>
                  {selectedEvidence?.qualityStatus || 'Verified (Pass)'}
                </Text>
              </View>
              <View style={styles.lightboxMetaItem}>
                <Text style={styles.lightboxMetaLabel}>RO NUMBER</Text>
                <Text style={styles.lightboxMetaValue}>{currentCase.roNumber}</Text>
              </View>
              <View style={styles.lightboxMetaItem}>
                <Text style={styles.lightboxMetaLabel}>VEHICLE</Text>
                <Text style={styles.lightboxMetaValue}>
                  {currentCase.make} {currentCase.model}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  awaitingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  awaitingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  awaitingIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  awaitingTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  awaitingDesc: {
    fontSize: typography.sizes.xs,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 18,
  },
  adminActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  adminActionHintText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: '#78350F',
    flex: 1,
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
  submittedCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  submittedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  submittedTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  submittedDesc: {
    fontSize: typography.sizes.xs,
    color: '#065F46',
    lineHeight: 18,
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
  evidenceGallery: {
    gap: spacing.md,
  },
  evidenceCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  evidenceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  evidenceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  evidenceMiniIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceMiniIconVideo: {
    backgroundColor: '#FEF3C7',
  },
  evidenceCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  evidenceCardSub: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  evidenceImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 190,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  evidenceImagePreview: {
    width: '100%',
    height: '100%',
  },
  evidencePlaceholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
  },
  evidencePlaceholderText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  videoOverlayBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -18 }],
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  videoOverlayDuration: {
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  zoomChip: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomChipText: {
    fontSize: typography.sizes.xs - 2,
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  evidenceOcrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  evidenceOcrLabel: {
    fontSize: typography.sizes.xs - 2,
    color: '#166534',
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  evidenceOcrValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#14532D',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  evidenceOcrConfidence: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  // Lightbox Styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 29, 0.96)',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lightboxTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  lightboxSubtitle: {
    fontSize: typography.sizes.xs,
    color: '#94A3B8',
    marginTop: 2,
  },
  lightboxCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  lightboxBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxNoImage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  lightboxNoImageText: {
    fontSize: typography.sizes.sm,
    color: '#94A3B8',
    fontWeight: typography.weights.medium,
  },
  lightboxFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  lightboxOcrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.sm,
  },
  lightboxOcrLabel: {
    fontSize: typography.sizes.xs - 2,
    color: '#34D399',
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  lightboxOcrText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lightboxMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lightboxMetaItem: {
    flex: 1,
  },
  lightboxMetaLabel: {
    fontSize: typography.sizes.xs - 2,
    color: '#64748B',
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  lightboxMetaValue: {
    fontSize: typography.sizes.xs,
    color: '#E2E8F0',
    fontWeight: typography.weights.semibold,
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 6,
  },
  adminButtonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptBtn: {
    backgroundColor: '#059669', // Emerald
  },
  rejectBtn: {
    backgroundColor: colors.flagged, // Red
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  techAwaitingBar: {
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  techAwaitingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#92400E',
  },
  submittedBar: {
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submittedBarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  adminFlaggedBar: {
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  adminFlaggedText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.flagged,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  acceptIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.flaggedLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalInstruction: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  reasonChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  reasonChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonChipSelected: {
    backgroundColor: colors.flaggedLight,
    borderColor: colors.flagged,
  },
  reasonChipText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  reasonChipTextSelected: {
    color: colors.flagged,
    fontWeight: typography.weights.bold,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelModalBtn: {
    flex: 1,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  confirmAcceptBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmRejectBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.flagged,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  // Video Card Styles
  videoCardWrapper: {
    width: '100%',
    height: 190,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: spacing.borderRadius.sm,
  },
  videoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: spacing.borderRadius.full,
  },
  videoBadgeText: {
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.bold,
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  videoDurationPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoDurationText: {
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  videoCenterPlayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoPlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  videoCenterHint: {
    fontSize: typography.sizes.xs - 1,
    color: '#94A3B8',
    fontWeight: typography.weights.medium,
  },
  videoCardBottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoInspectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoInspectChipText: {
    fontSize: typography.sizes.xs - 2,
    color: '#CBD5E1',
    fontWeight: typography.weights.medium,
  },
  videoDirectPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoDirectPlayBtnText: {
    fontSize: typography.sizes.xs - 2,
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  // Lightbox Video Modal
  lightboxVideoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#0F172A',
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '92%',
    maxWidth: 380,
  },
  lightboxVideoIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lightboxVideoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  lightboxVideoSubtitle: {
    fontSize: typography.sizes.xs,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  lightboxPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  lightboxPlayButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  lightboxVideoHint: {
    fontSize: typography.sizes.xs - 2,
    color: '#64748B',
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
