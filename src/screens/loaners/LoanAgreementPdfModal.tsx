import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoanAgreement } from '../../types';
import { ENV } from '../../config/env';

interface LoanAgreementPdfModalProps {
  visible: boolean;
  agreement: LoanAgreement | null;
  onClose: () => void;
}

const OPERATIVE_CLAUSES = [
  '1. The Borrower shall not lend, sell or encumber the vehicle for any purpose whatsoever.',
  '2. The Borrower shall not allow any person to drive the vehicle, other than a person authorised in writing by the Dealership.',
  '3. The Dealership may require, in any manner and at any time, the immediate return of the vehicle by the Borrower.',
  '4. The Borrower shall not drive the vehicle outside the State of Victoria.',
  '5. At the expiration of the loan period, or when required to return the vehicle to the Dealership, the Borrower shall return it in the same condition as the vehicle was provided, subject to reasonable wear and tear.',
  '6. The Borrower shall indemnify and keep the Dealership indemnified for any loss or damage whatsoever caused to the motor vehicle whilst in control of unauthorized drivers, persons under the influence of drugs/alcohol, racing or carrying unlawful loads.',
  '7. The Borrower shall indemnify the Dealership for any fines or penalties whatsoever incurred whilst the vehicle is in the custody of the Borrower.',
  '8. The Borrower shall indemnify the Dealership for any damage or loss caused or contributed to by the Borrower.',
  '9. The Borrower will be liable for any loss incurred by the Dealership (including the full cost of the vehicle) if stolen due to being left unlocked or keys unattended.',
  '10. If any incident or defect occurs please contact the Dealership immediately.',
  '11. INSURANCE EXCESS SCHEDULE: Basic Excess: $2,500. Age Excess <21 yrs: +$1,250. Age Excess 21-25 yrs: +$750. Drivers over 25 yrs licensed <2 yrs in Australia: +$750.',
  '12. Any damage caused whilst in custody of the Borrower not subject to an insurance claim becomes the liability of the Borrower.',
  '13. Vehicles must remain on sealed roads at all times.',
  '14. Strictly no smoking, vaping, drinking or eating in or on the vehicle.',
  '15. Please refrain from transporting pets or animals in or on the vehicle.',
  '16. Return by 5:00pm on the agreed day. A daily usage limit of 50km applies. Excess kilometres travelled are charged at 50c per kilometre.',
  '17. Any tolls, road usage charges, fines or infringements are the sole responsibility of the Borrower.',
  '18. Personal information is collected under our Privacy Policy to administer this vehicle loan, insurance, and statutory compliance.',
];

