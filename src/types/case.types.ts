import { MediaType } from './brandPack.types';

export type CaseStatus =
  | 'Draft'
  | 'Uploading'
  | 'Awaiting Review'
  | 'Flagged'
  | 'Submitted'
  | 'Closed'
  | 'Withdrawn';

export type PowertrainType = 'EV' | 'Hybrid' | 'ICE';

export type RepairStage = 'Pre-repair only' | 'During repair' | 'Repair complete';

export interface QualityCheckResult {
  passed: boolean;
  blurDetected?: boolean;
  tooDark?: boolean;
  tooBright?: boolean;
  resolutionWidth?: number;
  resolutionHeight?: number;
  ocrMatch?: boolean;
  score?: number;
  reasons?: string[];
}

export interface EvidenceItem {
  id?: string;
  ruleKey: string;
  ruleName?: string;
  mediaType: MediaType;
  originalFileName?: string;
  oemFileName: string;
  fileUri?: string;
  serverUrl?: string;
  fileSize?: number;
  mimeType?: string;
  capturedAt: string;
  serialNumber?: string;
  ocrExtractedText?: string;
  durationSeconds?: number;
  qualityStatus?: 'PASSED' | 'WARNING' | 'FAILED';
  qualityCheck?: QualityCheckResult;
  isMandatory: boolean;
  tier?: 1 | 2;
  pinnedVoiceNoteIds?: string[];
  notes?: string;
  isUploaded?: boolean;
}

export interface VoiceNote {
  id: string;
  audioUri?: string;
  serverAudioUrl?: string;
  durationSeconds: number;
  transcript: string;
  recordedAt: string;
  technicianId?: string;
  pinnedToRuleKey?: string;
  isEdited?: boolean;
}

export interface FlagItem {
  id: string;
  ruleKey?: string;
  reasonCode:
    | 'MISSING_SHOT'
    | 'UNREADABLE_VIN'
    | 'WRONG_ANGLE'
    | 'NO_SERIAL'
    | 'NO_DTC'
    | 'VIDEO_TOO_SHORT'
    | 'OTHER';
  instruction: string;
  flaggedAt: string;
  flaggedBy?: string;
  isResolved?: boolean;
  resolvedAt?: string;
}

export interface ChecklistSummary {
  totalMandatory: number;
  completedMandatory: number;
  totalOptional: number;
  completedOptional: number;
  isReadyForSubmission: boolean;
}

export interface WarrantyCase {
  _id?: string;
  id: string;
  siteId: string;
  siteName?: string;
  brandId: string;
  brandName?: string;
  brandPackId?: string;
  brandPackVersion?: number;
  roNumber: string;
  claimNumber?: string;
  vin: string;
  odometer: number | null;
  make: string;
  model: string;
  year: number | null;
  powertrain: PowertrainType;
  status: CaseStatus;
  technicianId: string;
  technicianName: string;
  concernTitle: string;
  faultCategory: string;
  partReplaced: boolean;
  oldPartSerial?: string;
  newPartSerial?: string;
  noiseFault: boolean;
  diagnosticsAvailable: boolean;
  repairStage: RepairStage;
  evidenceItems: EvidenceItem[];
  voiceNotes: VoiceNote[];
  flagHistory: FlagItem[];
  checklistSummary?: ChecklistSummary;
  clerkNotes?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface CreateWarrantyCaseDto {
  siteId: string;
  siteName: string;
  brandId: string;
  brandName: string;
  brandPackId?: string;
  brandPackVersion?: number;
  roNumber: string;
  claimNumber?: string;
  vin: string;
  odometer: number;
  make: string;
  model: string;
  year: number;
  powertrain: PowertrainType;
  concernTitle: string;
  faultCategory: string;
  partReplaced: boolean;
  oldPartSerial?: string;
  newPartSerial?: string;
  noiseFault: boolean;
  diagnosticsAvailable: boolean;
  repairStage: RepairStage;
  technicianId?: string;
  technicianName?: string;
  evidenceItems?: EvidenceItem[];
  voiceNotes?: VoiceNote[];
}

export interface DecodeVinResponse {
  vin: string;
  make: string;
  model: string;
  year: number;
  powertrain: PowertrainType;
  provider: string;
  isValidCheckDigit: boolean;
  requiresManualConfirm: boolean;
}
