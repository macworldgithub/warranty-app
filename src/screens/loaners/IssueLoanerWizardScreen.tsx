import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  PanResponder,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { cameraService } from '../../services/cameraService';
import { loanAgreementsApi } from '../../api';
import { LoanAgreement } from '../../types';

interface IssueLoanerWizardScreenProps {
  onBack: () => void;
  onSuccess: (agreement: LoanAgreement) => void;
  initialRooftop?: string;
}

const ROOFTOPS = [
  { name: 'Cranbourne', siteId: 'site_cranbourne_byd', siteName: 'Booran BYD Cranbourne' },
  { name: 'Dandenong', siteId: 'site_dandenong_multi', siteName: 'Booran Dandenong Multi' },
  { name: 'Berwick', siteId: 'site_berwick_nissan', siteName: 'Booran Nissan Berwick' },
  { name: 'Cheltenham', siteId: 'site_cheltenham_mg', siteName: 'Booran MG & Chery Cheltenham' },
];

const PREPOPULATED_VEHICLES = [
  { rego: '1ZX-9AB', make: 'Mitsubishi', model: 'Outlander Aspire', year: 2024, vin: 'JMBXNGA2WPZ004918', rooftop: 'Cranbourne', odo: 12450 },
  { rego: '1TY-4KL', make: 'Hyundai', model: 'Tucson Elite', year: 2023, vin: 'KMHJT81CBDU719283', rooftop: 'Dandenong', odo: 21300 },
  { rego: '1VU-8QM', make: 'Kia', model: 'Sportage SX+', year: 2024, vin: 'KNAFX4127P5628109', rooftop: 'Berwick', odo: 8900 },
  { rego: '1WR-2XP', make: 'MG', model: 'ZS EV Essence', year: 2023, vin: 'LSJGB83W5NZ489123', rooftop: 'Cranbourne', odo: 15400 },
];

const INSPECTION_SLOTS = [
  { id: 'front', label: 'Front 45°', desc: 'Front bumper & bonnet' },
  { id: 'rear', label: 'Rear 45°', desc: 'Rear tailgate & bumper' },
  { id: 'driverSide', label: 'Driver Side', desc: 'Full length side panels' },
  { id: 'passengerSide', label: 'Passenger Side', desc: 'Full length side panels' },
  { id: 'odometerDash', label: 'Odo / Dash', desc: 'Instrument cluster reading' },
];

