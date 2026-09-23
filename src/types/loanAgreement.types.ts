export interface LoanAgreementCustomer {
  name: string;
  dob: string;
  mobile: string;
  email: string;
  residentialAddress: string;
  licenceNumber: string;
  licenceState: string;
  licenceExpiry: string;
  licenceClass?: string;
  licencePhotoUrl?: string;
  licenceSighted: boolean;
}

export interface LoanAgreementVehicle {
  vin: string;
  rego: string;
  make: string;
  model: string;
  year: number;
  colour?: string;
  stockNumber?: string;
}

export interface LoanAgreementPhotos {
  front?: string;
  rear?: string;
  driverSide?: string;
  passengerSide?: string;
  odometerDash?: string;
}

export interface LoanAgreementOutbound {
  odometerOut: number;
  fuelLevelOutPercent: number;
  damageNotes?: string;
  photos?: LoanAgreementPhotos;
  issuedAt: string;
  issuedByStaffId: string;
  issuedByStaffName: string;
}

export interface LoanAgreementInbound {
  odometerIn?: number;
  fuelLevelInPercent?: number;
  returnDamageNotes?: string;
  photos?: LoanAgreementPhotos;
  returnedAt?: string;
  receivedByStaffId?: string;
  receivedByStaffName?: string;
  totalKmTravelled?: number;
  allowableKm?: number;
  excessKm?: number;
  excessKmChargeAmount?: number;
  hasDamageIncident?: boolean;
  applicableExcessBand?: string;
  applicableExcessAmount?: number;
}

export interface LoanAgreementSignatures {
  borrowerSignatureDataUrl: string;
  borrowerSignedAt: string;
  readAndAgreed: boolean;
  electronicConsent: boolean;
  privacyNoticeAcknowledged: boolean;
  marketingConsent?: boolean;
  staffSignatureDataUrl?: string;
  staffSignedAt?: string;
}

export type LoanAgreementStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'RETURNED'
  | 'DISPUTED';

export interface LoanAgreement {
  id: string;
  agreementNumber: string;
  siteId: string;
  siteName: string;
  roNumber?: string;
  purpose: 'SERVICE_LOANER' | 'TEST_DRIVE' | 'COURTESY_LOAN' | 'DEMO';
  status: LoanAgreementStatus;
  customer: LoanAgreementCustomer;
  vehicle: LoanAgreementVehicle;
  loanStartDateTime: string;
  dueBackDateTime: string;
  dailyKmCap: number;
  excessKmRate: number;
  basicInsuranceExcess: number;
  outbound: LoanAgreementOutbound;
  inbound?: LoanAgreementInbound;
  signatures?: LoanAgreementSignatures;
  pdfStorageUrl?: string;
  pdfSha256Hash?: string;
  templateVersion: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanAgreementKpis {
  available: number;
  outNow: number;
  dueSoon: number;
  overdue: number;
}
