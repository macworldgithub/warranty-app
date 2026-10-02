import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Camera,
  Check,
  X,
  Minus,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { hoistApi } from '../../api/hoist.api';
import {
  Hoist,
  HOIST_CHECKLIST_TEMPLATE,
  ChecklistItemStatus,
  InspectionStatus,
  FaultSeverity,
} from '../../types/hoist.types';

interface HoistInspectionScreenProps {
  hoist: Hoist;
  onBack: () => void;
  onInspectionCompleted: () => void;
}

export const HoistInspectionScreen: React.FC<HoistInspectionScreenProps> = ({
  hoist,
  onBack,
  onInspectionCompleted,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Initialize all 9 checklist items to PASS by default for quick validation
  const [checklist, setChecklist] = useState<Record<string, ChecklistItemStatus>>(() => {
    const initial: Record<string, ChecklistItemStatus> = {};
    HOIST_CHECKLIST_TEMPLATE.forEach((item) => {
      initial[item.id] = 'PASS';
    });
    return initial;
  });

  const [faultNotes, setFaultNotes] = useState('');
  const [faultSeverity, setFaultSeverity] = useState<FaultSeverity>('NONE');
  const [lockoutTagout, setLockoutTagout] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasAnyFault = useMemo(() => {
    return Object.values(checklist).some((s) => s === 'FAULT');
  }, [checklist]);

  const handleSetItemStatus = (itemId: string, status: ChecklistItemStatus) => {
    setChecklist((prev) => {
      const next = { ...prev, [itemId]: status };
      const hasFault = Object.values(next).some((s) => s === 'FAULT');
      if (hasFault && faultSeverity === 'NONE') {
        setFaultSeverity('MINOR');
      } else if (!hasFault) {
        setFaultSeverity('NONE');
      }
      return next;
    });
  };

  const handleQuickPassAll = () => {
    const allPass: Record<string, ChecklistItemStatus> = {};
    HOIST_CHECKLIST_TEMPLATE.forEach((item) => {
      allPass[item.id] = 'PASS';
    });
    setChecklist(allPass);
    setFaultNotes('');
    setFaultSeverity('NONE');
    setLockoutTagout(false);
  };

  const handleSubmit = async () => {
    if (hasAnyFault && !faultNotes.trim()) {
      Alert.alert(
        'Fault Details Required',
        'Please describe the fault or issue observed before submitting this checklist.',
      );
      return;
    }

    try {
      setSubmitting(true);

      const items = HOIST_CHECKLIST_TEMPLATE.map((tpl) => ({
        itemId: tpl.id,
        title: tpl.title,
        status: checklist[tpl.id] || 'PASS',
      }));

      const overallStatus: InspectionStatus = lockoutTagout
        ? 'TAGGED_OUT'
        : hasAnyFault
          ? 'FAULT_IDENTIFIED'
          : 'PASS';

      await hoistApi.submitInspection({
        hoistId: hoist.id,
        inspectorId: user?.id || 'usr_technician',
        inspectorName: user?.name || 'Technician',
        inspectorRole: user?.role || 'TECHNICIAN',
        shiftDate: new Date().toISOString().slice(0, 10),
        shiftType: 'DAILY',
        status: overallStatus,
        checklistItems: items,
        faultNotes: hasAnyFault ? faultNotes : undefined,
        faultSeverity: hasAnyFault ? faultSeverity : 'NONE',
        lockoutTagoutApplied: lockoutTagout,
        photos: [],
      });

      Alert.alert(
        'Inspection Submitted',
        `Pre-shift check for ${hoist.name} recorded successfully.`,
        [
          {
            text: 'Done',
            onPress: () => onInspectionCompleted(),
          },
        ],
      );
    } catch (err: any) {
      console.error('Failed to submit inspection:', err);
      Alert.alert(
        'Submission Error',
        err.message || 'Failed to submit checklist. Please verify your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pre-Shift Safety Check</Text>
          <Text style={styles.headerSubtitle}>{hoist.name} ({hoist.brand})</Text>
        </View>
        <TouchableOpacity
          onPress={handleQuickPassAll}
          style={styles.quickPassButton}
        >
          <Text style={styles.quickPassText}>All Pass</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hoist Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBayBadge}>
            <Text style={styles.infoBayBadgeText}>{hoist.hoistNumber}</Text>
          </View>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>{hoist.name} · {hoist.type}</Text>
            <Text style={styles.infoBannerSub}>
              {hoist.facilityName} · Rated Capacity: {hoist.capacityKg} kg
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>9-Point Daily Safety Checklist</Text>

        {/* 9 Checklist Items */}
        <View style={styles.checklistContainer}>
          {HOIST_CHECKLIST_TEMPLATE.map((item, idx) => {
            const currentStatus = checklist[item.id] || 'PASS';

            return (
              <View
                key={item.id}
                style={[
                  styles.checklistItem,
                  currentStatus === 'FAULT'
                    ? styles.checklistItemFault
                    : currentStatus === 'PASS'
                      ? styles.checklistItemPass
                      : styles.checklistItemNA,
                ]}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.itemIndexCircle}>
                    <Text style={styles.itemIndexText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>

                {/* Status Toggle Buttons */}
                <View style={styles.itemButtonRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusBtn,
                      currentStatus === 'PASS' && styles.statusBtnPassActive,
                    ]}
                    onPress={() => handleSetItemStatus(item.id, 'PASS')}
                    activeOpacity={0.7}
                  >
                    <Check
                      size={14}
                      color={currentStatus === 'PASS' ? colors.textInverse : colors.accentEmerald}
                    />
                    <Text
                      style={[
                        styles.statusBtnText,
                        currentStatus === 'PASS' && styles.statusBtnTextActive,
                      ]}
                    >
                      Pass
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusBtn,
                      currentStatus === 'FAULT' && styles.statusBtnFaultActive,
                    ]}
                    onPress={() => handleSetItemStatus(item.id, 'FAULT')}
                    activeOpacity={0.7}
                  >
                    <X
                      size={14}
                      color={currentStatus === 'FAULT' ? colors.textInverse : colors.danger}
                    />
                    <Text
                      style={[
                        styles.statusBtnText,
                        currentStatus === 'FAULT' && styles.statusBtnTextActive,
                      ]}
                    >
                      Fault
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusBtn,
                      currentStatus === 'NA' && styles.statusBtnNAActive,
                    ]}
                    onPress={() => handleSetItemStatus(item.id, 'NA')}
                    activeOpacity={0.7}
                  >
                    <Minus
                      size={14}
                      color={currentStatus === 'NA' ? colors.textInverse : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusBtnText,
                        currentStatus === 'NA' && styles.statusBtnTextActive,
                      ]}
                    >
                      N/A
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Fault Capture Section if any fault detected */}
        {hasAnyFault && (
          <View style={styles.faultSection}>
            <View style={styles.faultHeaderRow}>
              <AlertTriangle size={18} color={colors.danger} />
              <Text style={styles.faultSectionTitle}>Fault & Lockout Details</Text>
            </View>

            <Text style={styles.inputLabel}>Fault Description *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the defect, damaged component, or hydraulic leak observed..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={faultNotes}
              onChangeText={setFaultNotes}
            />

            <Text style={styles.inputLabel}>Severity Classification</Text>
            <View style={styles.severityRow}>
              {(['MINOR', 'MODERATE', 'CRITICAL'] as FaultSeverity[]).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.severityBtn,
                    faultSeverity === sev && styles.severityBtnActive,
                  ]}
                  onPress={() => setFaultSeverity(sev)}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      faultSeverity === sev && styles.severityBtnTextActive,
                    ]}
                  >
                    {sev}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Lockout / Tagout Switch */}
            <View style={styles.lockoutRow}>
              <View style={styles.lockoutInfo}>
                <Lock size={18} color={colors.danger} />
                <View>
                  <Text style={styles.lockoutTitle}>Apply Lockout / Tagout</Text>
                  <Text style={styles.lockoutSubtitle}>
                    Mark hoist OUT OF SERVICE and isolate control power
                  </Text>
                </View>
              </View>
              <Switch
                value={lockoutTagout}
                onValueChange={setLockoutTagout}
                trackColor={{ false: '#E2E8F0', true: colors.dangerLight }}
                thumbColor={lockoutTagout ? colors.danger : '#94A3B8'}
              />
            </View>
          </View>
        )}

        {/* Inspector Sign-off Stamp */}
        <View style={styles.signOffCard}>
          <ShieldCheck size={18} color={colors.accentEmerald} />
          <View style={styles.signOffTextContainer}>
            <Text style={styles.signOffTitle}>Digital Pre-Shift Sign-Off</Text>
            <Text style={styles.signOffSubtitle}>
              Logged by: {user?.name || 'Technician'} ({user?.role || 'TECHNICIAN'}) · Shift Date:{' '}
              {new Date().toISOString().slice(0, 10)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Submit Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <CheckCircle2 size={18} color={colors.textInverse} />
              <Text style={styles.submitButtonText}>
                {hasAnyFault ? 'Submit with Fault Flags' : 'Sign & Complete Inspection'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceElevated,
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  quickPassButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.successLight,
  },
  quickPassText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentEmerald,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
    marginBottom: 16,
  },
  infoBayBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBayBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textInverse,
  },
  infoBannerText: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  infoBannerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  checklistContainer: {
    gap: 8,
    marginBottom: 16,
  },
  checklistItem: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
  checklistItemPass: {
    borderColor: '#E2E8F0',
  },
  checklistItemFault: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  checklistItemNA: {
    borderColor: '#E2E8F0',
    backgroundColor: colors.backgroundSecondary,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemIndexCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  itemIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  itemButtonRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  statusBtnPassActive: {
    backgroundColor: colors.accentEmerald,
  },
  statusBtnFaultActive: {
    backgroundColor: colors.danger,
  },
  statusBtnNAActive: {
    backgroundColor: colors.secondary,
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusBtnTextActive: {
    color: colors.textInverse,
  },
  faultSection: {
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 16,
  },
  faultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  faultSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dangerDark,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 10,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  severityBtnActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  severityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  severityBtnTextActive: {
    color: colors.textInverse,
  },
  lockoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  lockoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  lockoutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
  },
  lockoutSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  signOffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
  signOffTextContainer: {
    flex: 1,
  },
  signOffTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  signOffSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevated,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textInverse,
  },
});
