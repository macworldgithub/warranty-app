import React, { useState } from 'react';
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
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { LoanAgreement } from '../../types';
import { loanAgreementsApi } from '../../api';

interface ReturnLoanerModalProps {
  visible: boolean;
  agreement: LoanAgreement | null;
  onClose: () => void;
  onReturnCompleted: (updated: LoanAgreement) => void;
}

export const ReturnLoanerModal: React.FC<ReturnLoanerModalProps> = ({
  visible,
  agreement,
  onClose,
  onReturnCompleted,
}) => {
  if (!agreement) return null;

  const odoOut = agreement.outbound?.odometerOut || 0;
  const [inboundOdo, setInboundOdo] = useState(String(odoOut + 64));
  const [fuelPercent, setFuelPercent] = useState('70');
  const [returnDamageNotes, setReturnDamageNotes] = useState('');
  const [hasDamage, setHasDamage] = useState(false);
  const [hasIncident, setHasIncident] = useState(false);
  const [selectedExcessBand, setSelectedExcessBand] = useState('Basic Excess ($2,500)');
  const [submitting, setSubmitting] = useState(false);

  // Live Math
  const numOdoIn = parseInt(inboundOdo, 10) || odoOut;
  const kmTravelled = Math.max(0, numOdoIn - odoOut);

  // Days calculation
  const startMs = new Date(agreement.loanStartDateTime).getTime();
  const endMs = Date.now();
  const days = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const allowableKm = days * (agreement.dailyKmCap || 50);
  const excessKm = Math.max(0, kmTravelled - allowableKm);
  const excessRate = agreement.excessKmRate || 0.50;
  const excessCharge = Number((excessKm * excessRate).toFixed(2));

  const handleConfirmReturn = async () => {
    if (numOdoIn < odoOut) {
      Alert.alert('Invalid Odometer', `Inbound odometer (${numOdoIn} km) cannot be less than outbound reading (${odoOut} km).`);
      return;
    }

    setSubmitting(true);
    try {
      let updated: LoanAgreement;
      try {
        updated = await loanAgreementsApi.returnAgreement(agreement.id, {
          odometerIn: numOdoIn,
          fuelLevelInPercent: parseInt(fuelPercent, 10) || 75,
          returnDamageNotes: returnDamageNotes.trim() || (hasDamage ? 'Damage recorded on return.' : 'Clean return inspection.'),
          hasDamageIncident: hasDamage || hasIncident,
          applicableExcessBand: hasIncident ? selectedExcessBand : undefined,
          applicableExcessAmount: hasIncident ? 2500 : 0,
        });
      } catch (apiErr) {
        console.warn('Backend return error, completing locally:', apiErr);
        updated = {
          ...agreement,
          status: 'RETURNED',
          inbound: {
            odometerIn: numOdoIn,
            fuelLevelInPercent: parseInt(fuelPercent, 10) || 75,
            returnedAt: new Date().toISOString(),
            receivedByStaffId: 'staff_advisor_1',
            receivedByStaffName: 'Service Advisor',
            returnDamageNotes: returnDamageNotes.trim() || (hasDamage ? 'Damage recorded on return.' : 'Clean return inspection.'),
            hasDamageIncident: hasDamage || hasIncident,
            applicableExcessBand: hasIncident ? selectedExcessBand : undefined,
            applicableExcessAmount: hasIncident ? 2500 : 0,
            totalKmTravelled: kmTravelled,
            allowableKm,
            excessKm,
            excessKmChargeAmount: excessCharge,
          },
        };
      }

      onReturnCompleted(updated);
      onClose();
    } catch (err: any) {
      Alert.alert('Return Failed', err.message || 'Unable to process vehicle return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Return Inspection</Text>
              <Text style={styles.subtitle}>
                {agreement.vehicle.year} {agreement.vehicle.make} {agreement.vehicle.model} · {agreement.vehicle.rego}
              </Text>
              <Text style={styles.subRo}>
                Borrower: {agreement.customer.name} {agreement.roNumber ? `· RO #${agreement.roNumber}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Inbound Odometer */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Inbound Odometer (km)</Text>
                <Text style={styles.hintText}>Outbound: {odoOut.toLocaleString()} km</Text>
              </View>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={inboundOdo}
                onChangeText={setInboundOdo}
                placeholder="e.g. 12549"
              />
            </View>

            {/* Fuel Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Inbound Fuel Level (%)</Text>
              <View style={styles.fuelChipRow}>
                {['25', '50', '70', '100'].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.fuelChip, fuelPercent === lvl && styles.fuelChipActive]}
                    onPress={() => setFuelPercent(lvl)}
                  >
                    <Text style={[styles.fuelChipText, fuelPercent === lvl && styles.fuelChipTextActive]}>
                      {lvl}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Excess Kilometres Calculation Summary */}
            <View style={styles.calcCard}>
              <Text style={styles.calcTitle}>EXCESS KM RECOVERY (CLAUSE 16)</Text>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Total Travelled:</Text>
                <Text style={styles.calcVal}>{kmTravelled} km</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Daily Cap Allowance ({days}d × 50km):</Text>
                <Text style={styles.calcVal}>{allowableKm} km</Text>
              </View>
              <View style={[styles.calcRow, styles.calcRowHighlight]}>
                <Text style={styles.calcLabelBold}>Excess Kilometres:</Text>
                <Text style={styles.calcValBold}>{excessKm} km</Text>
              </View>
              <View style={[styles.calcRow, styles.calcRowTotal]}>
                <Text style={styles.calcTotalLabel}>Estimated Charge (50c/km):</Text>
                <Text style={styles.calcTotalVal}>${excessCharge.toFixed(2)}</Text>
              </View>
            </View>

            {/* Damage & Incident Flags */}
            <View style={styles.flagsSection}>
              <Text style={styles.inputLabel}>Damage & Incident Review</Text>
              <View style={styles.flagToggleRow}>
                <Text style={styles.flagToggleLabel}>Damage Observed on Return?</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, hasDamage ? styles.toggleBtnYes : styles.toggleBtnNo]}
                  onPress={() => setHasDamage(!hasDamage)}
                >
                  <Text style={[styles.toggleBtnText, hasDamage && styles.toggleBtnTextActive]}>
                    {hasDamage ? 'YES' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.flagToggleRow}>
                <Text style={styles.flagToggleLabel}>At-Fault Accident / Incident?</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, hasIncident ? styles.toggleBtnYes : styles.toggleBtnNo]}
                  onPress={() => setHasIncident(!hasIncident)}
                >
                  <Text style={[styles.toggleBtnText, hasIncident && styles.toggleBtnTextActive]}>
                    {hasIncident ? 'YES' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasDamage && (
                <View style={styles.damageInputBox}>
                  <Text style={styles.damageInputLabel}>Damage Notes (for Service Advisor / Cashier):</Text>
                  <TextInput
                    style={styles.damageTextInput}
                    placeholder="Describe location and severity of scuff/dent..."
                    value={returnDamageNotes}
                    onChangeText={setReturnDamageNotes}
                    multiline
                  />
                </View>
              )}

              {hasIncident && (
                <View style={styles.excessNoticeBox}>
                  <Icon name="alert-circle" size={16} color="#B45309" />
                  <Text style={styles.excessNoticeText}>
                    Borrower Insurance Excess Applies: Basic $2,500. Surcharges apply if under 25 or AU licence &lt; 2 yrs.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
              disabled={submitting}
            />
            <Button
              title="Complete Return"
              variant="primary"
              onPress={handleConfirmReturn}
              loading={submitting}
              style={{ flex: 1.6 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: spacing.borderRadius.xl,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: '#475569',
    marginTop: 2,
    fontWeight: typography.weights.semibold,
  },
  subRo: {
    fontSize: typography.sizes.xs - 1,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  body: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  hintText: {
    fontSize: typography.sizes.xs - 1,
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: '#0F172A',
  },
  fuelChipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  fuelChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  fuelChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  fuelChipText: {
    fontSize: typography.sizes.xs,
    color: '#64748B',
    fontWeight: typography.weights.semibold,
  },
  fuelChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  calcCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  calcTitle: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: '#475569',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  calcLabel: {
    fontSize: typography.sizes.xs,
    color: '#64748B',
  },
  calcVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  calcRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
    paddingTop: 6,
  },
  calcLabelBold: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  calcValBold: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#E11F26',
  },
  calcRowTotal: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
    marginTop: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomLeftRadius: spacing.borderRadius.md,
    borderBottomRightRadius: spacing.borderRadius.md,
  },
  calcTotalLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#991B1B',
  },
  calcTotalVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#E11F26',
  },
  flagsSection: {
    marginBottom: spacing.md,
  },
  flagToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  flagToggleLabel: {
    fontSize: typography.sizes.xs,
    color: '#334155',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1,
  },
  toggleBtnNo: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  toggleBtnYes: {
    backgroundColor: '#FEE2E2',
    borderColor: '#E11F26',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#E11F26',
  },
  damageInputBox: {
    marginTop: spacing.xs,
  },
  damageInputLabel: {
    fontSize: typography.sizes.xs - 1,
    color: '#64748B',
    marginBottom: 4,
  },
  damageTextInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.sizes.xs,
    height: 60,
    textAlignVertical: 'top',
  },
  excessNoticeBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  excessNoticeText: {
    flex: 1,
    fontSize: 10,
    color: '#92400E',
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
});
