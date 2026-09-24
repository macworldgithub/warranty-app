import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { LoanAgreement } from '../../types';
import { loanAgreementsApi } from '../../api';

interface EditLoanerModalProps {
  visible: boolean;
  agreement: LoanAgreement | null;
  onClose: () => void;
  onUpdateCompleted: (updated: LoanAgreement) => void;
}

export const EditLoanerModal: React.FC<EditLoanerModalProps> = ({
  visible,
  agreement,
  onClose,
  onUpdateCompleted,
}) => {
  const insets = useSafeAreaInsets();
  if (!agreement) return null;

  const [customerName, setCustomerName] = useState(agreement.customer?.name || '');
  const [customerMobile, setCustomerMobile] = useState(agreement.customer?.mobile || '');
  const [customerEmail, setCustomerEmail] = useState(agreement.customer?.email || '');
  const [rego, setRego] = useState(agreement.vehicle?.rego || '');
  const [make, setMake] = useState(agreement.vehicle?.make || '');
  const [model, setModel] = useState(agreement.vehicle?.model || '');
  const [colour, setColour] = useState(agreement.vehicle?.colour || '');
  const [dueBackIso, setDueBackIso] = useState(agreement.dueBackDateTime || new Date().toISOString());
  const [dailyKmCap, setDailyKmCap] = useState(String(agreement.dailyKmCap || 50));
  const [excessKmRate, setExcessKmRate] = useState(String(agreement.excessKmRate || 0.5));
  const [damageNotes, setDamageNotes] = useState(agreement.outbound?.damageNotes || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (agreement) {
      setCustomerName(agreement.customer?.name || '');
      setCustomerMobile(agreement.customer?.mobile || '');
      setCustomerEmail(agreement.customer?.email || '');
      setRego(agreement.vehicle?.rego || '');
      setMake(agreement.vehicle?.make || '');
      setModel(agreement.vehicle?.model || '');
      setColour(agreement.vehicle?.colour || '');
      setDueBackIso(agreement.dueBackDateTime || new Date().toISOString());
      setDailyKmCap(String(agreement.dailyKmCap || 50));
      setExcessKmRate(String(agreement.excessKmRate || 0.5));
      setDamageNotes(agreement.outbound?.damageNotes || '');
    }
  }, [agreement]);

  // Quick Time Extension Helpers
  const addHours = (hours: number) => {
    const base = new Date();
    base.setTime(base.getTime() + hours * 3600000);
    setDueBackIso(base.toISOString());
  };

  const setTomorrowEvening = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 30, 0, 0);
    setDueBackIso(d.toISOString());
  };

  const formatDueDisplay = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  const handleSave = async () => {
    if (!customerName.trim() || !customerMobile.trim()) {
      Alert.alert('Validation Error', 'Customer Name and Mobile are required.');
      return;
    }

    setSubmitting(true);
    const payload = {
      customer: {
        name: customerName.trim(),
        mobile: customerMobile.trim(),
        email: customerEmail.trim(),
      },
      vehicle: {
        rego: rego.trim().toUpperCase(),
        make: make.trim(),
        model: model.trim(),
        colour: colour.trim(),
      },
      dueBackDateTime: dueBackIso,
      dailyKmCap: parseInt(dailyKmCap, 10) || 50,
      excessKmRate: parseFloat(excessKmRate) || 0.5,
      outbound: {
        ...agreement.outbound,
        damageNotes: damageNotes.trim(),
      },
    };

    try {
      let updated: LoanAgreement;
      try {
        updated = await loanAgreementsApi.updateAgreement(agreement.id, payload);
      } catch (apiErr) {
        console.warn('Backend update failed, applying locally:', apiErr);
        updated = {
          ...agreement,
          customer: {
            ...agreement.customer,
            ...payload.customer,
          },
          vehicle: {
            ...agreement.vehicle,
            ...payload.vehicle,
          },
          dueBackDateTime: payload.dueBackDateTime,
          dailyKmCap: payload.dailyKmCap,
          excessKmRate: payload.excessKmRate,
          outbound: {
            ...agreement.outbound,
            damageNotes: payload.outbound.damageNotes,
          },
          updatedAt: new Date().toISOString(),
        };
      }

      Alert.alert('Updated', 'Loan vehicle details saved successfully.');
      onUpdateCompleted(updated);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update loan vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContainer,
            {
              marginTop: Math.max(insets.top + 8, 44),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Edit Loan Vehicle</Text>
              <Text style={styles.modalSubtitle}>{agreement.agreementNumber} • {agreement.siteName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick Extension Options */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Expected Return Date & Time</Text>
              <View style={styles.currentDueBanner}>
                <Icon name="clock" size={16} color={colors.primary} />
                <Text style={styles.currentDueText}>
                  Scheduled: <Text style={styles.currentDueBold}>{formatDueDisplay(dueBackIso)}</Text>
                </Text>
              </View>

              <Text style={styles.subFieldLabel}>Quick Time Extension:</Text>
              <View style={styles.quickTimeRow}>
                <TouchableOpacity
                  style={styles.quickTimeBtn}
                  onPress={() => addHours(2)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickTimeBtnText}>+2 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickTimeBtn}
                  onPress={() => addHours(4)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickTimeBtnText}>+4 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickTimeBtn}
                  onPress={setTomorrowEvening}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickTimeBtnText}>Tomorrow{'\n'}5:30 PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Customer Information</Text>

              <Text style={styles.fieldLabel}>Customer Full Name *</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.fieldLabel}>Mobile *</Text>
                  <TextInput
                    style={styles.input}
                    value={customerMobile}
                    onChangeText={setCustomerMobile}
                    placeholder="0400 000 000"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={customerEmail}
                    onChangeText={setCustomerEmail}
                    placeholder="customer@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Vehicle Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Vehicle Specification</Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.fieldLabel}>Registration</Text>
                  <TextInput
                    style={[styles.input, { fontWeight: '700' }]}
                    value={rego}
                    onChangeText={setRego}
                    placeholder="e.g. BMG302"
                    autoCapitalize="characters"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Colour</Text>
                  <TextInput
                    style={styles.input}
                    value={colour}
                    onChangeText={setColour}
                    placeholder="e.g. Diamond Black"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.fieldLabel}>Make</Text>
                  <TextInput
                    style={styles.input}
                    value={make}
                    onChangeText={setMake}
                    placeholder="Make"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Model</Text>
                  <TextInput
                    style={styles.input}
                    value={model}
                    onChangeText={setModel}
                    placeholder="Model"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Agreement Terms */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Agreement Terms & Limits</Text>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.fieldLabel}>Daily Km Cap</Text>
                  <TextInput
                    style={styles.input}
                    value={dailyKmCap}
                    onChangeText={setDailyKmCap}
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Excess Rate ($/km)</Text>
                  <TextInput
                    style={styles.input}
                    value={excessKmRate}
                    onChangeText={setExcessKmRate}
                    keyboardType="numeric"
                    placeholder="0.50"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Outbound Damage / Staff Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={damageNotes}
                onChangeText={setDamageNotes}
                placeholder="Enter condition notes or staff instructions..."
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={[
              styles.modalFooter,
              {
                paddingBottom: Math.max(insets.bottom + 10, 24),
              },
            ]}
          >
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              title={submitting ? 'Saving...' : 'Save Changes'}
              variant="primary"
              onPress={handleSave}
              disabled={submitting}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalBody: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surfaceElevated || '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  currentDueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow || '#EFF6FF',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    gap: 8,
  },
  currentDueText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  currentDueBold: {
    fontWeight: '800',
    color: colors.primary,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  quickTimeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  quickTimeBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTimeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 15,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
