import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { LoanAgreement } from '../../types';
import { getDynamicLoanCategory } from './LoanVehiclesScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LoanVehicleDetailsModalProps {
  visible: boolean;
  agreement: LoanAgreement | null;
  onClose: () => void;
  onEdit: (agreement: LoanAgreement) => void;
  onReturn: (agreement: LoanAgreement) => void;
  onViewPdf: (agreement: LoanAgreement) => void;
  onDelete: (agreement: LoanAgreement) => void;
}

export const LoanVehicleDetailsModal: React.FC<LoanVehicleDetailsModalProps> = ({
  visible,
  agreement,
  onClose,
  onEdit,
  onReturn,
  onViewPdf,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  if (!agreement) return null;

  const category = getDynamicLoanCategory(agreement.status, agreement.dueBackDateTime);
  const isLoanActive = category !== 'RETURNED';

  const formatDateTime = (iso?: string) => {
    if (!iso) return 'Not recorded';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } catch {
      return iso;
    }
  };

  const getStatusBadgeStyle = () => {
    switch (category) {
      case 'OVERDUE':
        return { bg: colors.dangerLight, text: colors.danger, label: 'OVERDUE' };
      case 'DUE_SOON':
        return { bg: colors.warningLight, text: colors.warning, label: 'DUE SOON' };
      case 'ACTIVE':
        return { bg: colors.primaryGlow, text: colors.primary, label: 'ON LOAN' };
      case 'RETURNED':
        return { bg: colors.successLight, text: colors.success, label: 'RETURNED' };
      default:
        return { bg: colors.border, text: colors.textSecondary, label: agreement.status };
    }
  };

  const badge = getStatusBadgeStyle();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              marginTop: Math.max(insets.top + 10, 48),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.regoHeaderRow}>
                <Text style={styles.regoText}>{agreement.vehicle?.rego}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>
              <Text style={styles.subTitle}>
                {agreement.vehicle?.year} {agreement.vehicle?.make} {agreement.vehicle?.model} • {agreement.agreementNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick Actions Row */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionGridBtn}
                onPress={() => onEdit(agreement)}
                activeOpacity={0.7}
              >
                <Icon name="edit" size={18} color={colors.primary} />
                <Text style={styles.actionGridText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionGridBtn}
                onPress={() => onViewPdf(agreement)}
                activeOpacity={0.7}
              >
                <Icon name="file-text" size={18} color={colors.primary} />
                <Text style={styles.actionGridText}>View PDF</Text>
              </TouchableOpacity>

              {isLoanActive && (
                <TouchableOpacity
                  style={[styles.actionGridBtn, { borderColor: colors.success }]}
                  onPress={() => onReturn(agreement)}
                  activeOpacity={0.7}
                >
                  <Icon name="check-circle" size={18} color={colors.success} />
                  <Text style={[styles.actionGridText, { color: colors.success }]}>Check In</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionGridBtn, { borderColor: colors.dangerLight }]}
                onPress={() => onDelete(agreement)}
                activeOpacity={0.7}
              >
                <Icon name="trash" size={18} color={colors.danger} />
                <Text style={[styles.actionGridText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>

            {/* Vehicle Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registration:</Text>
                <Text style={styles.infoValBold}>{agreement.vehicle?.rego}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Make & Model:</Text>
                <Text style={styles.infoVal}>{agreement.vehicle?.make} {agreement.vehicle?.model} ({agreement.vehicle?.year})</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>VIN:</Text>
                <Text style={[styles.infoVal, { fontFamily: 'monospace' }]}>{agreement.vehicle?.vin}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Colour:</Text>
                <Text style={styles.infoVal}>{agreement.vehicle?.colour || 'Standard'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stock / Asset #:</Text>
                <Text style={styles.infoVal}>{agreement.vehicle?.stockNumber || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dealership Rooftop:</Text>
                <Text style={styles.infoVal}>{agreement.siteName}</Text>
              </View>
            </View>

            {/* Customer Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Customer & Driver Licence</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full Name:</Text>
                <Text style={styles.infoValBold}>{agreement.customer?.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mobile:</Text>
                <Text style={styles.infoVal}>{agreement.customer?.mobile}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoVal}>{agreement.customer?.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Residential Address:</Text>
                <Text style={styles.infoVal}>{agreement.customer?.residentialAddress}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Licence # & State:</Text>
                <Text style={styles.infoValBold}>{agreement.customer?.licenceNumber} ({agreement.customer?.licenceState})</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Licence Expiry:</Text>
                <Text style={styles.infoVal}>{agreement.customer?.licenceExpiry}</Text>
              </View>
            </View>

            {/* Timing & Inspection Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Timeline & Inspection Readings</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time Loan Issued:</Text>
                <Text style={styles.infoVal}>{formatDateTime(agreement.loanStartDateTime)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled Return:</Text>
                <Text style={[styles.infoValBold, { color: colors.primary }]}>{formatDateTime(agreement.dueBackDateTime)}</Text>
              </View>
              {agreement.inbound?.returnedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Actual Return Time:</Text>
                  <Text style={[styles.infoValBold, { color: colors.success }]}>{formatDateTime(agreement.inbound.returnedAt)}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Outbound Odometer:</Text>
                <Text style={styles.infoVal}>{agreement.outbound?.odometerOut?.toLocaleString() || '—'} km</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Outbound Fuel Level:</Text>
                <Text style={styles.infoVal}>{agreement.outbound?.fuelLevelOutPercent}%</Text>
              </View>
              {agreement.inbound?.odometerIn !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Inbound Odometer:</Text>
                  <Text style={styles.infoVal}>{agreement.inbound.odometerIn.toLocaleString()} km</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Daily Cap & Excess:</Text>
                <Text style={styles.infoVal}>{agreement.dailyKmCap || 50} km/day • ${agreement.basicInsuranceExcess?.toLocaleString()} Excess</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pre-existing Damage Notes:</Text>
                <Text style={styles.infoVal}>{agreement.outbound?.damageNotes || 'Nil recorded'}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.modalFooter,
              {
                paddingBottom: Math.max(insets.bottom + 10, 24),
              },
            ]}
          >
            <Button
              title="Close"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
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
  regoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regoText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  actionGridBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated || '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    gap: 4,
  },
  actionGridText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
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
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: '40%',
  },
  infoVal: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  infoValBold: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