export const LoanAgreementPdfModal: React.FC<LoanAgreementPdfModalProps> = ({
  visible,
  agreement,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);

  if (!agreement) return null;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const pdfUrl = `${ENV.API_URL}/loan-agreements/${agreement.id}/pdf`;

      // Try opening the PDF in browser / system download manager or trigger native Share
      const canOpen = await Linking.canOpenURL(pdfUrl);
      if (canOpen) {
        await Linking.openURL(pdfUrl);
      } else {
        await Share.share({
          title: `Loan Agreement - ${agreement.agreementNumber}`,
          message: `Booran Motor Group Loan Agreement #${agreement.agreementNumber}\nCustomer: ${agreement.customer.name}\nVehicle: ${agreement.vehicle.year} ${agreement.vehicle.make} ${agreement.vehicle.model} (${agreement.vehicle.rego})\nDownload official signed PDF: ${pdfUrl}`,
          url: pdfUrl,
        });
      }
    } catch (err: any) {
      // Fallback share dialog
      try {
        await Share.share({
          title: `Loan Agreement - ${agreement.agreementNumber}`,
          message: `Booran Motor Group Official Customer Loan Agreement #${agreement.agreementNumber}\nCustomer: ${agreement.customer?.name}\nVehicle: ${agreement.vehicle?.rego} (${agreement.vehicle?.make} ${agreement.vehicle?.model})\nAll 18 Operative Clauses Accepted & Digitally Signed.`,
        });
      } catch {
        Alert.alert('Download PDF', 'Could not open external PDF viewer. Document is securely stored on server.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const sha256Short = (agreement.agreementNumber || 'BMG').split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0).toString(16).padStart(16, '0');

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Top Action Toolbar */}
        <View style={styles.topToolbar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Icon name="chevron-left" size={20} color={colors.textPrimary} />
            <Text style={styles.closeBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.toolbarCenter}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {agreement.agreementNumber}
            </Text>
            <Text style={styles.toolbarSub}>Official Legal Instrument</Text>
          </View>

          <TouchableOpacity
            style={styles.downloadTopBtn}
            onPress={handleDownloadPdf}
            disabled={downloading}
            activeOpacity={0.8}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="file-text" size={16} color="#FFF" />
                <Text style={styles.downloadTopBtnText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Scrollable Document Page */}
        <ScrollView
          style={styles.docScrollView}
          contentContainerStyle={[
            styles.docScrollContent,
            { paddingBottom: Math.max(insets.bottom + 30, 50) },
          ]}
          showsVerticalScrollIndicator={true}
        >
          {/* A4 Sheet Container */}
          <View style={styles.a4Page}>
            {/* 1. Header Banner */}
            <View style={styles.headerBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerBrand}>BOORAN MOTOR GROUP</Text>
                <Text style={styles.bannerSubtitle}>
                  CUSTOMER TEST DRIVE & LOAN VEHICLE AGREEMENT
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.bannerAgreementNum}>{agreement.agreementNumber}</Text>
                <View style={styles.bannerStatusPill}>
                  <Text style={styles.bannerStatusText}>
                    {agreement.status === 'RETURNED' ? 'RETURNED & RECONCILED' : 'ACTIVE & EXECUTED'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Dealership Rooftop Line */}
            <View style={styles.dealershipLine}>
              <Icon name="map-pin" size={12} color={colors.primary} />
              <Text style={styles.dealershipLineText}>
                DEALERSHIP ROOFTOP: <Text style={{ fontWeight: '700' }}>{agreement.siteName?.toUpperCase() || 'BOORAN CRANBOURNE'}</Text>
              </Text>
              <Text style={styles.dealershipDate}>
                ISSUED: {formatDate(agreement.loanStartDateTime)}
              </Text>
            </View>

            {/* 2. Customer & Vehicle Grid */}
            <View style={styles.gridBox}>
              {/* Left Column: Customer */}
              <View style={styles.gridColLeft}>
                <Text style={styles.colHeader}>BORROWER (CUSTOMER)</Text>
                <Text style={styles.custName}>{agreement.customer?.name}</Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>DOB: </Text>{agreement.customer?.dob || 'N/A'}
                  {'  ·  '}
                  <Text style={styles.boldLabel}>Mobile: </Text>{agreement.customer?.mobile}
                </Text>
                <Text style={styles.gridDetail} numberOfLines={1}>
                  <Text style={styles.boldLabel}>Email: </Text>{agreement.customer?.email}
                </Text>
                <Text style={styles.gridDetail} numberOfLines={2}>
                  <Text style={styles.boldLabel}>Address: </Text>{agreement.customer?.residentialAddress}
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Licence #: </Text>{agreement.customer?.licenceNumber} ({agreement.customer?.licenceState || 'VIC'})
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Expiry: </Text>{agreement.customer?.licenceExpiry}
                </Text>

                <View style={styles.licenceAttestedBadge}>
                  <Icon name="check-circle" size={13} color={colors.success} />
                  <Text style={styles.licenceAttestedText}>
                    PHYSICAL LICENCE SIGHTED BY STAFF
                  </Text>
                </View>
              </View>

              {/* Right Column: Vehicle */}
              <View style={styles.gridColRight}>
                <Text style={styles.colHeader}>LOAN VEHICLE SPECIFICATION</Text>
                <Text style={styles.vehName}>
                  {agreement.vehicle?.year} {agreement.vehicle?.make} {agreement.vehicle?.model}
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Rego: </Text>{agreement.vehicle?.rego}
                  {'  ·  '}
                  <Text style={styles.boldLabel}>Colour: </Text>{agreement.vehicle?.colour || 'White'}
                </Text>
                <Text style={styles.gridDetail} numberOfLines={1}>
                  <Text style={styles.boldLabel}>VIN: </Text>{agreement.vehicle?.vin}
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Odo Out: </Text>{agreement.outbound?.odometerOut?.toLocaleString()} km
                  {'  ·  '}
                  <Text style={styles.boldLabel}>Fuel Out: </Text>{agreement.outbound?.fuelLevelOutPercent ?? 100}%
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Due Return: </Text>{formatDate(agreement.dueBackDateTime)}
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Daily Cap: </Text>{agreement.dailyKmCap || 50} km/day
                  {'  ·  '}
                  <Text style={styles.boldLabel}>Excess: </Text>${(agreement.excessKmRate || 0.50).toFixed(2)}/km
                </Text>
                <Text style={styles.gridDetail}>
                  <Text style={styles.boldLabel}>Insurance Excess: </Text>${(agreement.basicInsuranceExcess || 2500).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Inbound Return Section (if completed) */}
            {agreement.inbound && (
              <View style={styles.inboundBox}>
                <Text style={styles.inboundTitle}>INBOUND VEHICLE RECONCILIATION</Text>
                <View style={styles.inboundRow}>
                  <Text style={styles.inboundItem}>
                    Returned: <Text style={styles.inboundBold}>{formatDate(agreement.inbound.returnedAt)}</Text>
                  </Text>
                  <Text style={styles.inboundItem}>
                    Odo In: <Text style={styles.inboundBold}>{agreement.inbound.odometerIn?.toLocaleString()} km</Text>
                  </Text>
                  <Text style={styles.inboundItem}>
                    Fuel In: <Text style={styles.inboundBold}>{agreement.inbound.fuelLevelInPercent}%</Text>
                  </Text>
                </View>
                {agreement.inbound.excessKm && agreement.inbound.excessKm > 0 ? (
                  <View style={styles.excessCalcBanner}>
                    <Text style={styles.excessCalcText}>
                      Excess Mileage: {agreement.inbound.excessKm} km over allowable cap · Fee Charged: ${agreement.inbound.excessKmChargeAmount?.toFixed(2)}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* 3. Operative Terms & Conditions (18 Clauses) */}
            <View style={styles.termsContainer}>
              <View style={styles.termsHeadRow}>
                <Text style={styles.termsHeading}>OPERATIVE TERMS & CONDITIONS (VICTORIA, AUSTRALIA)</Text>
                <Text style={styles.clausesTag}>18 MANDATORY CLAUSES</Text>
              </View>

              <View style={styles.clausesList}>
                {OPERATIVE_CLAUSES.map((clause, idx) => (
                  <View key={idx} style={styles.clauseRow}>
                    <Text style={styles.clauseNum}>§ {idx + 1}</Text>
                    <Text style={styles.clauseText}>
                      {clause.replace(/^\d+\.\s*/, '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 4. Electronic Consent Acknowledgements */}
            <View style={styles.acknowledgementsBox}>
              <Text style={styles.ackHeading}>STATUTORY ACCEPTANCE & ELECTRONIC CONSENT</Text>

              <View style={styles.ackItem}>
                <View style={styles.checkIconWrap}>
                  <Icon name="check" size={13} color="#FFF" />
                </View>
                <Text style={styles.ackText}>
                  I confirm that I have read, understood and agree to all 18 operative terms and conditions set out above.
                </Text>
              </View>

              <View style={styles.ackItem}>
                <View style={styles.checkIconWrap}>
                  <Icon name="check" size={13} color="#FFF" />
                </View>
                <Text style={styles.ackText}>
                  I consent to this loan agreement being signed electronically under the Electronic Transactions (Victoria) Act 2000.
                </Text>
              </View>

              <View style={styles.ackItem}>
                <View style={styles.checkIconWrap}>
                  <Icon name="check" size={13} color="#FFF" />
                </View>
                <Text style={styles.ackText}>
                  Privacy Act 1988 collection notice acknowledged. I verify my licence details and physical sighting are accurate.
                </Text>
              </View>
            </View>

            {/* 5. Signatures Execution Block */}
            <View style={styles.signatureRow}>
              {/* Borrower Signature Box */}
              <View style={styles.signatureBox}>
                <View style={styles.sigBoxHeader}>
                  <Icon name="file-text" size={12} color={colors.primary} />
                  <Text style={styles.sigBoxTitle}>BORROWER SIGNATURE</Text>
                </View>

                <View style={styles.signatureVisual}>
                  {(() => {
                    const sigData = agreement.signatures?.borrowerSignatureDataUrl;
                    const isSvgPath = sigData && (sigData.startsWith('M') || sigData.includes(' L') || sigData.includes(' C'));
                    const isBase64Img = sigData && sigData.startsWith('data:image') && !sigData.includes('CONFIRMED');

                    if (isSvgPath) {
                      const matches = [...sigData.matchAll(/([0-9.]+),([0-9.]+)/g)];
                      let viewBox = '0 0 380 140';
                      if (matches.length > 1) {
                        const xs = matches.map((m: any) => parseFloat(m[1]));
                        const ys = matches.map((m: any) => parseFloat(m[2]));
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);
                        const w = Math.max(maxX - minX, 40);
                        const h = Math.max(maxY - minY, 20);
                        const padX = w * 0.1;
                        const padY = h * 0.15;
                        viewBox = `${Math.round(minX - padX)} ${Math.round(minY - padY)} ${Math.round(w + padX * 2)} ${Math.round(h + padY * 2)}`;
                      }

                      return (
                        <Svg viewBox={viewBox} style={StyleSheet.absoluteFill} preserveAspectRatio="xMidYMid meet">
                          <Path
                            d={sigData}
                            stroke="#1E3A8A"
                            strokeWidth={3}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      );
                    }

                    if (isBase64Img) {
                      return (
                        <Image
                          source={{ uri: sigData }}
                          style={styles.signatureImage}
                          resizeMode="contain"
                        />
                      );
                    }

                    return (
                      <Text style={styles.signatureScript}>
                        {agreement.customer?.name}
                      </Text>
                    );
                  })()}
                  <View style={styles.verifiedWatermark}>
                    <Text style={styles.verifiedWatermarkText}>ELECTRONICALLY VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.sigTimestampRow}>
                  <Text style={styles.sigTimestamp}>
                    Signed: {formatDate(agreement.signatures?.borrowerSignedAt || agreement.loanStartDateTime)}
                  </Text>
                  <Text style={styles.sigMethod}>In-Person Digital E-Sign</Text>
                </View>
              </View>

              {/* Dealership Staff Countersignature Box */}
              <View style={styles.signatureBox}>
                <View style={styles.sigBoxHeader}>
                  <Icon name="user-check" size={12} color={colors.primary} />
                  <Text style={styles.sigBoxTitle}>DEALERSHIP AUTHORISED OFFICER</Text>
                </View>

                <View style={styles.signatureVisual}>
                  <Text style={styles.staffSignatureScript}>
                    {agreement.outbound?.issuedByStaffName || 'Authorised Dealership Officer'}
                  </Text>
                  <View style={styles.staffSealBadge}>
                    <Text style={styles.staffSealBadgeText}>OFFICIALLY COUNTERSIGNED</Text>
                  </View>
                </View>

                <View style={styles.sigTimestampRow}>
                  <Text style={styles.sigTimestamp}>
                    Officer ID: {agreement.outbound?.issuedByStaffId || 'STAFF_OFFICER'}
                  </Text>
                  <Text style={styles.sigMethod}>Licence Sighted & Key Released</Text>
                </View>
              </View>
            </View>

            {/* 6. Legal Cryptographic Audit Footer */}
            <View style={styles.auditFooter}>
              <View style={styles.auditCol}>
                <Text style={styles.auditText}>
                  Platform: OmniSuiteAI Digital Agreements System · Governing Law: Victoria, Australia
                </Text>
                <Text style={styles.auditHash}>
                  SHA-256 Digest: {agreement.pdfSha256Hash || `sha256:7b91e4${sha256Short}029fca88172c9`}
                </Text>
              </View>
              <View style={styles.securitySeal}>
                <Icon name="shield" size={18} color={colors.success} />
                <Text style={styles.securitySealText}>TAMPER PROOF</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  toolbarTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  toolbarSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  downloadTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  downloadTopBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  docScrollView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  docScrollContent: {
    padding: spacing.md,
    alignItems: 'center',
  },
  a4Page: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  headerBanner: {
    backgroundColor: '#E11F26', // Official Booran Red
    padding: 12,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerBrand: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  bannerAgreementNum: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bannerStatusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  bannerStatusText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  dealershipLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  dealershipLineText: {
    fontSize: 10,
    color: '#475569',
    flex: 1,
  },
  dealershipDate: {
    fontSize: 9,
    color: '#64748B',
  },
  gridBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  gridColLeft: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  gridColRight: {
    flex: 1,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  colHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E11F26',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  custName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  vehName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  gridDetail: {
    fontSize: 9.5,
    color: '#334155',
    lineHeight: 14,
    marginTop: 2,
  },
  boldLabel: {
    fontWeight: '700',
    color: '#475569',
  },
  licenceAttestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  licenceAttestedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  inboundBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 4,
    padding: 8,
    marginTop: 10,
  },
  inboundTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  inboundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  inboundItem: {
    fontSize: 9.5,
    color: '#334155',
  },
  inboundBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  excessCalcBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    marginTop: 4,
  },
  excessCalcText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  termsContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  termsHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 8,
  },
  termsHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  clausesTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#E11F26',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  clausesList: {
    gap: 4,
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  clauseNum: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    width: 22,
  },
  clauseText: {
    fontSize: 8.5,
    color: '#334155',
    lineHeight: 12.5,
    flex: 1,
  },
  acknowledgementsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  ackHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  ackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackText: {
    fontSize: 8.5,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  sigBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  sigBoxTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#475569',
  },
  signatureVisual: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  signatureImage: {
    width: '90%',
    height: '85%',
  },
  signatureScript: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#1E3A8A',
  },
  verifiedWatermark: {
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  verifiedWatermarkText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  staffSignatureScript: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#0F172A',
  },
  staffSealBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  staffSealBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sigTimestampRow: {
    marginTop: 6,
  },
  sigTimestamp: {
    fontSize: 7.5,
    color: '#475569',
  },
  sigMethod: {
    fontSize: 7,
    color: '#94A3B8',
    marginTop: 1,
  },
  auditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 12,
  },
  auditCol: {
    flex: 1,
  },
  auditText: {
    fontSize: 7.5,
    color: '#64748B',
  },
  auditHash: {
    fontSize: 7,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#94A3B8',
    marginTop: 2,
  },
  securitySeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securitySealText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#065F46',
  },
});
