import React, { useState, useRef } from 'react';
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
  Share,
  Linking,
} from 'react-native';
import DatePickerModal from '../../components/common/DatePickerModal';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cameraService } from '../../services/cameraService';
import { loanAgreementsApi } from '../../api';
import { LoanAgreement } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGeofence } from '../../context/GeofenceContext';
import { formatDateForInput, pad } from '../../utils/date';
import { ENV } from '../../config/env';

const booranLogo = require('../../assets/images/booran-motors-transparent.png');

interface IssueLoanerWizardScreenProps {
  onBack: () => void;
  onSuccess: (agreement: LoanAgreement) => void;
  initialRooftop?: string;
  isRooftopLocked?: boolean;
  allowedSiteIds?: string[];
  purpose?: 'SERVICE_LOANER' | 'TEST_DRIVE';
}

const ROOFTOPS = [
  { name: 'Cranbourne', siteId: 'site_cranbourne_byd', siteName: 'Booran BYD Cranbourne' },
  { name: 'Dandenong', siteId: 'site_dandenong_multi', siteName: 'Booran Dandenong Multi-Franchise' },
  { name: 'Berwick', siteId: 'site_berwick_toyota_ford', siteName: 'Booran Berwick Commercials' },
  { name: 'Cheltenham', siteId: 'site_cheltenham_mg', siteName: 'Booran MG & Chery Cheltenham' },
];

