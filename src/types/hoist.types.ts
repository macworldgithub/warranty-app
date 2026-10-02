export type HoistStatus = 'OPERATIONAL' | 'FAULT_IDENTIFIED' | 'OUT_OF_SERVICE';
export type HoistFacility = 'hyundai_chery' | 'byd_kia' | 'general' | 'all';
export type InspectionStatus = 'PASS' | 'FAULT_IDENTIFIED' | 'TAGGED_OUT';
export type ChecklistItemStatus = 'PASS' | 'FAULT' | 'NA';
export type FaultSeverity = 'NONE' | 'MINOR' | 'MODERATE' | 'CRITICAL';

export interface Hoist {
  id: string;
  hoistNumber: number;
  name: string;
  facility: 'hyundai_chery' | 'byd_kia' | 'general';
  facilityName: string;
  siteId: string;
  brand: string;
  capacityKg: number;
  type: string;
  status: HoistStatus;
  lastInspectionDate?: string;
  lastInspectionStatus?: InspectionStatus;
  lastInspectedBy?: string;
  lastInspectedByName?: string;
  activeFaultNotes?: string;
  lockoutTagoutActive: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HoistChecklistItem {
  itemId: string;
  title: string;
  status: ChecklistItemStatus;
  notes?: string;
  photoUrl?: string;
}

export interface HoistInspection {
  id: string;
  hoistId: string;
  hoistNumber: number;
  facility: 'hyundai_chery' | 'byd_kia' | 'general';
  siteId: string;
  inspectorId: string;
  inspectorName: string;
  inspectorRole: string;
  shiftDate: string;
  shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'DAILY';
  status: InspectionStatus;
  checklistItems: HoistChecklistItem[];
  faultNotes?: string;
  faultSeverity: FaultSeverity;
  photos: string[];
  lockoutTagoutApplied: boolean;
  correctiveActionRequired: boolean;
  managerNotes?: string;
  signedAt: string;
  createdAt?: string;
}

export interface SubmitInspectionPayload {
  hoistId: string;
  inspectorId: string;
  inspectorName: string;
  inspectorRole?: string;
  shiftDate?: string;
  shiftType?: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'DAILY';
  status: InspectionStatus;
  checklistItems: HoistChecklistItem[];
  faultNotes?: string;
  faultSeverity?: FaultSeverity;
  photos?: string[];
  lockoutTagoutApplied?: boolean;
  correctiveActionRequired?: boolean;
  managerNotes?: string;
}

export interface HoistSummary {
  totalHoists: number;
  inspectedToday: number;
  pendingToday: number;
  operational: number;
  faultIdentified: number;
  outOfService: number;
  todayDate: string;
}

export const HOIST_CHECKLIST_TEMPLATE: Array<{ id: string; title: string }> = [
  { id: 'item_1', title: 'Operating controls & emergency stop functioning' },
  { id: 'item_2', title: 'Safety locks engaging and disengaging cleanly' },
  { id: 'item_3', title: 'Wire ropes, chains & pulleys undamaged and properly tensioned' },
  { id: 'item_4', title: 'Hydraulic lines, cylinders & fittings free of leaks' },
  { id: 'item_5', title: 'Lifting arms, rubber pads & adapters intact and secure' },
  { id: 'item_6', title: 'Overhead limit switch functioning (if equipped)' },
  { id: 'item_7', title: 'Floor area clean, dry & free of obstructions / slip hazards' },
  { id: 'item_8', title: 'Hoist structural integrity (anchors, posts, carriages) no cracks/damage' },
  { id: 'item_9', title: 'Warning labels and load capacity placards legible' },
];