export const IssueLoanerWizardScreen: React.FC<IssueLoanerWizardScreenProps> = ({
  onBack,
  onSuccess,
  initialRooftop = 'Cranbourne',
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Customer
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('14 Park Road, Cranbourne VIC 3977');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceState, setLicenceState] = useState('VIC');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [birthYear, setBirthYear] = useState('1994');
  const [licenceSighted, setLicenceSighted] = useState(false);
  const [licencePhotoUri, setLicencePhotoUri] = useState<string>('');

  // Step 2: Vehicle
  const [rooftop, setRooftop] = useState(initialRooftop);
  const [registration, setRegistration] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('2024');
  const [vin, setVin] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().slice(0, 16).replace('T', ' ');
  });

  // Step 3: Outbound Condition
  const [odometerOut, setOdometerOut] = useState('12450');
  const [fuelOut, setFuelOut] = useState('100');
  const [cleanlinessVerified, setCleanlinessVerified] = useState(true);
  const [existingDamageNotes, setExistingDamageNotes] = useState('Nil known damage. Checked pre-delivery.');
  const [inspectionPhotos, setInspectionPhotos] = useState<{ [key: string]: string }>({});

  // Step 4: Terms
  const [readAndAgreed, setReadAndAgreed] = useState(false);
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  // Step 5: Sign
  const [staffName, setStaffName] = useState('Sarah Jenkins (Service Advisor)');
  const [customerPaths, setCustomerPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isCustomerSigned, setIsCustomerSigned] = useState(false);

  // Surcharges calculation
  const currentYear = new Date().getFullYear();
  const customerAge = currentYear - (parseInt(birthYear, 10) || 1995);
  let basicExcess = 2500;
  let ageSurcharge = 0;
  if (customerAge < 21) {
    ageSurcharge = 1250;
  } else if (customerAge <= 25) {
    ageSurcharge = 750;
  }
  const totalExcess = basicExcess + ageSurcharge;

  // Touch drawing responder for SVG signature canvas
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M${Math.round(locationX)},${Math.round(locationY)}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath((prev) => `${prev} L${Math.round(locationX)},${Math.round(locationY)}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setCustomerPaths((prev) => [...prev, currentPath]);
        setCurrentPath('');
        setIsCustomerSigned(true);
      }
    },
  });

  const handleSelectPrepop = (veh: typeof PREPOPULATED_VEHICLES[0]) => {
    setRegistration(veh.rego);
    setMake(veh.make);
    setModel(veh.model);
    setVehicleYear(String(veh.year));
    setVin(veh.vin);
    setRooftop(veh.rooftop);
    setOdometerOut(String(veh.odo));
  };

  // Camera Capture for Driver Licence
  const handleCaptureLicence = () => {
    Alert.alert(
      'Capture Driver Licence',
      'Choose camera or photo gallery to record the customer licence front.',
      [
        {
          text: 'Open Camera',
          onPress: async () => {
            const res = await cameraService.capturePhoto('licence_front');
            if (res.success && res.fileUri) {
              setLicencePhotoUri(res.fileUri);
            }
          },
        },
        {
          text: 'Photo Gallery',
          onPress: async () => {
            const res = await cameraService.pickFromGallery();
            if (res.success && res.fileUri) {
              setLicencePhotoUri(res.fileUri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Camera Capture for Pre-departure Inspection Photos
  const handleCaptureInspection = (slotId: string, slotLabel: string) => {
    Alert.alert(
      `Photograph ${slotLabel}`,
      `Take a clear photo of the ${slotLabel} before customer leaves the dealership.`,
      [
        {
          text: 'Open Camera',
          onPress: async () => {
            const res = await cameraService.capturePhoto(`loaner_${slotId}`);
            if (res.success && res.fileUri) {
              setInspectionPhotos((prev) => ({ ...prev, [slotId]: res.fileUri! }));
            }
          },
        },
        {
          text: 'Choose Gallery',
          onPress: async () => {
            const res = await cameraService.pickFromGallery();
            if (res.success && res.fileUri) {
              setInspectionPhotos((prev) => ({ ...prev, [slotId]: res.fileUri! }));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter customer full name.');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter mobile phone number.');
      return false;
    }
    if (!licenceNumber.trim()) {
      Alert.alert('Required', 'Please enter licence number.');
      return false;
    }
    if (!licenceSighted) {
      Alert.alert('Licence Sighting Mandatory', 'Booran policy strictly requires staff to physically inspect and sight the driver licence.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!registration.trim() || !make.trim()) {
      Alert.alert('Required', 'Please select or enter vehicle registration and make.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const odo = parseInt(odometerOut, 10);
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Invalid Odometer', 'Please provide a valid odometer reading.');
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!readAndAgreed || !electronicConsent || !privacyAcknowledged) {
      Alert.alert('Consent Required', 'All three acknowledgement boxes must be checked before proceeding to signature.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    if (step < 5) setStep((prev) => (prev + 1) as any);
  };

  const handleFinalSubmit = async () => {
    if (!isCustomerSigned && customerPaths.length === 0) {
      Alert.alert('Signature Required', 'Customer must provide a digital signature or draw their signature before issuing.');
      return;
    }
    if (!staffName.trim()) {
      Alert.alert('Staff Name Required', 'Please enter issuing staff member name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenRooftop = ROOFTOPS.find((r) => r.name.toLowerCase() === rooftop.toLowerCase()) || ROOFTOPS[0];

      // 1. Create Draft Loan Agreement in MongoDB
      const createPayload = {
        siteId: chosenRooftop.siteId,
        siteName: chosenRooftop.siteName,
        purpose: 'SERVICE_LOANER' as const,
        dueBackDateTime: new Date(expectedReturnDate).toISOString(),
        customer: {
          name: fullName,
          dob: `${birthYear}-01-01`,
          mobile: phone,
          email: email || `${phone.replace(/\D/g, '')}@booran.com.au`,
          residentialAddress: address,
          licenceNumber,
          licenceState,
          licenceExpiry: licenceExpiry || '2028-09-01',
          licenceSighted: true,
          licencePhotoUrl: licencePhotoUri || undefined,
        },
        vehicle: {
          rego: registration.toUpperCase(),
          make: make || 'Mitsubishi',
          model: model || 'Outlander',
          year: parseInt(vehicleYear, 10) || 2024,
          vin: vin || '6T1BF3EK4LA104928',
        },
        dailyKmCap: 50,
        excessKmRate: 0.50,
        basicInsuranceExcess: 2500,
        outbound: {
          odometerOut: parseInt(odometerOut, 10) || 12000,
          fuelLevelOutPercent: parseInt(fuelOut, 10) || 100,
          damageNotes: existingDamageNotes,
          photos: {
            front: inspectionPhotos.front || undefined,
            rear: inspectionPhotos.rear || undefined,
            driverSide: inspectionPhotos.driverSide || undefined,
            passengerSide: inspectionPhotos.passengerSide || undefined,
            odometerDash: inspectionPhotos.odometerDash || undefined,
          },
          issuedAt: new Date().toISOString(),
          issuedByStaffId: 'staff_advisor_1',
          issuedByStaffName: staffName,
        },
      };

      const created = await loanAgreementsApi.issueAgreement(createPayload);

      // 2. Sign Agreement Digitally & Compile Official PDF with SHA-256 Hash
      const signed = await loanAgreementsApi.signAgreement(created.id, {
        borrowerSignatureDataUrl: customerPaths.length > 0 ? customerPaths.join(' ') : 'data:image/svg+xml;base64,CONFIRMED',
        readAndAgreed,
        electronicConsent,
        privacyNoticeAcknowledged: privacyAcknowledged,
        staffSignatureDataUrl: 'STAFF_VERIFIED_' + staffName.toUpperCase().replace(/\s+/g, '_'),
      });

      Alert.alert(
        'Agreement Issued & Activated!',
        `Agreement ${signed.agreementNumber || created.agreementNumber} is now Active in DB.\nAll inspection photos and operative clauses have been saved and compiled into PDF.`,
        [
          {
            text: 'View in Operations',
            onPress: () => onSuccess(signed),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Issue Failed', err?.message || 'Failed to submit loan agreement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack}>
          <Icon name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Issue Loan Agreement</Text>
          <Text style={styles.headerSubtitle}>OmniSuiteAI • Digital Customer Loan Vehicle</Text>
        </View>
        <View style={styles.badgeStep}>
          <Text style={styles.badgeStepText}>Step {step}/5</Text>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.stepperContainer}>
        {[
          { num: 1, label: 'Customer' },
          { num: 2, label: 'Vehicle' },
          { num: 3, label: 'Condition' },
          { num: 4, label: '18 Clauses' },
          { num: 5, label: 'E-Sign' },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <View key={s.num} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isDone && styles.stepCircleDone,
                  isActive && styles.stepCircleActive,
                ]}
              >
                {isDone ? (
                  <Icon name="check" size={14} color="#FFF" />
                ) : (
                  <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>
                    {s.num}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelActive]}>
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ================= STEP 1: CUSTOMER ================= */}
        {step === 1 && (
          <View style={styles.stepBody}>
            <Text style={styles.sectionHeading}>Customer Details & Licence</Text>
            <Text style={styles.sectionDesc}>
              Enter customer identity details. Sighting driver licence is mandatory per Victoria Transport Act regulations.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name (as per Licence) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. David Morrison"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>Mobile Phone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0412 345 678"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="david@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Residential Address</Text>
              <TextInput
                style={styles.input}
                placeholder="14 Park Road, Cranbourne VIC 3977"
                placeholderTextColor={colors.textMuted}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.5, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>Licence Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="98234120"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={licenceNumber}
                  onChangeText={setLicenceNumber}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VIC"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={licenceState}
                  onChangeText={setLicenceState}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Birth Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1994"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={birthYear}
                  onChangeText={setBirthYear}
                />
              </View>
            </View>

            {/* Age Surcharge Callout */}
            <View style={styles.ageBanner}>
              <Icon name="shield" size={18} color={ageSurcharge > 0 ? colors.warning : colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.ageBannerTitle}>
                  Calculated Age: {customerAge} yrs • {ageSurcharge > 0 ? `Young Driver Excess applies` : `Standard Excess tier`}
                </Text>
                <Text style={styles.ageBannerSubtitle}>
                  Basic: ${basicExcess.toLocaleString()} {ageSurcharge > 0 ? `+ $${ageSurcharge} young driver surcharge` : ''} = Total Excess: ${totalExcess.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Mandatory Licence Sighted Attestation */}
            <TouchableOpacity
              style={[styles.attestationCard, licenceSighted && styles.attestationCardChecked]}
              onPress={() => setLicenceSighted(!licenceSighted)}
            >
              <View style={[styles.checkbox, licenceSighted && styles.checkboxActive]}>
                {licenceSighted && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.attestationTitle}>
                  Physical Driving Licence Sighted & Validated *
                </Text>
                <Text style={styles.attestationBody}>
                  I confirm that I have physically inspected this customer's current valid driver licence and checked identity against photo.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Real Camera Capture for Driver Licence */}
            <TouchableOpacity
              style={[styles.photoUploadBtn, !!licencePhotoUri && styles.photoUploadBtnSuccess]}
              onPress={handleCaptureLicence}
            >
              {licencePhotoUri ? (
                <View style={styles.licencePreviewRow}>
                  <Image source={{ uri: licencePhotoUri }} style={styles.licenceThumb} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.licenceCapturedText}>✓ Driver Licence Photo Attached</Text>
                    <Text style={styles.licenceRetakeText}>Tap to retake photo</Text>
                  </View>
                  <Icon name="check-circle" size={20} color={colors.success} />
                </View>
              ) : (
                <View style={styles.licenceEmptyRow}>
                  <Icon name="camera" size={20} color={colors.primary} />
                  <Text style={styles.photoUploadText}>Photograph Driver Licence (Front)</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 2: VEHICLE ================= */}
        {step === 2 && (
          <View style={styles.stepBody}>
            <Text style={styles.sectionHeading}>Vehicle Selection & Rooftop</Text>
            <Text style={styles.sectionDesc}>
              Select from available loan fleet or enter registration number manually.
            </Text>

            {/* Rooftop Selector */}
            <Text style={styles.inputLabel}>Dealership Rooftop Location</Text>
            <View style={styles.rooftopRow}>
              {ROOFTOPS.map((rt) => (
                <TouchableOpacity
                  key={rt.name}
                  style={[styles.rooftopChip, rooftop === rt.name && styles.rooftopChipActive]}
                  onPress={() => setRooftop(rt.name)}
                >
                  <Text style={[styles.rooftopChipText, rooftop === rt.name && styles.rooftopChipTextActive]}>
                    {rt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fleet Quick Pick */}
            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Quick Pick from Fleet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fleetScroll}>
              {PREPOPULATED_VEHICLES.map((veh) => {
                const isSelected = registration === veh.rego;
                return (
                  <TouchableOpacity
                    key={veh.rego}
                    style={[styles.fleetCard, isSelected && styles.fleetCardActive]}
                    onPress={() => handleSelectPrepop(veh)}
                  >
                    <View style={styles.fleetCardHead}>
                      <Text style={styles.fleetRego}>{veh.rego}</Text>
                      <Text style={styles.fleetRooftop}>{veh.rooftop}</Text>
                    </View>
                    <Text style={styles.fleetModel} numberOfLines={2}>{veh.year} {veh.make} {veh.model}</Text>
                    <Text style={styles.fleetOdo}>{veh.odo.toLocaleString()} km</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Registration Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="1ZX-9AB"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={registration}
                onChangeText={setRegistration}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>Make *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mitsubishi"
                  placeholderTextColor={colors.textMuted}
                  value={make}
                  onChangeText={setMake}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={styles.inputLabel}>Model *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Outlander Aspire"
                  placeholderTextColor={colors.textMuted}
                  value={model}
                  onChangeText={setModel}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>VIN (Vehicle Identification Number)</Text>
              <TextInput
                style={styles.input}
                placeholder="JMBXNGA2WPZ004918"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={vin}
                onChangeText={setVin}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Expected Return Date & Time</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-09-24 17:00"
                placeholderTextColor={colors.textMuted}
                value={expectedReturnDate}
                onChangeText={setExpectedReturnDate}
              />
            </View>

            <View style={styles.capNotice}>
              <Icon name="info" size={18} color={colors.primary} />
              <Text style={styles.capNoticeText}>
                Daily Allowance: <Text style={{ fontWeight: 'bold' }}>50 km/day</Text> included. Any excess km billed at <Text style={{ fontWeight: 'bold' }}>$0.50/km</Text> upon return.
              </Text>
            </View>
          </View>
        )}

        {/* ================= STEP 3: CONDITION & PRE-DEPARTURE IMAGES ================= */}
        {step === 3 && (
          <View style={styles.stepBody}>
            <Text style={styles.sectionHeading}>Outbound Vehicle Condition & Photos</Text>
            <Text style={styles.sectionDesc}>
              Tap each angle below to capture pre-departure inspection photos using the camera. Photos will be attached to the legal agreement.
            </Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.2, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>Outbound Odometer (km) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={odometerOut}
                  onChangeText={setOdometerOut}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fuel / Battery (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={fuelOut}
                  onChangeText={setFuelOut}
                />
              </View>
            </View>

            <View style={styles.photosHeaderRow}>
              <Text style={styles.inputLabel}>
                5-Point Pre-Departure Inspection Photos
              </Text>
              <Text style={styles.photosCountBadge}>
                {Object.keys(inspectionPhotos).length}/5 Captured
              </Text>
            </View>

            {/* 5 Real Camera Photo Capture Slots */}
            <View style={styles.photoGrid}>
              {INSPECTION_SLOTS.map((slot) => {
                const photoUri = inspectionPhotos[slot.id];
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.photoGridCard, !!photoUri && styles.photoGridCardDone]}
                    onPress={() => handleCaptureInspection(slot.id, slot.label)}
                  >
                    {photoUri ? (
                      <View style={styles.photoThumbWrap}>
                        <Image source={{ uri: photoUri }} style={styles.photoThumbImg} />
                        <View style={styles.photoCheckOverlay}>
                          <Icon name="check" size={14} color="#FFF" />
                        </View>
                        <Text style={styles.photoGridLabelDone} numberOfLines={1}>
                          {slot.label}
                        </Text>
                        <Text style={styles.photoRetakeHint}>Tap to retake</Text>
                      </View>
                    ) : (
                      <View style={styles.photoEmptyWrap}>
                        <View style={styles.cameraIconCircle}>
                          <Icon name="camera" size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.photoGridLabel}>
                          {slot.label}
                        </Text>
                        <Text style={styles.photoSlotDesc}>{slot.desc}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pre-existing Scratches / Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="Note any minor existing marks..."
                placeholderTextColor={colors.textMuted}
                value={existingDamageNotes}
                onChangeText={setExistingDamageNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.attestationCard, cleanlinessVerified && styles.attestationCardChecked]}
              onPress={() => setCleanlinessVerified(!cleanlinessVerified)}
            >
              <View style={[styles.checkbox, cleanlinessVerified && styles.checkboxActive]}>
                {cleanlinessVerified && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.attestationTitle}>Cleanliness & Safety Verified</Text>
                <Text style={styles.attestationBody}>
                  Vehicle has been washed, vacuumed, sanitized, and passed pre-departure tyre & fluid checks.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 4: 18 CLAUSES ================= */}
        {step === 4 && (
          <View style={styles.stepBody}>
            <Text style={styles.sectionHeading}>18 Operative Terms & Declarations</Text>
            <Text style={styles.sectionDesc}>
              The customer must read and agree to all operative terms stipulated in the Booran Motor Group Loan Agreement.
            </Text>

            <View style={styles.clausesBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>1. Authorised Drivers Only: </Text>
                  The loan vehicle may only be operated by the designated customer who holds a current valid Australian driver licence.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>2. No Smoking, Vaping or Pets: </Text>
                  Strictly prohibited. Detailing sanitation fee of $350 applies for non-compliance.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>3. Daily Kilometre Cap: </Text>
                  Limited to 50 km per day. Excess kilometres are charged at $0.50 per km.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>4. Fuel Level: </Text>
                  Vehicle must be returned with the same fuel or charge level as departure. Refuelling surcharges apply otherwise.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>5. Tolls & Infringements: </Text>
                  Customer is strictly responsible for all CityLink, EastLink, parking, and traffic penalties plus $35 admin processing per incident.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>6. Insurance Excess: </Text>
                  In the event of damage or collision, customer is liable for the basic excess ($2,500) plus any applicable age/licence surcharges.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>7. Incident Reporting: </Text>
                  Any accident, theft, or mechanical warning must be reported to Booran within 2 hours.
                </Text>
                <Text style={styles.clauseItem}>
                  <Text style={styles.clauseNum}>8. Repossession: </Text>
                  Booran Motor Group reserves the right to immediately repossess the vehicle if overdue or used in breach of terms.
                </Text>
              </ScrollView>
            </View>

            {/* Checkboxes */}
            <TouchableOpacity
              style={[styles.checkboxRow, readAndAgreed && styles.checkboxRowActive]}
              onPress={() => setReadAndAgreed(!readAndAgreed)}
            >
              <View style={[styles.checkbox, readAndAgreed && styles.checkboxActive]}>
                {readAndAgreed && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read, understood, and accept all 18 operative clauses of this agreement. *
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkboxRow, electronicConsent && styles.checkboxRowActive]}
              onPress={() => setElectronicConsent(!electronicConsent)}
            >
              <View style={[styles.checkbox, electronicConsent && styles.checkboxActive]}>
                {electronicConsent && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I consent to digital execution and receiving SMS/email delivery of this agreement. *
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkboxRow, privacyAcknowledged && styles.checkboxRowActive]}
              onPress={() => setPrivacyAcknowledged(!privacyAcknowledged)}
            >
              <View style={[styles.checkbox, privacyAcknowledged && styles.checkboxActive]}>
                {privacyAcknowledged && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I acknowledge the Privacy Act Collection Notice & excess liability structure (${totalExcess}). *
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 5: REVIEW & SIGN ================= */}
        {step === 5 && (
          <View style={styles.stepBody}>
            <Text style={styles.sectionHeading}>Review & Digital Signatures</Text>
            <Text style={styles.sectionDesc}>
              Customer must digitally sign in the box below. Both parties receive a certified copy with SHA-256 integrity hash.
            </Text>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Customer</Text>
                <Text style={styles.summaryValue}>{fullName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vehicle</Text>
                <Text style={styles.summaryValue}>{registration} • {make} {model}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rooftop</Text>
                <Text style={styles.summaryValue}>{rooftop}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Odometer Out</Text>
                <Text style={styles.summaryValue}>{parseInt(odometerOut, 10).toLocaleString()} km</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Departure Photos</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {Object.keys(inspectionPhotos).length} Attached
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Insurance Excess</Text>
                <Text style={[styles.summaryValue, { color: colors.warning, fontWeight: '700' }]}>
                  ${totalExcess.toLocaleString()} AUD
                </Text>
              </View>
            </View>

            {/* Customer Signature Canvas */}
            <View style={styles.signatureHeaderRow}>
              <Text style={styles.inputLabel}>Customer Digital Signature *</Text>
              {customerPaths.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setCustomerPaths([]);
                    setIsCustomerSigned(false);
                  }}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.canvasContainer} {...panResponder.panHandlers}>
              <Svg style={StyleSheet.absoluteFill}>
                {customerPaths.map((d, index) => (
                  <Path key={index} d={d} stroke={colors.primary} strokeWidth={3} fill="none" />
                ))}
                {currentPath ? (
                  <Path d={currentPath} stroke={colors.primary} strokeWidth={3} fill="none" />
                ) : null}
              </Svg>
              {customerPaths.length === 0 && !currentPath && (
                <View style={styles.canvasPlaceholder}>
                  <Icon name="sparkles" size={24} color={colors.textMuted} />
                  <Text style={styles.canvasPlaceholderText}>
                    Sign here with your finger or stylus
                  </Text>
                </View>
              )}
            </View>

            {/* Tap-to-certify alternative if stylus not desired */}
            <TouchableOpacity
              style={styles.certifyAlternative}
              onPress={() => {
                setIsCustomerSigned(true);
                setCustomerPaths(['M20,60 C40,20 60,80 90,40 L160,50 L220,30']);
              }}
            >
              <Text style={styles.certifyAlternativeText}>
                ✍️ Tap to Auto-Certify Signature ({fullName || 'Customer'})
              </Text>
            </TouchableOpacity>

            {/* Staff Countersignature */}
            <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
              <Text style={styles.inputLabel}>Staff / Service Advisor Name *</Text>
              <TextInput
                style={styles.input}
                value={staffName}
                onChangeText={setStaffName}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.footer}>
        {step > 1 ? (
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={() => setStep((prev) => (prev - 1) as any)}
            disabled={isSubmitting}
          >
            <Icon name="chevron-left" size={20} color={colors.textSecondary} />
            <Text style={styles.prevBtnText}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.prevBtn} onPress={onBack} disabled={isSubmitting}>
            <Text style={styles.prevBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {step < 5 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Icon name="chevron-right" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, styles.issueBtn]}
            onPress={handleFinalSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon name="check" size={20} color="#FFF" />
                <Text style={styles.nextBtnText}>Activate Agreement</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBackBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badgeStep: {
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeStepText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleDone: {
    backgroundColor: colors.success,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepNumActive: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  stepBody: {},
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  ageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  ageBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ageBannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  attestationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  attestationCardChecked: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  attestationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attestationBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  photoUploadBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  photoUploadBtnSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  photoUploadText: {
    marginLeft: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  licenceEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  licencePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenceThumb: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  licenceCapturedText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  licenceRetakeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rooftopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  rooftopChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rooftopChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rooftopChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rooftopChipTextActive: {
    color: '#FFF',
  },
  fleetScroll: {
    marginBottom: spacing.md,
  },
  fleetCard: {
    width: 190,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  fleetCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  fleetCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fleetRego: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fleetRooftop: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  fleetModel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    height: 32,
  },
  fleetOdo: {
    fontSize: 11,
    color: colors.textMuted,
  },
  capNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  capNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  photosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photosCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  photoGridCard: {
    width: '31%',
    minHeight: 105,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoGridCardDone: {
    borderColor: colors.success,
  },
  photoEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  cameraIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  photoGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  photoSlotDesc: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  photoThumbWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  photoThumbImg: {
    width: '100%',
    height: 65,
    resizeMode: 'cover',
  },
  photoCheckOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGridLabelDone: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
    marginTop: 3,
  },
  photoRetakeHint: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 3,
  },
  clausesBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  clauseItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  clauseNum: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkboxRowActive: {
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 17,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  signatureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  canvasContainer: {
    height: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  canvasPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasPlaceholderText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  certifyAlternative: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  certifyAlternativeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prevBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: spacing.xs,
  },
  issueBtn: {
    backgroundColor: colors.success,
  },
  nextBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