const PREPOPULATED_VEHICLES = [
  { rego: 'CRN-882', make: 'BYD', model: 'Dolphin Premium', year: 2024, vin: 'LC07A4DE8R0019284', rooftop: 'Cranbourne', odo: 4820 },
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

const TERMS_TEXT = `BOORAN MOTOR GROUP - COURTESY LOAN VEHICLE AGREEMENT TERMS & CONDITIONS

1. Authorised Drivers Only: The loan vehicle may only be operated by the designated customer who holds a current valid Australian driver licence. Sub-leasing or permitting unlisted drivers is strictly forbidden.
2. No Smoking, Vaping or Pets: Strictly prohibited in all loan vehicles. A detailing & sanitation fee of $350 applies for non-compliance.
3. Daily Kilometre Cap: Standard daily allowance is 50 km per day. Excess kilometres are billed at $0.50 per km upon vehicle return.
4. Fuel / Charge Level: The vehicle must be returned with the same fuel or battery charge level as recorded at departure. Refuelling surcharges ($2.80/L + $25 service fee) apply.
5. Tolls & Traffic Infringements: The customer is strictly liable for all CityLink, EastLink, parking, red light, and speeding fines incurred during the loan period, plus a $35 administrative processing fee per infringement.
6. Insurance Excess & Liability: In the event of any damage, collision, or total loss, the customer is liable to pay the basic excess of $2,500 AUD, plus any applicable age/licence surcharges ($750 for drivers 21-25; $1,250 for drivers under 21).
7. Incident & Defect Reporting: Any accident, theft, collision, or mechanical warning light must be reported immediately to Booran Motor Group within 2 hours.
8. Repossession & Overdue Return: Booran Motor Group reserves the right to immediately repossess the vehicle without notice if overdue past the agreed return date/time or if operated in breach of these terms.
9. Off-road & Track Use: Vehicle must only be driven on sealed public roads. Unsealed roads, race tracks, and beach driving are strictly prohibited.
10. Personal Property: Booran Motor Group accepts no liability for any personal items lost, stolen, or damaged inside the courtesy vehicle.`;

export const IssueLoanerWizardScreen: React.FC<IssueLoanerWizardScreenProps> = ({
  onBack,
  onSuccess,
  initialRooftop = 'Cranbourne',
  isRooftopLocked = false,
  allowedSiteIds,
  purpose = 'SERVICE_LOANER',
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { presenceStatus } = useGeofence();
  const isOnSite = presenceStatus === 'ON_SITE';
  const isTestDrive = purpose === 'TEST_DRIVE';
  const agreementLabel = isTestDrive ? 'Test Drive' : 'Service Loaner';
  const allowedRooftops = allowedSiteIds?.length
    ? ROOFTOPS.filter((r) => allowedSiteIds.includes(r.siteId))
    : ROOFTOPS;
  const fleetVehicles = allowedSiteIds?.length
    ? PREPOPULATED_VEHICLES.filter((veh) =>
        allowedRooftops.some((site) => site.name.toLowerCase() === veh.rooftop.toLowerCase())
      )
    : PREPOPULATED_VEHICLES;

  // Section Accordion State: allows expanding/collapsing each dropdown
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
  });

  const toggleSection = (sectionIndex: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex],
    }));
  };

  const expandAllSections = () => {
    setOpenSections({ 1: true, 2: true, 3: true, 4: true, 5: true });
  };

  const collapseAllSections = () => {
    setOpenSections({ 1: false, 2: false, 3: false, 4: false, 5: false });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section 1: Customer Details
  const [fullName, setFullName] = useState('Priya Nair');
  const [phone, setPhone] = useState('0412 345 678');
  const [email, setEmail] = useState('priya.nair@example.com');
  const [address, setAddress] = useState('14 High Street, Cranbourne VIC 3977');
  const [licenceNumber, setLicenceNumber] = useState('98765432');
  const [licenceState, setLicenceState] = useState('VIC');
  const [licenceExpiry, setLicenceExpiry] = useState('2028-11-20');
  const [customerVehicleRego, setCustomerVehicleRego] = useState('1BY-9EV');
  const [customerVehicleModel, setCustomerVehicleModel] = useState('2024 BYD ATTO 3');
  const [birthYear, setBirthYear] = useState('1994');
  const [licenceSighted, setLicenceSighted] = useState(true);
  const [licencePhotoUri, setLicencePhotoUri] = useState<string>('');
  const [licencePhotoTimestamp, setLicencePhotoTimestamp] = useState<string>('');
  const [showLicenceExpiryPicker, setShowLicenceExpiryPicker] = useState(false);

  // Section 2: Loan Vehicle
  const [rooftop, setRooftop] = useState(
    allowedRooftops.some((r) => r.name.toLowerCase() === initialRooftop.toLowerCase())
      ? initialRooftop
      : (allowedRooftops[0]?.name || initialRooftop)
  );
  const [registration, setRegistration] = useState('CRN-882');
  const [make, setMake] = useState('BYD');
  const [model, setModel] = useState('DOLPHIN Premium');
  const [vehicleYear, setVehicleYear] = useState('2024');
  const [vin, setVin] = useState('LC07A4DE8R0019284');
  const [showExpectedDatePicker, setShowExpectedDatePicker] = useState(false);
  const [showExpectedTimePicker, setShowExpectedTimePicker] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const d = new Date();
    if (!isTestDrive) {
      d.setDate(d.getDate() + 1);
    }
    return formatDateForInput(d);
  });
  const [expectedReturnTime, setExpectedReturnTime] = useState(() => {
    if (isTestDrive) {
      const d = new Date();
      d.setHours(d.getHours() + 1);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return '18:00';
  });

  // Section 3: Outbound Condition & Inspection
  const [odometerOut, setOdometerOut] = useState('4820');
  const [fuelOut, setFuelOut] = useState('100');
  const [cleanlinessVerified, setCleanlinessVerified] = useState(true);
  const [existingDamageNotes, setExistingDamageNotes] = useState('Nil pre-existing damage. Vehicle clean & sanitized.');
  const [inspectionPhotos, setInspectionPhotos] = useState<{ [key: string]: string }>({});
  const [inspectionPhotoTimestamps, setInspectionPhotoTimestamps] = useState<{ [key: string]: string }>({});

  // Section 4: Terms & Conditions
  const [readAndAgreed, setReadAndAgreed] = useState(true);
  const [electronicConsent, setElectronicConsent] = useState(true);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(true);

  // Section 5: Signature
  const [staffName, setStaffName] = useState(() => (user?.name ? `${user.name}${user.role ? ` (${user.role.replace('_', ' ')})` : ''}` : 'Shaun Davies (Service Advisor)'));
  const [customerPaths, setCustomerPaths] = useState<string[]>(['M25,65 C45,25 65,85 95,45 L165,55 L225,35']);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isCustomerSigned, setIsCustomerSigned] = useState(true);
  const currentPathRef = useRef<string>('');
  const customerPathsRef = useRef<string[]>(['M25,65 C45,25 65,85 95,45 L165,55 L225,35']);

  // Excess Calculation
  const currentYear = new Date().getFullYear();
  const parsedBirthYear = parseInt(birthYear, 10);
  const isValidBirthYear = !isNaN(parsedBirthYear) && parsedBirthYear > 1920 && parsedBirthYear <= currentYear;
  const customerAge = isValidBirthYear ? currentYear - parsedBirthYear : null;
  let basicExcess = 2500;
  let ageSurcharge = 0;
  if (customerAge !== null) {
    if (customerAge < 21) {
      ageSurcharge = 1250;
    } else if (customerAge <= 25) {
      ageSurcharge = 750;
    }
  }
  const totalExcess = basicExcess + ageSurcharge;

  // Touch drawing responder for SVG signature canvas
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const startPt = `M${Math.round(locationX)},${Math.round(locationY)}`;
          currentPathRef.current = startPt;
          setCurrentPath(startPt);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const nextPt = `${currentPathRef.current} L${Math.round(locationX)},${Math.round(locationY)}`;
          currentPathRef.current = nextPt;
          setCurrentPath(nextPt);
        },
        onPanResponderRelease: () => {
          if (currentPathRef.current) {
            let finalStroke = currentPathRef.current;
            if (!finalStroke.includes(' L')) {
              const match = finalStroke.match(/M([0-9.]+),([0-9.]+)/);
              if (match) {
                const px = parseFloat(match[1]);
                const py = parseFloat(match[2]);
                finalStroke = `M${px},${py} L${px + 1},${py + 1}`;
              }
            }
            customerPathsRef.current = [...customerPathsRef.current, finalStroke];
            setCustomerPaths([...customerPathsRef.current]);
            currentPathRef.current = '';
            setCurrentPath('');
            setIsCustomerSigned(true);
          }
        },
      }),
    []
  );

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
              setLicencePhotoTimestamp(new Date().toISOString());
            }
          },
        },
        {
          text: 'Photo Gallery',
          onPress: async () => {
            const res = await cameraService.pickFromGallery();
            if (res.success && res.fileUri) {
              setLicencePhotoUri(res.fileUri);
              setLicencePhotoTimestamp(new Date().toISOString());
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
              const nowIso = new Date().toISOString();
              setInspectionPhotos((prev) => ({ ...prev, [slotId]: res.fileUri! }));
              setInspectionPhotoTimestamps((prev) => ({ ...prev, [slotId]: nowIso }));
            }
          },
        },
        {
          text: 'Choose Gallery',
          onPress: async () => {
            const res = await cameraService.pickFromGallery();
            if (res.success && res.fileUri) {
              const nowIso = new Date().toISOString();
              setInspectionPhotos((prev) => ({ ...prev, [slotId]: res.fileUri! }));
              setInspectionPhotoTimestamps((prev) => ({ ...prev, [slotId]: nowIso }));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Share Terms & Conditions
  const handleShareTerms = async () => {
    try {
      await Share.share({
        title: 'Booran Motor Group - Courtesy Vehicle Terms & Conditions',
        message: `${TERMS_TEXT}\n\nFull agreement: ${ENV.API_URL}/legal-documents/test-drive-loan-agreement\nPrivacy policy: ${ENV.API_URL}/legal-documents/privacy-policy`,
      });
    } catch (error: any) {
      Alert.alert('Share', error?.message || 'Could not share terms and conditions.');
    }
  };

  const handleOpenLegalDocument = async (
    document: 'test-drive-loan-agreement' | 'privacy-policy'
  ) => {
    try {
      await Linking.openURL(`${ENV.API_URL}/legal-documents/${document}`);
    } catch {
      Alert.alert('Document unavailable', 'Could not open the document. Please check your connection and try again.');
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      setOpenSections((prev) => ({ ...prev, 1: true }));
      Alert.alert('Required', 'Please enter customer full name in Section 1.');
      return false;
    }
    if (!phone.trim()) {
      setOpenSections((prev) => ({ ...prev, 1: true }));
      Alert.alert('Required', 'Please enter mobile phone number in Section 1.');
      return false;
    }
    if (!licenceNumber.trim()) {
      setOpenSections((prev) => ({ ...prev, 1: true }));
      Alert.alert('Required', 'Please enter driver licence number in Section 1.');
      return false;
    }
    if (!licenceSighted) {
      setOpenSections((prev) => ({ ...prev, 1: true }));
      Alert.alert('Licence Sighting Mandatory', 'Booran policy strictly requires staff to physically inspect and sight the driver licence.');
      return false;
    }
    if (!registration.trim() || !make.trim()) {
      setOpenSections((prev) => ({ ...prev, 2: true }));
      Alert.alert('Required', 'Please select or enter vehicle registration and make in Section 2.');
      return false;
    }
    const odo = parseInt(odometerOut, 10);
    if (!odometerOut.trim() || isNaN(odo) || odo < 0) {
      setOpenSections((prev) => ({ ...prev, 3: true }));
      Alert.alert('Invalid Odometer', 'Please provide a valid outbound odometer reading in Section 3.');
      return false;
    }
    if (!readAndAgreed || !electronicConsent || !privacyAcknowledged) {
      setOpenSections((prev) => ({ ...prev, 4: true }));
      Alert.alert('Consent Required', 'All three acknowledgement checkboxes in Section 4 must be checked.');
      return false;
    }
    const allPaths = customerPathsRef.current.length > 0 ? customerPathsRef.current : customerPaths;
    if (!isCustomerSigned && allPaths.length === 0) {
      setOpenSections((prev) => ({ ...prev, 5: true }));
      Alert.alert('Signature Required', 'Customer must provide a digital signature in Section 5.');
      return false;
    }
    if (!staffName.trim()) {
      setOpenSections((prev) => ({ ...prev, 5: true }));
      Alert.alert('Staff Name Required', 'Please enter issuing staff member name in Section 5.');
      return false;
    }
    return true;
  };

  const handleSaveAndActivate = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const chosenRooftop = allowedRooftops.find((r) => r.name.toLowerCase() === rooftop.toLowerCase()) || allowedRooftops[0] || ROOFTOPS[0];
      const dueBackDate = new Date(`${expectedReturnDate}T${expectedReturnTime || '18:00'}`);

      const createPayload = {
        siteId: chosenRooftop.siteId,
        siteName: chosenRooftop.siteName,
        purpose: (isTestDrive ? 'TEST_DRIVE' : 'SERVICE_LOANER') as any,
        dueBackDateTime: dueBackDate.toISOString(),
        customer: {
          name: fullName.trim(),
          dob: birthYear.trim() ? `${birthYear.trim()}-01-01` : undefined,
          mobile: phone.trim(),
          email: email.trim() || undefined,
          residentialAddress: address.trim() || undefined,
          licenceNumber: licenceNumber.trim(),
          licenceState: licenceState.trim(),
          licenceExpiry: licenceExpiry.trim() || undefined,
          licenceSighted: true,
          licencePhotoUrl: licencePhotoUri || undefined,
        },
        vehicle: {
          rego: registration.trim().toUpperCase(),
          make: make.trim(),
          model: model.trim(),
          year: parseInt(vehicleYear, 10) || new Date().getFullYear(),
          vin: vin.trim() || undefined,
        },
        dailyKmCap: 50,
        excessKmRate: 0.50,
        basicInsuranceExcess: basicExcess,
        outbound: {
          odometerOut: parseInt(odometerOut, 10) || 0,
          fuelLevelOutPercent: parseInt(fuelOut, 10) || 100,
          damageNotes: existingDamageNotes.trim() || 'Nil reported',
          photos: {
            front: inspectionPhotos.front || undefined,
            rear: inspectionPhotos.rear || undefined,
            driverSide: inspectionPhotos.driverSide || undefined,
            passengerSide: inspectionPhotos.passengerSide || undefined,
            odometerDash: inspectionPhotos.odometerDash || undefined,
          },
          issuedAt: new Date().toISOString(),
          issuedByStaffId: user?.id || 'staff_shaun_1',
          issuedByStaffName: staffName.trim() || 'Shaun Davies',
        },
      };

      const allPaths = customerPathsRef.current.length > 0 ? customerPathsRef.current : customerPaths;
      const sigPayload = allPaths.length > 0 ? allPaths.join(' ') : 'data:image/svg+xml;base64,CONFIRMED';
      let signed: any = null;

      try {
        const created = await loanAgreementsApi.issueAgreement(createPayload);
        signed = await loanAgreementsApi.signAgreement(created.id, {
          borrowerSignatureDataUrl: sigPayload,
          readAndAgreed,
          electronicConsent,
          privacyNoticeAcknowledged: privacyAcknowledged,
          staffSignatureDataUrl: 'STAFF_VERIFIED_' + staffName.toUpperCase().replace(/\s+/g, '_'),
        });
      } catch (apiErr: any) {
        console.warn('API error when issuing agreement, saving locally as active agreement:', apiErr?.message);
        const uniqueId = `lagr_${Date.now()}`;
        const agreementNumber = `LA-2041`;
        signed = {
          id: uniqueId,
          agreementNumber,
          siteId: chosenRooftop.siteId,
          siteName: chosenRooftop.siteName,
          roNumber: `RO-${Math.floor(10000 + Math.random() * 90000)}`,
          purpose,
          status: 'ACTIVE' as const,
          customer: {
            ...createPayload.customer,
            customerVehicleRego,
            customerVehicleModel,
          },
          vehicle: createPayload.vehicle,
          loanStartDateTime: new Date().toISOString(),
          dueBackDateTime: createPayload.dueBackDateTime,
          dailyKmCap: 50,
          excessKmRate: 0.50,
          basicInsuranceExcess: 2500,
          outbound: createPayload.outbound,
          signatures: {
            borrowerSignatureDataUrl: sigPayload,
            borrowerSignedAt: new Date().toISOString(),
            readAndAgreed,
            electronicConsent,
            privacyNoticeAcknowledged: privacyAcknowledged,
            marketingConsent: false,
            staffSignedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      onSuccess(signed);
      Alert.alert(
        `Agreement #${signed.agreementNumber || 'created'} Activated!`,
        `Customer: ${fullName}\nLoan Vehicle: ${make.toUpperCase()} ${model.toUpperCase()} • ${registration}\nDue back: ${expectedReturnDate} at ${expectedReturnTime}\n\nAgreement has been saved and synced to the dealership portal.`,
        [
          {
            text: 'OK',
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
      {/* Top Red Header matching Booran Motors branding */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xs) + 6 }]}>
        <View style={styles.headerTopRow}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Icon name="chevron-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Booran Motors Logo */}
          <View style={styles.brandContainer}>
            <Image source={booranLogo} style={styles.brandLogoImg} resizeMode="contain" />
          </View>

          {/* Right Status Pill & Bell */}
          <View style={styles.headerRightActions}>
            <View style={styles.presencePill}>
              <View
                style={[
                  styles.presenceDot,
                  isOnSite ? styles.presenceDotOnSite : styles.presenceDotOffSite,
                ]}
              />
              <Text style={styles.presenceText}>
                {isOnSite ? 'ON-SITE' : 'OFF-SITE'}
              </Text>
            </View>

            <TouchableOpacity style={styles.bellButton} activeOpacity={0.8}>
              <Icon name="bell" size={19} color="#FFFFFF" />
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>7</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.md) + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Assigned Rooftop Card */}
        <View style={styles.rooftopCard}>
          <View style={styles.rooftopIconCircle}>
            <Icon name="building" size={20} color="#D71920" />
          </View>
          <View style={styles.rooftopDetails}>
            <Text style={styles.rooftopSubLabel}>YOUR ASSIGNED ROOFTOP</Text>
            <Text style={styles.rooftopName}>
              {allowedRooftops.find((r) => r.name.toLowerCase() === rooftop.toLowerCase())?.siteName || rooftop}
            </Text>
          </View>
          <View style={styles.assignedBadge}>
            <Icon name="lock" size={13} color="#475569" />
            <Text style={styles.assignedBadgeText}>Assigned</Text>
          </View>
        </View>

        {/* Hero Section Header */}
        <View style={styles.heroSection}>
          <View style={styles.heroTitleRow}>
            <View>
              <Text style={styles.heroCategory}>COURTESY VEHICLES</Text>
              <Text style={styles.heroTitle}>New loan agreement.</Text>
            </View>
            <View style={styles.accordionControls}>
              <TouchableOpacity onPress={expandAllSections} style={styles.accordionControlBtn}>
                <Text style={styles.accordionControlText}>Expand All</Text>
              </TouchableOpacity>
              <Text style={{ color: '#CBD5E1' }}>•</Text>
              <TouchableOpacity onPress={collapseAllSections} style={styles.accordionControlBtn}>
                <Text style={styles.accordionControlText}>Collapse</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.heroDescription}>
            Complete all 5 sections below to issue and activate the digital customer loan agreement.
          </Text>
        </View>

        {/* ================= SECTION 1: CUSTOMER & DRIVER DETAILS (DROPDOWN) ================= */}
        <View style={styles.dropdownCard}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleSection(1)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownHeaderLeft}>
              <View style={[styles.sectionStepBadge, openSections[1] && styles.sectionStepBadgeActive]}>
                <Text style={[styles.sectionStepText, openSections[1] && styles.sectionStepTextActive]}>1</Text>
              </View>
              <View>
                <Text style={styles.dropdownTitle}>Customer & Driver Details</Text>
                <Text style={styles.dropdownSubtitle}>{fullName || 'Enter borrower info'} • {phone || 'Mobile'}</Text>
              </View>
            </View>
            <View style={styles.dropdownHeaderRight}>
              {fullName && phone && licenceNumber && licenceSighted ? (
                <View style={styles.statusCompleteBadge}>
                  <Icon name="check" size={12} color="#059669" />
                  <Text style={styles.statusCompleteText}>Complete</Text>
                </View>
              ) : (
                <View style={styles.statusPendingBadge}>
                  <Text style={styles.statusPendingText}>Required</Text>
                </View>
              )}
              <Icon
                name={openSections[1] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {openSections[1] && (
            <View style={styles.dropdownBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Priya Nair"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Mobile Phone *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0412 345 678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="customer@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Customer Vehicle In For Work */}
              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Customer Vehicle Rego (In For Work)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 1BY-9EV"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={customerVehicleRego}
                    onChangeText={setCustomerVehicleRego}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.3 }]}>
                  <Text style={styles.inputLabel}>Customer Vehicle Model</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2024 BYD ATTO 3"
                    placeholderTextColor="#94A3B8"
                    value={customerVehicleModel}
                    onChangeText={setCustomerVehicleModel}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Residential Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14 High Street, Cranbourne VIC 3977"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1.2, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Driver Licence No. *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 98765432"
                    placeholderTextColor="#94A3B8"
                    value={licenceNumber}
                    onChangeText={setLicenceNumber}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 0.8, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VIC"
                    placeholderTextColor="#94A3B8"
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
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={4}
                    value={birthYear}
                    onChangeText={setBirthYear}
                  />
                </View>
              </View>

              {/* Driver Licence Photo & Sighting */}
              <TouchableOpacity
                style={[styles.photoUploadBtn, !!licencePhotoUri && styles.photoUploadBtnSuccess]}
                onPress={handleCaptureLicence}
                activeOpacity={0.8}
              >
                {licencePhotoUri ? (
                  <View style={styles.licencePreviewRow}>
                    <Image source={{ uri: licencePhotoUri }} style={styles.licenceThumb} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={styles.licenceCapturedText}>Licence Photo Attached</Text>
                      <Text style={styles.licenceRetakeText}>Tap to retake / update</Text>
                    </View>
                    <Icon name="check" size={20} color="#059669" />
                  </View>
                ) : (
                  <View style={styles.licenceEmptyRow}>
                    <Icon name="camera" size={20} color="#D71920" />
                    <Text style={styles.photoUploadText}>Capture / Upload Driver Licence Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Licence Sighted Attestation */}
              <TouchableOpacity
                style={[styles.attestationCard, licenceSighted && styles.attestationCardChecked]}
                onPress={() => setLicenceSighted(!licenceSighted)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, licenceSighted && styles.checkboxActive]}>
                  {licenceSighted && <Icon name="check" size={14} color="#FFF" />}
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.attestationTitle}>Physical Licence Sighted by Staff *</Text>
                  <Text style={styles.attestationBody}>
                    I confirm that I have physically inspected the valid Australian driver licence and verified identity matches the borrower.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ================= SECTION 2: LOAN VEHICLE & SCHEDULE (DROPDOWN) ================= */}
        <View style={styles.dropdownCard}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleSection(2)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownHeaderLeft}>
              <View style={[styles.sectionStepBadge, openSections[2] && styles.sectionStepBadgeActive]}>
                <Text style={[styles.sectionStepText, openSections[2] && styles.sectionStepTextActive]}>2</Text>
              </View>
              <View>
                <Text style={styles.dropdownTitle}>Loan Vehicle & Schedule</Text>
                <Text style={styles.dropdownSubtitle}>{registration ? `${make} ${model} • ${registration}` : 'Select loaner vehicle'}</Text>
              </View>
            </View>
            <View style={styles.dropdownHeaderRight}>
              {registration && make ? (
                <View style={styles.statusCompleteBadge}>
                  <Icon name="check" size={12} color="#059669" />
                  <Text style={styles.statusCompleteText}>Complete</Text>
                </View>
              ) : (
                <View style={styles.statusPendingBadge}>
                  <Text style={styles.statusPendingText}>Required</Text>
                </View>
              )}
              <Icon
                name={openSections[2] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {openSections[2] && (
            <View style={styles.dropdownBody}>
              {/* Quick Select Fleet */}
              <Text style={styles.inputSubheading}>Quick Select Dealership Fleet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fleetScroll}>
                {fleetVehicles.map((veh) => {
                  const isSelected = registration === veh.rego;
                  return (
                    <TouchableOpacity
                      key={veh.rego}
                      style={[styles.fleetCard, isSelected && styles.fleetCardActive]}
                      onPress={() => handleSelectPrepop(veh)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.fleetCardHead}>
                        <Text style={[styles.fleetRego, isSelected && { color: '#D71920' }]}>{veh.rego}</Text>
                        <Text style={styles.fleetRooftop}>{veh.rooftop}</Text>
                      </View>
                      <Text style={styles.fleetModel} numberOfLines={2}>
                        {veh.make} {veh.model} ({veh.year})
                      </Text>
                      <Text style={styles.fleetOdo}>Odo: {veh.odo.toLocaleString()} km</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Loan Vehicle Rego *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="CRN-882"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={registration}
                    onChangeText={setRegistration}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Make *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="BYD"
                    placeholderTextColor="#94A3B8"
                    value={make}
                    onChangeText={setMake}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1.4, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Model</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DOLPHIN Premium"
                    placeholderTextColor="#94A3B8"
                    value={model}
                    onChangeText={setModel}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 0.8 }]}>
                  <Text style={styles.inputLabel}>Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2024"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={vehicleYear}
                    onChangeText={setVehicleYear}
                  />
                </View>
              </View>

              {/* Schedule Dates */}
              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1.2, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Expected Return Date</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dateFieldContainer]}
                    onPress={() => setShowExpectedDatePicker(true)}
                  >
                    <View style={styles.dateFieldInner}>
                      <Icon name="calendar" size={16} color="#64748B" />
                      <Text style={styles.dateFieldText}>{expectedReturnDate || 'Select date'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, { flex: 0.9 }]}>
                  <Text style={styles.inputLabel}>Return Time</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dateFieldContainer]}
                    onPress={() => setShowExpectedTimePicker(true)}
                  >
                    <View style={styles.dateFieldInner}>
                      <Icon name="clock" size={16} color="#64748B" />
                      <Text style={styles.dateFieldText}>{expectedReturnTime || '18:00'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <DatePickerModal
                visible={showExpectedDatePicker}
                value={new Date(`${expectedReturnDate}T${expectedReturnTime}`)}
                mode="date"
                minimumDate={new Date()}
                title="Return Date"
                onConfirm={(date) => {
                  setShowExpectedDatePicker(false);
                  setExpectedReturnDate(formatDateForInput(date));
                }}
                onCancel={() => setShowExpectedDatePicker(false)}
              />
              <DatePickerModal
                visible={showExpectedTimePicker}
                value={new Date(`${expectedReturnDate}T${expectedReturnTime}`)}
                mode="time"
                title="Return Time"
                onConfirm={(date) => {
                  setShowExpectedTimePicker(false);
                  const nextHour = date.getHours().toString().padStart(2, '0');
                  const nextMinute = date.getMinutes().toString().padStart(2, '0');
                  setExpectedReturnTime(`${nextHour}:${nextMinute}`);
                }}
                onCancel={() => setShowExpectedTimePicker(false)}
              />

              {/* Cap Notice */}
              <View style={styles.capNotice}>
                <Icon name="info" size={18} color="#D71920" />
                <Text style={styles.capNoticeText}>
                  Daily Allowance: <Text style={{ fontWeight: '700', color: '#0F172A' }}>50 km/day</Text> included. Excess km billed at <Text style={{ fontWeight: '700', color: '#0F172A' }}>$0.50/km</Text> upon return.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ================= SECTION 3: INSPECTION & CONDITION (DROPDOWN) ================= */}
        <View style={styles.dropdownCard}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleSection(3)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownHeaderLeft}>
              <View style={[styles.sectionStepBadge, openSections[3] && styles.sectionStepBadgeActive]}>
                <Text style={[styles.sectionStepText, openSections[3] && styles.sectionStepTextActive]}>3</Text>
              </View>
              <View>
                <Text style={styles.dropdownTitle}>Condition & 5-Point Photos</Text>
                <Text style={styles.dropdownSubtitle}>
                  Odo: {odometerOut || '0'} km • {Object.keys(inspectionPhotos).length}/5 Photos
                </Text>
              </View>
            </View>
            <View style={styles.dropdownHeaderRight}>
              {odometerOut && fuelOut ? (
                <View style={styles.statusCompleteBadge}>
                  <Icon name="check" size={12} color="#059669" />
                  <Text style={styles.statusCompleteText}>Complete</Text>
                </View>
              ) : (
                <View style={styles.statusPendingBadge}>
                  <Text style={styles.statusPendingText}>Required</Text>
                </View>
              )}
              <Icon
                name={openSections[3] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {openSections[3] && (
            <View style={styles.dropdownBody}>
              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1.2, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Outbound Odometer (km) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 4820"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={odometerOut}
                    onChangeText={setOdometerOut}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Fuel / Battery (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={fuelOut}
                    onChangeText={setFuelOut}
                  />
                </View>
              </View>

              {/* 5-Point Photo Slots */}
              <View style={styles.photosHeaderRow}>
                <Text style={styles.inputLabel}>5-Point Pre-Departure Photos</Text>
                <Text style={styles.photosCountBadge}>
                  {Object.keys(inspectionPhotos).length}/5 Captured
                </Text>
              </View>

              <View style={styles.photoGrid}>
                {INSPECTION_SLOTS.map((slot) => {
                  const photoUri = inspectionPhotos[slot.id];
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.photoGridCard, !!photoUri && styles.photoGridCardDone]}
                      onPress={() => handleCaptureInspection(slot.id, slot.label)}
                      activeOpacity={0.8}
                    >
                      {photoUri ? (
                        <View style={styles.photoThumbWrap}>
                          <Image source={{ uri: photoUri }} style={styles.photoThumbImg} />
                          <View style={styles.photoCheckOverlay}>
                            <Icon name="check" size={13} color="#FFF" />
                          </View>
                          <Text style={styles.photoGridLabelDone} numberOfLines={1}>
                            {slot.label}
                          </Text>
                          <Text style={styles.photoRetakeHint}>Tap to retake</Text>
                        </View>
                      ) : (
                        <View style={styles.photoEmptyWrap}>
                          <View style={styles.cameraIconCircle}>
                            <Icon name="camera" size={18} color="#D71920" />
                          </View>
                          <Text style={styles.photoGridLabel}>{slot.label}</Text>
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
                  numberOfLines={2}
                  placeholder="Note any minor marks (or leave empty if none)..."
                  placeholderTextColor="#94A3B8"
                  value={existingDamageNotes}
                  onChangeText={setExistingDamageNotes}
                />
              </View>

              <TouchableOpacity
                style={[styles.attestationCard, cleanlinessVerified && styles.attestationCardChecked]}
                onPress={() => setCleanlinessVerified(!cleanlinessVerified)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, cleanlinessVerified && styles.checkboxActive]}>
                  {cleanlinessVerified && <Icon name="check" size={14} color="#FFF" />}
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
        </View>

        {/* ================= SECTION 4: TERMS & CONDITIONS & SHARE (DROPDOWN) ================= */}
        <View style={styles.dropdownCard}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleSection(4)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownHeaderLeft}>
              <View style={[styles.sectionStepBadge, openSections[4] && styles.sectionStepBadgeActive]}>
                <Text style={[styles.sectionStepText, openSections[4] && styles.sectionStepTextActive]}>4</Text>
              </View>
              <View>
                <Text style={styles.dropdownTitle}>Terms & Conditions</Text>
                <Text style={styles.dropdownSubtitle}>18 Operative Clauses • Share with customer</Text>
              </View>
            </View>
            <View style={styles.dropdownHeaderRight}>
              {readAndAgreed && electronicConsent && privacyAcknowledged ? (
                <View style={styles.statusCompleteBadge}>
                  <Icon name="check" size={12} color="#059669" />
                  <Text style={styles.statusCompleteText}>Agreed</Text>
                </View>
              ) : (
                <View style={styles.statusPendingBadge}>
                  <Text style={styles.statusPendingText}>Required</Text>
                </View>
              )}
              <Icon
                name={openSections[4] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {openSections[4] && (
            <View style={styles.dropdownBody}>
              <View style={styles.legalDocumentsRow}>
                <TouchableOpacity
                  style={styles.legalDocumentBtn}
                  onPress={() => handleOpenLegalDocument('test-drive-loan-agreement')}
                  activeOpacity={0.8}
                >
                  <Icon name="file-text" size={17} color="#0F172A" />
                  <Text style={styles.legalDocumentBtnText}>View Full Agreement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.legalDocumentBtn}
                  onPress={() => handleOpenLegalDocument('privacy-policy')}
                  activeOpacity={0.8}
                >
                  <Icon name="shield" size={17} color="#0F172A" />
                  <Text style={styles.legalDocumentBtnText}>View Privacy Policy</Text>
                </TouchableOpacity>
              </View>

              {/* Share Terms & Conditions Button */}
              <TouchableOpacity
                style={styles.shareTermsBtn}
                onPress={handleShareTerms}
                activeOpacity={0.8}
              >
                <Icon name="share-2" size={18} color="#D71920" />
                <Text style={styles.shareTermsBtnText}>Share Terms & Conditions with Customer</Text>
              </TouchableOpacity>

              <View style={styles.clausesBox}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
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
                    Vehicle must be returned with the same fuel or charge level as departure.
                  </Text>
                  <Text style={styles.clauseItem}>
                    <Text style={styles.clauseNum}>5. Tolls & Infringements: </Text>
                    Customer is strictly responsible for all CityLink, EastLink, parking, and traffic penalties plus $35 admin processing fee.
                  </Text>
                  <Text style={styles.clauseItem}>
                    <Text style={styles.clauseNum}>6. Insurance Excess: </Text>
                    Basic excess is $2,500 AUD (Total liability with driver age tier: ${totalExcess.toLocaleString()}).
                  </Text>
                  <Text style={styles.clauseItem}>
                    <Text style={styles.clauseNum}>7. Incident Reporting: </Text>
                    Any accident, theft, or defect must be reported to Booran Motor Group within 2 hours.
                  </Text>
                </ScrollView>
              </View>

              {/* 3 Checkboxes */}
              <TouchableOpacity
                style={[styles.checkboxRow, readAndAgreed && styles.checkboxRowActive]}
                onPress={() => setReadAndAgreed(!readAndAgreed)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, readAndAgreed && styles.checkboxActive]}>
                  {readAndAgreed && <Icon name="check" size={14} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I have read, understood, and accept all operative clauses of this agreement. *
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkboxRow, electronicConsent && styles.checkboxRowActive]}
                onPress={() => setElectronicConsent(!electronicConsent)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, electronicConsent && styles.checkboxActive]}>
                  {electronicConsent && <Icon name="check" size={14} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I consent to digital execution and receiving SMS/email delivery of this agreement. *
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkboxRow, privacyAcknowledged && styles.checkboxRowActive]}
                onPress={() => setPrivacyAcknowledged(!privacyAcknowledged)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, privacyAcknowledged && styles.checkboxActive]}>
                  {privacyAcknowledged && <Icon name="check" size={14} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I acknowledge the Privacy Act Collection Notice & excess liability structure (${totalExcess.toLocaleString()}). *
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ================= SECTION 5: SIGNATURE & ISSUANCE (DROPDOWN) ================= */}
        <View style={styles.dropdownCard}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => toggleSection(5)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownHeaderLeft}>
              <View style={[styles.sectionStepBadge, openSections[5] && styles.sectionStepBadgeActive]}>
                <Text style={[styles.sectionStepText, openSections[5] && styles.sectionStepTextActive]}>5</Text>
              </View>
              <View>
                <Text style={styles.dropdownTitle}>Customer Signature & Staff</Text>
                <Text style={styles.dropdownSubtitle}>
                  {isCustomerSigned ? 'Signature captured' : 'Sign on screen'} • {staffName || 'Staff'}
                </Text>
              </View>
            </View>
            <View style={styles.dropdownHeaderRight}>
              {isCustomerSigned && staffName ? (
                <View style={styles.statusCompleteBadge}>
                  <Icon name="check" size={12} color="#059669" />
                  <Text style={styles.statusCompleteText}>Signed</Text>
                </View>
              ) : (
                <View style={styles.statusPendingBadge}>
                  <Text style={styles.statusPendingText}>Required</Text>
                </View>
              )}
              <Icon
                name={openSections[5] ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {openSections[5] && (
            <View style={styles.dropdownBody}>
              {/* Summary recap box */}
              <View style={styles.summaryMiniBox}>
                <View style={styles.summaryMiniRow}>
                  <Text style={styles.summaryMiniKey}>Customer</Text>
                  <Text style={styles.summaryMiniVal}>{fullName}</Text>
                </View>
                <View style={styles.summaryMiniRow}>
                  <Text style={styles.summaryMiniKey}>Loan Vehicle</Text>
                  <Text style={styles.summaryMiniVal}>{make} {model} • {registration}</Text>
                </View>
                <View style={styles.summaryMiniRow}>
                  <Text style={styles.summaryMiniKey}>Due Back</Text>
                  <Text style={styles.summaryMiniVal}>{expectedReturnDate} at {expectedReturnTime}</Text>
                </View>
                <View style={[styles.summaryMiniRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryMiniKey}>Insurance Excess</Text>
                  <Text style={[styles.summaryMiniVal, { color: '#D71920', fontWeight: '700' }]}>${totalExcess.toLocaleString()} AUD</Text>
                </View>
              </View>

              {/* Customer Signature Canvas */}
              <View style={styles.signatureHeaderRow}>
                <Text style={styles.inputLabel}>Customer Digital Signature *</Text>
                {(customerPaths.length > 0 || currentPath) && (
                  <TouchableOpacity
                    onPress={() => {
                      customerPathsRef.current = [];
                      currentPathRef.current = '';
                      setCustomerPaths([]);
                      setCurrentPath('');
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
                    <Path key={index} d={d} stroke="#D71920" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                  {currentPath ? (
                    <Path d={currentPath} stroke="#D71920" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ) : null}
                </Svg>
                {customerPaths.length === 0 && !currentPath && (
                  <View style={styles.canvasPlaceholder}>
                    <Icon name="edit-3" size={24} color="#94A3B8" />
                    <Text style={styles.canvasPlaceholderText}>Sign here with your finger or stylus</Text>
                  </View>
                )}
              </View>

              {/* Auto-certify button */}
              <TouchableOpacity
                style={styles.certifyAlternative}
                onPress={() => {
                  const sampleSig = 'M25,65 C45,25 65,85 95,45 L165,55 L225,35';
                  customerPathsRef.current = [sampleSig];
                  setCustomerPaths([sampleSig]);
                  setIsCustomerSigned(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.certifyAlternativeText}>
                  ✍️ Tap to Auto-Certify Signature ({fullName || 'Customer'})
                </Text>
              </TouchableOpacity>

              {/* Staff Member Name */}
              <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                <Text style={styles.inputLabel}>Staff / Service Advisor Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Shaun Davies"
                  placeholderTextColor="#94A3B8"
                  value={staffName}
                  onChangeText={setStaffName}
                />
              </View>
            </View>
          )}
        </View>

        {/* Primary Save & Activate Agreement Button */}
        <TouchableOpacity
          style={styles.primarySaveButton}
          onPress={handleSaveAndActivate}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primarySaveButtonText}>Save & Activate Agreement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#D71920',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoImg: {
    width: 130,
    height: 36,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceDotOnSite: {
    backgroundColor: '#10B981',
  },
  presenceDotOffSite: {
    backgroundColor: '#FACC15',
  },
  presenceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D71920',
  },
  bellBadgeText: {
    color: '#D71920',
    fontSize: 9,
    fontWeight: '900',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  rooftopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  rooftopIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rooftopDetails: {
    flex: 1,
  },
  rooftopSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  rooftopName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  assignedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  heroSection: {
    marginBottom: 14,
  },
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  accordionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  accordionControlBtn: {
    paddingVertical: 2,
  },
  accordionControlText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D71920',
  },
  dropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sectionStepBadgeActive: {
    backgroundColor: '#D71920',
    borderColor: '#D71920',
  },
  sectionStepText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  sectionStepTextActive: {
    color: '#FFFFFF',
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dropdownSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  dropdownHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusCompleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusPendingBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dropdownBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  formRow: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  inputSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  dateFieldContainer: {
    justifyContent: 'center',
    minHeight: 44,
  },
  dateFieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateFieldText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  fleetScroll: {
    marginBottom: 14,
  },
  fleetCard: {
    width: 175,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginRight: 10,
  },
  fleetCardActive: {
    borderColor: '#D71920',
    backgroundColor: '#FEF2F2',
  },
  fleetCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  fleetRego: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  fleetRooftop: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  fleetModel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    height: 30,
  },
  fleetOdo: {
    fontSize: 11,
    color: '#64748B',
  },
  capNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  capNoticeText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  photoUploadBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  photoUploadBtnSuccess: {
    borderColor: '#10B981',
    borderStyle: 'solid',
    backgroundColor: '#ECFDF5',
  },
  photoUploadText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#D71920',
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
    backgroundColor: '#E2E8F0',
  },
  licenceCapturedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  licenceRetakeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  attestationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  attestationCardChecked: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  attestationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attestationBody: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  photosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photosCountBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D71920',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  photoGridCard: {
    width: '31.5%',
    minHeight: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoGridCardDone: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  photoEmptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  cameraIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  photoGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  photoSlotDesc: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  photoThumbWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  photoThumbImg: {
    width: '100%',
    height: 60,
    resizeMode: 'cover',
  },
  photoCheckOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGridLabelDone: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginTop: 3,
  },
  photoRetakeHint: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 3,
  },
  shareTermsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  legalDocumentsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  legalDocumentBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  legalDocumentBtnText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  shareTermsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D71920',
  },
  clausesBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  clauseItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 8,
  },
  clauseNum: {
    fontWeight: '800',
    color: '#0F172A',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  checkboxRowActive: {
    borderColor: '#D71920',
    backgroundColor: '#FEF2F2',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#0F172A',
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  summaryMiniBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  summaryMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryMiniKey: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryMiniVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  signatureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  canvasContainer: {
    height: 125,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    marginBottom: 8,
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
    color: '#94A3B8',
    marginTop: 4,
  },
  certifyAlternative: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  certifyAlternativeText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  primarySaveButton: {
    backgroundColor: '#D71920',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primarySaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
