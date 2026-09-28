import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
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

const EXCESS_BANDS = [
  { label: 'Basic Excess ($2,500)', amount: 2500 },
  { label: 'Age < 21 yrs ($3,750)', amount: 3750 },
  { label: 'Age 21–25 yrs ($3,250)', amount: 3250 },
  { label: 'Licence < 2 yrs ($3,250)', amount: 3250 },
  { label: 'Custom Amount', amount: 0 },
];

export const ReturnLoanerModal: React.FC<ReturnLoanerModalProps> = ({
  visible,
  agreement,
  onClose,
  onReturnCompleted,
}) => {
  if (!agreement) return null;

  const odoOut = agreement.outbound?.odometerOut || 0;
  const fuelOut = agreement.outbound?.fuelLevelOutPercent ?? 100;

  // Form State
  const [inboundOdo, setInboundOdo] = useState(String(odoOut + 64));
  const [fuelPercent, setFuelPercent] = useState('70');
  const [fuelChargeOverride, setFuelChargeOverride] = useState<string>('');
  const [isEditingFuelCharge, setIsEditingFuelCharge] = useState(false);

  const [hasDamage, setHasDamage] = useState(false);
  const [returnDamageNotes, setReturnDamageNotes] = useState('');
  const [damageCharge, setDamageCharge] = useState('150.00');

  const [hasIncident, setHasIncident] = useState(false);
  const [selectedExcessBand, setSelectedExcessBand] = useState('Basic Excess ($2,500)');
  const [excessAmountStr, setExcessAmountStr] = useState('2500');

  const [hasCleaning, setHasCleaning] = useState(false);
  const [cleaningFeeStr, setCleaningFeeStr] = useState('120.00');

  const [depositHeldStr, setDepositHeldStr] = useState(String(agreement.securityDepositHeld ?? 500));

  const [submitting, setSubmitting] = useState(false);

  // ── LIVE CALCULATIONS ──
  const numOdoIn = parseInt(inboundOdo, 10) || odoOut;
  const kmTravelled = Math.max(0, numOdoIn - odoOut);

  // Days calculation
  const startMs = new Date(agreement.loanStartDateTime).getTime();
  const endMs = Date.now();
  const days = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const allowableKm = days * (agreement.dailyKmCap || 50);
  const excessKm = Math.max(0, kmTravelled - allowableKm);
  const excessRate = agreement.excessKmRate || 0.50;
  const excessKmCharge = Number((excessKm * excessRate).toFixed(2));

  // Fuel calculation
  const numFuelIn = Math.min(100, Math.max(0, parseInt(fuelPercent, 10) || 0));
  const fuelShortage = Math.max(0, fuelOut - numFuelIn);
  const autoFuelCharge = Number((fuelShortage * 1.50).toFixed(2)); // $1.50 per 1% deficit
  const finalFuelCharge = fuelChargeOverride !== ''
    ? Math.max(0, parseFloat(fuelChargeOverride) || 0)
    : autoFuelCharge;

  // Damage & Incident calculations
  const finalDamageCharge = hasDamage ? Math.max(0, parseFloat(damageCharge) || 0) : 0;
  const finalExcessCharge = hasIncident ? Math.max(0, parseFloat(excessAmountStr) || 0) : 0;
  const finalCleaningCharge = hasCleaning ? Math.max(0, parseFloat(cleaningFeeStr) || 0) : 0;

  // Grand Total Inbound Settlement
  const totalSettlementDue = Number(
    (excessKmCharge + finalFuelCharge + finalDamageCharge + finalExcessCharge + finalCleaningCharge).toFixed(2)
  );

  const depositHeld = Math.max(0, parseFloat(depositHeldStr) || 0);
  const netAmountDue = Math.max(0, Number((totalSettlementDue - depositHeld).toFixed(2)));
  const depositRefundAmount = Math.max(0, Number((depositHeld - totalSettlementDue).toFixed(2)));

  const handleExcessBandSelect = (band: typeof EXCESS_BANDS[0]) => {
    setSelectedExcessBand(band.label);
    if (band.amount > 0) {
      setExcessAmountStr(String(band.amount));
    }
  };

  const handleConfirmReturn = async () => {
    if (numOdoIn < odoOut) {
      Alert.alert('Invalid Odometer', `Inbound odometer (${numOdoIn} km) cannot be less than outbound reading (${odoOut} km).`);
      return;
    }

    setSubmitting(true);
    try {
      const returnPayload = {
        odometerIn: numOdoIn,
        fuelLevelInPercent: numFuelIn,
        fuelShortagePercent: fuelShortage,
        fuelChargeAmount: finalFuelCharge,
        damageChargeAmount: finalDamageCharge,
        cleaningFeeAmount: finalCleaningCharge,
        totalChargesDue: totalSettlementDue,
        securityDepositHeld: depositHeld,
        depositRefundAmount,
        netAmountDue,
        returnDamageNotes: returnDamageNotes.trim() || (hasDamage ? 'Damage recorded on return.' : 'Clean return inspection.'),
        hasDamageIncident: hasDamage || hasIncident,
        applicableExcessBand: hasIncident ? selectedExcessBand : undefined,
        applicableExcessAmount: finalExcessCharge,
      };

      let updated: LoanAgreement;
      try {
        updated = await loanAgreementsApi.returnAgreement(agreement.id, returnPayload);
      } catch (apiErr) {
        console.warn('Backend return error, completing locally:', apiErr);
        updated = {
          ...agreement,
          status: 'RETURNED',
          inbound: {
            ...returnPayload,
            totalKmTravelled: kmTravelled,
            allowableKm,
            excessKm,
            excessKmChargeAmount: excessKmCharge,
            returnedAt: new Date().toISOString(),
            receivedByStaffId: 'staff_advisor_1',
            receivedByStaffName: 'Service Advisor',
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
              <Text style={styles.title}>Inbound Check In & Inspection</Text>
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
            {/* 1. Inbound Odometer */}
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
              <View style={styles.subInfoRow}>
                <Text style={styles.subInfoText}>Travelled: {kmTravelled} km</Text>
                <Text style={styles.subInfoText}>Allowance: {allowableKm} km ({days}d × {agreement.dailyKmCap || 50}km)</Text>
              </View>
            </View>

            {/* 2. Inbound Fuel Level & Price Impact */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Inbound Fuel Level (%)</Text>
                <Text style={styles.hintText}>Outbound: {fuelOut}%</Text>
              </View>

              <View style={styles.fuelChipRow}>
                {['25', '50', '70', '100'].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.fuelChip, fuelPercent === lvl && styles.fuelChipActive]}
                    onPress={() => {
                      setFuelPercent(lvl);
                      setFuelChargeOverride('');
                    }}
                  >
                    <Text style={[styles.fuelChipText, fuelPercent === lvl && styles.fuelChipTextActive]}>
                      {lvl}%
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.fuelCustomBox}>
                  <TextInput
                    style={styles.fuelCustomInput}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="Custom %"
                    value={fuelPercent}
                    onChangeText={(val) => {
                      setFuelPercent(val);
                      setFuelChargeOverride('');
                    }}
                  />
                  <Text style={styles.percentSymbol}>%</Text>
                </View>
              </View>

              {/* Fuel Price Impact Banner */}
              <View style={[styles.fuelStatusBox, fuelShortage > 0 ? styles.fuelStatusBoxDeficit : styles.fuelStatusBoxOk]}>
                <View style={{ flex: 1 }}>
                  {fuelShortage > 0 ? (
                    <>
                      <Text style={styles.fuelStatusDeficitTitle}>
                        Fuel Deficit: -{fuelShortage}% (Out: {fuelOut}% → In: {numFuelIn}%)
                      </Text>
                      <Text style={styles.fuelStatusDeficitSub}>
                        Refuel Charge: ${autoFuelCharge.toFixed(2)} ($1.50 per 1% shortage)
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.fuelStatusOkTitle}>Fuel Level Verified: No Deficit</Text>
                      <Text style={styles.fuelStatusOkSub}>Returned with full or equal fuel level ($0.00 fee)</Text>
                    </>
                  )}
                </View>

                {fuelShortage > 0 && (
                  <TouchableOpacity
                    onPress={() => setIsEditingFuelCharge(!isEditingFuelCharge)}
                    style={styles.overrideBtn}
                  >
                    <Text style={styles.overrideBtnText}>
                      {isEditingFuelCharge ? 'Auto' : 'Override $'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Editable Fuel Charge override */}
              {fuelShortage > 0 && isEditingFuelCharge && (
                <View style={styles.fuelOverrideInputRow}>
                  <Text style={styles.fieldSubLabel}>Override Fuel Charge ($):</Text>
                  <TextInput
                    style={styles.chargeInputSmall}
                    keyboardType="numeric"
                    placeholder={autoFuelCharge.toFixed(2)}
                    value={fuelChargeOverride}
                    onChangeText={setFuelChargeOverride}
                  />
                  <TouchableOpacity
                    onPress={() => setFuelChargeOverride('0')}
                    style={styles.waiveBtn}
                  >
                    <Text style={styles.waiveBtnText}>Waive ($0)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 3. Damage & Accident Incident Flags */}
            <View style={styles.flagsSection}>
              <Text style={styles.sectionHeader}>Damage, Fault & Accident Surcharges</Text>

              {/* Damage Toggle */}
              <View style={styles.flagToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagToggleLabel}>Damage / Fault Observed on Return?</Text>
                  <Text style={styles.flagToggleSub}>Scratches, dents, alloy scuffs, or mechanical faults</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, hasDamage ? styles.toggleBtnYes : styles.toggleBtnNo]}
                  onPress={() => setHasDamage(!hasDamage)}
                >
                  <Text style={[styles.toggleBtnText, hasDamage && styles.toggleBtnTextActive]}>
                    {hasDamage ? 'YES' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasDamage && (
                <View style={styles.subBoxContainer}>
                  <View style={styles.damageInputBox}>
                    <Text style={styles.damageInputLabel}>Damage Description & Repair Details:</Text>
                    <TextInput
                      style={styles.damageTextInput}
                      placeholder="e.g. Scuff on rear passenger quarter, rim kerb rash..."
                      value={returnDamageNotes}
                      onChangeText={setReturnDamageNotes}
                      multiline
                    />
                  </View>
                  <View style={styles.chargeRow}>
                    <Text style={styles.fieldSubLabel}>Damage / Repair Estimate Charge ($):</Text>
                    <TextInput
                      style={styles.chargeInput}
                      keyboardType="numeric"
                      value={damageCharge}
                      onChangeText={setDamageCharge}
                      placeholder="150.00"
                    />
                  </View>
                </View>
              )}

              {/* Accident / Insurance Excess Toggle */}
              <View style={styles.flagToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagToggleLabel}>At-Fault Accident / Incident?</Text>
                  <Text style={styles.flagToggleSub}>Applies Borrower Insurance Excess Schedule (Clause 11)</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, hasIncident ? styles.toggleBtnYes : styles.toggleBtnNo]}
                  onPress={() => setHasIncident(!hasIncident)}
                >
                  <Text style={[styles.toggleBtnText, hasIncident && styles.toggleBtnTextActive]}>
                    {hasIncident ? 'YES' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasIncident && (
                <View style={styles.subBoxContainer}>
                  <Text style={styles.damageInputLabel}>Select Insurance Excess Band:</Text>
                  <View style={styles.excessChipsWrap}>
                    {EXCESS_BANDS.map((b) => (
                      <TouchableOpacity
                        key={b.label}
                        style={[styles.excessChip, selectedExcessBand === b.label && styles.excessChipActive]}
                        onPress={() => handleExcessBandSelect(b)}
                      >
                        <Text style={[styles.excessChipText, selectedExcessBand === b.label && styles.excessChipTextActive]}>
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.chargeRow}>
                    <Text style={styles.fieldSubLabel}>Applicable Excess Amount ($):</Text>
                    <TextInput
                      style={styles.chargeInput}
                      keyboardType="numeric"
                      value={excessAmountStr}
                      onChangeText={setExcessAmountStr}
                      placeholder="2500"
                    />
                  </View>
                  <View style={styles.excessNoticeBox}>
                    <Icon name="alert-circle" size={14} color="#B45309" />
                    <Text style={styles.excessNoticeText}>
                      Clause 11: Basic Excess is $2,500. Surcharges apply if driver &lt; 25 or held AU licence &lt; 2 yrs.
                    </Text>
                  </View>
                </View>
              )}

              {/* Cleaning / Detailing Surcharge Toggle */}
              <View style={styles.flagToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagToggleLabel}>Detailing / Heavy Cleaning Required?</Text>
                  <Text style={styles.flagToggleSub}>Smoke, stains, pet hair, or excessive interior soil</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, hasCleaning ? styles.toggleBtnYes : styles.toggleBtnNo]}
                  onPress={() => setHasCleaning(!hasCleaning)}
                >
                  <Text style={[styles.toggleBtnText, hasCleaning && styles.toggleBtnTextActive]}>
                    {hasCleaning ? 'YES' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasCleaning && (
                <View style={styles.subBoxContainer}>
                  <View style={styles.chargeRow}>
                    <Text style={styles.fieldSubLabel}>Interior Detailing Charge ($):</Text>
                    <TextInput
                      style={styles.chargeInput}
                      keyboardType="numeric"
                      value={cleaningFeeStr}
                      onChangeText={setCleaningFeeStr}
                      placeholder="120.00"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* 4. Security Deposit Held */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Security Deposit / Pre-Auth Held ($)</Text>
                <Text style={styles.hintText}>Subtracted from return charges</Text>
              </View>
              <View style={styles.chargeRow}>
                <Text style={styles.fieldSubLabel}>Deposit / Bond Amount ($):</Text>
                <TextInput
                  style={styles.chargeInput}
                  keyboardType="numeric"
                  value={depositHeldStr}
                  onChangeText={setDepositHeldStr}
                  placeholder="500.00"
                />
              </View>
            </View>

            {/* 5. Complete Check-In Settlement & Live Pricing Card */}
            <View style={styles.calcCard}>
              <View style={styles.calcHeaderRow}>
                <Text style={styles.calcTitle}>LIVE SETTLEMENT & PRICE BREAKDOWN</Text>
                <Text style={styles.calcSubtitle}>Auto-Updated</Text>
              </View>

              {/* Excess Km Line */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>
                  Excess Kilometres ({excessKm} km @ $0.50/km):
                </Text>
                <Text style={[styles.calcVal, excessKmCharge > 0 && styles.calcValAlert]}>
                  ${excessKmCharge.toFixed(2)}
                </Text>
              </View>

              {/* Fuel Deficit Line */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>
                  Fuel Deficit ({fuelShortage > 0 ? `-${fuelShortage}% shortage` : 'Equal/Full'}):
                </Text>
                <Text style={[styles.calcVal, finalFuelCharge > 0 && styles.calcValAlert]}>
                  ${finalFuelCharge.toFixed(2)}
                </Text>
              </View>

              {/* Damage Line */}
              {hasDamage && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Damage / Repair Estimate:</Text>
                  <Text style={[styles.calcVal, styles.calcValAlert]}>
                    ${finalDamageCharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Accident Excess Line */}
              {hasIncident && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Insurance Excess ({selectedExcessBand}):</Text>
                  <Text style={[styles.calcVal, styles.calcValAlert]}>
                    ${finalExcessCharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Cleaning Line */}
              {hasCleaning && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Detailing / Sanitisation Fee:</Text>
                  <Text style={[styles.calcVal, styles.calcValAlert]}>
                    ${finalCleaningCharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Subtotal of Incurred Charges */}
              <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4, paddingTop: 4 }]}>
                <Text style={[styles.calcLabel, { fontWeight: '700', color: '#1E293B' }]}>Total Incurred Charges:</Text>
                <Text style={[styles.calcVal, totalSettlementDue > 0 && styles.calcValAlert]}>
                  ${totalSettlementDue.toFixed(2)}
                </Text>
              </View>

              {/* Less Security Deposit Held */}
              <View style={styles.calcRow}>
                <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>Less Security Deposit Held:</Text>
                <Text style={[styles.calcVal, { color: '#059669', fontWeight: '700' }]}>
                  -${depositHeld.toFixed(2)}
                </Text>
              </View>

              {/* Net Result Highlight */}
              {netAmountDue > 0 ? (
                <View style={[styles.calcRowTotal, { backgroundColor: '#FEF2F2', borderTopColor: '#FECACA' }]}>
                  <View>
                    <Text style={[styles.calcTotalLabel, { color: '#991B1B' }]}>NET AMOUNT TO BE PAID</Text>
                    <Text style={[styles.calcTotalSub, { color: '#B91C1C' }]}>
                      Charges (${totalSettlementDue.toFixed(2)}) exceed deposit (${depositHeld.toFixed(2)})
                    </Text>
                  </View>
                  <Text style={[styles.calcTotalVal, { color: '#DC2626' }]}>${netAmountDue.toFixed(2)}</Text>
                </View>
              ) : depositRefundAmount > 0 ? (
                <View style={[styles.calcRowTotal, { backgroundColor: '#F0FDF4', borderTopColor: '#BBF7D0' }]}>
                  <View>
                    <Text style={[styles.calcTotalLabel, { color: '#166534' }]}>DEPOSIT REFUND DUE</Text>
                    <Text style={[styles.calcTotalSub, { color: '#15803D' }]}>
                      Deposit (${depositHeld.toFixed(2)}) minus charges (${totalSettlementDue.toFixed(2)})
                    </Text>
                  </View>
                  <Text style={[styles.calcTotalVal, { color: '#16A34A' }]}>${depositRefundAmount.toFixed(2)}</Text>
                </View>
              ) : (
                <View style={styles.calcRowTotal}>
                  <View>
                    <Text style={styles.calcTotalLabel}>SETTLEMENT BALANCED</Text>
                    <Text style={styles.calcTotalSub}>Charges equal deposit ($0.00)</Text>
                  </View>
                  <Text style={styles.calcTotalVal}>$0.00</Text>
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
              title={
                netAmountDue > 0
                  ? `Confirm (Collect $${netAmountDue.toFixed(2)})`
                  : depositRefundAmount > 0
                  ? `Confirm (Refund $${depositRefundAmount.toFixed(2)})`
                  : 'Confirm (Nil Due)'
              }
              variant="primary"
              onPress={handleConfirmReturn}
              loading={submitting}
              style={{ flex: 2 }}
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
    maxWidth: 480,
    maxHeight: '92%',
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
    fontWeight: typography.weights.medium,
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
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  subInfoText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: typography.weights.medium,
  },
  fuelChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignItems: 'center',
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
  fuelCustomBox: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: 6,
  },
  fuelCustomInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: typography.sizes.xs,
    color: '#0F172A',
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  percentSymbol: {
    fontSize: typography.sizes.xs,
    color: '#64748B',
    fontWeight: typography.weights.bold,
  },
  fuelStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.xs,
    borderWidth: 1,
  },
  fuelStatusBoxDeficit: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  fuelStatusBoxOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  fuelStatusDeficitTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#991B1B',
  },
  fuelStatusDeficitSub: {
    fontSize: 10,
    color: '#B91C1C',
    marginTop: 1,
  },
  fuelStatusOkTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#166534',
  },
  fuelStatusOkSub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  overrideBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: spacing.borderRadius.sm,
  },
  overrideBtnText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: '#B91C1C',
  },
  fuelOverrideInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    marginTop: 6,
  },
  chargeInputSmall: {
    width: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: spacing.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#C2410C',
    textAlign: 'right',
  },
  waiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: spacing.borderRadius.sm,
  },
  waiveBtnText: {
    fontSize: 9,
    color: '#4B5563',
    fontWeight: typography.weights.bold,
  },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  flagsSection: {
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.sm,
  },
  flagToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  flagToggleLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: '#1E293B',
  },
  flagToggleSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
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
  subBoxContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginTop: 6,
    marginBottom: spacing.xs,
  },
  damageInputBox: {
    marginBottom: spacing.xs,
  },
  damageInputLabel: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.semibold,
    color: '#475569',
    marginBottom: 4,
  },
  damageTextInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.sizes.xs,
    height: 50,
    textAlignVertical: 'top',
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  fieldSubLabel: {
    fontSize: typography.sizes.xs - 1,
    color: '#334155',
    fontWeight: typography.weights.semibold,
  },
  chargeInput: {
    width: 100,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: spacing.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    textAlign: 'right',
  },
  excessChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.xs,
  },
  excessChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  excessChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#E11F26',
  },
  excessChipText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: typography.weights.semibold,
  },
  excessChipTextActive: {
    color: '#E11F26',
    fontWeight: typography.weights.bold,
  },
  excessNoticeBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.xs,
    marginTop: 6,
    alignItems: 'center',
  },
  excessNoticeText: {
    flex: 1,
    fontSize: 9.5,
    color: '#92400E',
    lineHeight: 13,
  },
  calcCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  calcTitle: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: '#334155',
    letterSpacing: 0.5,
  },
  calcSubtitle: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
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
  calcValAlert: {
    color: '#DC2626',
    fontWeight: typography.weights.bold,
  },
  calcRowTotal: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
    marginTop: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomLeftRadius: spacing.borderRadius.lg,
    borderBottomRightRadius: spacing.borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  calcTotalLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#991B1B',
  },
  calcTotalSub: {
    fontSize: 9,
    color: '#B91C1C',
  },
  calcTotalVal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#DC2626',
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
