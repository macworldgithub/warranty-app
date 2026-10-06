import { apiClient } from './client';
import {
  Hoist,
  HoistInspection,
  HoistSummary,
  SubmitInspectionPayload,
  HOIST_CHECKLIST_TEMPLATE,
} from '../types/hoist.types';

const INITIAL_HOISTS: Hoist[] = [
  // Hyundai & Chery Workshop (Bays 1 - 11)
  {
    id: 'hoist_1',
    hoistNumber: 1,
    name: 'Bay 01 - 2-Post Clearfloor',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_2',
    hoistNumber: 2,
    name: 'Bay 02 - 2-Post Asymmetric',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4000,
    type: '2-Post Asymmetric (4.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_02',
    lastInspectedByName: 'Marcus V.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_3',
    hoistNumber: 3,
    name: 'Bay 03 - 4-Post Wheel Alignment',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'BendPak',
    capacityKg: 5500,
    type: '4-Post Alignment (5.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_4',
    hoistNumber: 4,
    name: 'Bay 04 - High-Lift Scissor',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Nussbaum',
    capacityKg: 4000,
    type: 'In-ground Scissor (4.0T)',
    status: 'FAULT_IDENTIFIED',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'FAULT_IDENTIFIED',
    lastInspectedBy: 'tech_03',
    lastInspectedByName: 'Liam K.',
    activeFaultNotes: 'Minor hydraulic weeping on secondary safety lock ram. Work order logged #WO-9021.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_5',
    hoistNumber: 5,
    name: 'Bay 05 - 2-Post Clearfloor',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date(Date.now() - 86400000).toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_02',
    lastInspectedByName: 'Marcus V.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_6',
    hoistNumber: 6,
    name: 'Bay 06 - 2-Post Heavy Commercial',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Molnar',
    capacityKg: 5000,
    type: '2-Post Heavy (5.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date(Date.now() - 86400000).toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_7',
    hoistNumber: 7,
    name: 'Bay 07 - In-Ground Scissor',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Nussbaum',
    capacityKg: 3500,
    type: 'In-Ground Scissor (3.5T)',
    status: 'OUT_OF_SERVICE',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'TAGGED_OUT',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    activeFaultNotes: 'LOTO Tag #LOTO-8812 applied. Upper limit safety sensor microswitch failed.',
    lockoutTagoutActive: true,
    isActive: false,
  },
  {
    id: 'hoist_8',
    hoistNumber: 8,
    name: 'Bay 08 - 2-Post Clearfloor',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_04',
    lastInspectedByName: 'Dave R.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_9',
    hoistNumber: 9,
    name: 'Bay 09 - 2-Post Symmetrical',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'BendPak',
    capacityKg: 4000,
    type: '2-Post Symmetrical (4.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_04',
    lastInspectedByName: 'Dave R.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_10',
    hoistNumber: 10,
    name: 'Bay 10 - 4-Post Service Hoist',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Molnar',
    capacityKg: 6000,
    type: '4-Post Heavy Duty (6.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_03',
    lastInspectedByName: 'Liam K.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_11',
    hoistNumber: 11,
    name: 'Bay 11 - Diagnostic & Express Bay',
    facility: 'hyundai_chery',
    facilityName: 'Hyundai / Chery Workshop',
    siteId: 'site_melbourne_se',
    brand: 'Nussbaum',
    capacityKg: 3500,
    type: 'Double Scissor (3.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },

  // BYD & Kia Workshop (Bays 12 - 23)
  {
    id: 'hoist_12',
    hoistNumber: 12,
    name: 'Bay 12 - Dedicated EV Battery Drop',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Ravaglioli EV',
    capacityKg: 5000,
    type: 'EV Battery Underbody Hoist (5.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_13',
    hoistNumber: 13,
    name: 'Bay 13 - 2-Post Clearfloor EV-Ready',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_02',
    lastInspectedByName: 'Marcus V.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_14',
    hoistNumber: 14,
    name: 'Bay 14 - 2-Post Clearfloor',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_03',
    lastInspectedByName: 'Liam K.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_15',
    hoistNumber: 15,
    name: 'Bay 15 - In-Ground Scissor Alignment',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Hunter Engineering',
    capacityKg: 5000,
    type: 'Scissor Alignment (5.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_16',
    hoistNumber: 16,
    name: 'Bay 16 - 2-Post Symmetrical',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'BendPak',
    capacityKg: 4500,
    type: '2-Post Symmetrical (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date(Date.now() - 86400000).toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_02',
    lastInspectedByName: 'Marcus V.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_17',
    hoistNumber: 17,
    name: 'Bay 17 - EV Battery Drop Station',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Ravaglioli EV',
    capacityKg: 5000,
    type: 'EV Battery Underbody Hoist (5.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_18',
    hoistNumber: 18,
    name: 'Bay 18 - 2-Post Clearfloor',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date(Date.now() - 86400000).toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_03',
    lastInspectedByName: 'Liam K.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_19',
    hoistNumber: 19,
    name: 'Bay 19 - High-Lift Scissor',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Nussbaum',
    capacityKg: 4000,
    type: 'In-Ground Scissor (4.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_04',
    lastInspectedByName: 'Dave R.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_20',
    hoistNumber: 20,
    name: 'Bay 20 - 4-Post Commercial Hoist',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Molnar',
    capacityKg: 6500,
    type: '4-Post Heavy Duty (6.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_21',
    hoistNumber: 21,
    name: 'Bay 21 - 2-Post Asymmetric',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4000,
    type: '2-Post Asymmetric (4.0T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_02',
    lastInspectedByName: 'Marcus V.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_22',
    hoistNumber: 22,
    name: 'Bay 22 - 2-Post Clearfloor',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Rotary Lift',
    capacityKg: 4500,
    type: '2-Post Clearfloor (4.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_04',
    lastInspectedByName: 'Dave R.',
    lockoutTagoutActive: false,
    isActive: true,
  },
  {
    id: 'hoist_23',
    hoistNumber: 23,
    name: 'Bay 23 - Delivery & Pre-Delivery Inspection',
    facility: 'byd_kia',
    facilityName: 'BYD / Kia Specialist Facility',
    siteId: 'site_melbourne_se',
    brand: 'Nussbaum',
    capacityKg: 3500,
    type: 'Double Scissor (3.5T)',
    status: 'OPERATIONAL',
    lastInspectionDate: new Date().toISOString(),
    lastInspectionStatus: 'PASS',
    lastInspectedBy: 'tech_01',
    lastInspectedByName: 'Shaun H.',
    lockoutTagoutActive: false,
    isActive: true,
  },
];

const INITIAL_INSPECTIONS: HoistInspection[] = [
  {
    id: 'insp_01',
    hoistId: 'hoist_1',
    hoistNumber: 1,
    facility: 'hyundai_chery',
    siteId: 'site_melbourne_se',
    inspectorId: 'tech_01',
    inspectorName: 'Shaun H.',
    inspectorRole: 'Master Technician',
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftType: 'MORNING',
    status: 'PASS',
    checklistItems: HOIST_CHECKLIST_TEMPLATE.map((t) => ({
      itemId: t.id,
      title: t.title,
      status: 'PASS',
    })),
    faultSeverity: 'NONE',
    photos: [],
    lockoutTagoutApplied: false,
    correctiveActionRequired: false,
    signedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'insp_02',
    hoistId: 'hoist_4',
    hoistNumber: 4,
    facility: 'hyundai_chery',
    siteId: 'site_melbourne_se',
    inspectorId: 'tech_03',
    inspectorName: 'Liam K.',
    inspectorRole: 'Service Technician',
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftType: 'MORNING',
    status: 'FAULT_IDENTIFIED',
    checklistItems: HOIST_CHECKLIST_TEMPLATE.map((t, idx) => ({
      itemId: t.id,
      title: t.title,
      status: idx === 3 ? 'FAULT' : 'PASS',
      notes: idx === 3 ? 'Hydraulic oil seepage near lower fitting.' : undefined,
    })),
    faultNotes: 'Minor hydraulic weeping on secondary safety lock ram. Work order logged #WO-9021.',
    faultSeverity: 'MINOR',
    photos: [],
    lockoutTagoutApplied: false,
    correctiveActionRequired: true,
    signedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'insp_03',
    hoistId: 'hoist_7',
    hoistNumber: 7,
    facility: 'hyundai_chery',
    siteId: 'site_melbourne_se',
    inspectorId: 'tech_01',
    inspectorName: 'Shaun H.',
    inspectorRole: 'Master Technician',
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftType: 'MORNING',
    status: 'TAGGED_OUT',
    checklistItems: HOIST_CHECKLIST_TEMPLATE.map((t, idx) => ({
      itemId: t.id,
      title: t.title,
      status: idx === 5 ? 'FAULT' : 'PASS',
    })),
    faultNotes: 'LOTO Tag #LOTO-8812 applied. Upper limit safety sensor microswitch failed.',
    faultSeverity: 'CRITICAL',
    photos: [],
    lockoutTagoutApplied: true,
    correctiveActionRequired: true,
    signedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'insp_04',
    hoistId: 'hoist_12',
    hoistNumber: 12,
    facility: 'byd_kia',
    siteId: 'site_melbourne_se',
    inspectorId: 'tech_01',
    inspectorName: 'Shaun H.',
    inspectorRole: 'EV Specialist Technician',
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftType: 'DAILY',
    status: 'PASS',
    checklistItems: HOIST_CHECKLIST_TEMPLATE.map((t) => ({
      itemId: t.id,
      title: t.title,
      status: 'PASS',
    })),
    faultSeverity: 'NONE',
    photos: [],
    lockoutTagoutApplied: false,
    correctiveActionRequired: false,
    signedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'insp_05',
    hoistId: 'hoist_15',
    hoistNumber: 15,
    facility: 'byd_kia',
    siteId: 'site_melbourne_se',
    inspectorId: 'tech_01',
    inspectorName: 'Shaun H.',
    inspectorRole: 'Master Technician',
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftType: 'DAILY',
    status: 'PASS',
    checklistItems: HOIST_CHECKLIST_TEMPLATE.map((t) => ({
      itemId: t.id,
      title: t.title,
      status: 'PASS',
    })),
    faultSeverity: 'NONE',
    photos: [],
    lockoutTagoutApplied: false,
    correctiveActionRequired: false,
    signedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

// In-Memory Global Store for resilient offline / online performance
let memoryHoists = [...INITIAL_HOISTS];
let memoryInspections = [...INITIAL_INSPECTIONS];

function computeSummary(facility?: string): HoistSummary {
  const todayStr = new Date().toISOString().slice(0, 10);
  const targetHoists = memoryHoists.filter(
    (h) => !facility || facility === 'all' || h.facility === facility
  );

  const inspectedToday = targetHoists.filter((h) => {
    if (!h.lastInspectionDate) return false;
    return new Date(h.lastInspectionDate).toISOString().slice(0, 10) === todayStr;
  }).length;

  const faultIdentified = targetHoists.filter((h) => h.status === 'FAULT_IDENTIFIED').length;
  const outOfService = targetHoists.filter(
    (h) => h.status === 'OUT_OF_SERVICE' || h.lockoutTagoutActive
  ).length;
  const operational = targetHoists.filter(
    (h) => h.status === 'OPERATIONAL' && !h.lockoutTagoutActive
  ).length;

  return {
    totalHoists: targetHoists.length,
    inspectedToday,
    pendingToday: Math.max(0, targetHoists.length - inspectedToday),
    operational,
    faultIdentified,
    outOfService,
    todayDate: todayStr,
  };
}

export const hoistApi = {
  getHoists: async (facility?: string, siteId?: string): Promise<Hoist[]> => {
    try {
      const params = new URLSearchParams();
      if (facility && facility !== 'all') params.append('facility', facility);
      if (siteId) params.append('siteId', siteId);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<Hoist[]>(`/hoists${query}`);
      if (Array.isArray(data) && data.length > 0) {
        memoryHoists = data;
        return data;
      }
    } catch {
      // Fallback to local store
    }
    return memoryHoists.filter(
      (h) => !facility || facility === 'all' || h.facility === facility
    );
  },

  getSummary: async (facility?: string): Promise<HoistSummary> => {
    try {
      const query = facility && facility !== 'all' ? `?facility=${facility}` : '';
      const data = await apiClient.get<HoistSummary>(`/hoists/summary${query}`);
      if (data && typeof data.totalHoists === 'number') {
        return data;
      }
    } catch {
      // Fallback to local store calculation
    }
    return computeSummary(facility);
  },

  getHoistById: async (id: string): Promise<Hoist> => {
    try {
      const data = await apiClient.get<Hoist>(`/hoists/${id}`);
      if (data) return data;
    } catch {
      // Fallback
    }
    const found = memoryHoists.find((h) => h.id === id);
    if (found) return found;
    throw new Error('Hoist not found');
  },

  submitInspection: async (payload: SubmitInspectionPayload): Promise<HoistInspection> => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const hoistIndex = memoryHoists.findIndex((h) => h.id === payload.hoistId);

    const newInspection: HoistInspection = {
      id: `insp_${Date.now()}`,
      hoistId: payload.hoistId,
      hoistNumber: hoistIndex >= 0 ? memoryHoists[hoistIndex].hoistNumber : 1,
      facility: hoistIndex >= 0 ? memoryHoists[hoistIndex].facility : 'hyundai_chery',
      siteId: hoistIndex >= 0 ? memoryHoists[hoistIndex].siteId : 'site_melbourne_se',
      inspectorId: payload.inspectorId,
      inspectorName: payload.inspectorName,
      inspectorRole: payload.inspectorRole || 'Technician',
      shiftDate: payload.shiftDate || todayStr,
      shiftType: payload.shiftType || 'DAILY',
      status: payload.status,
      checklistItems: payload.checklistItems,
      faultNotes: payload.faultNotes,
      faultSeverity: payload.faultSeverity || 'NONE',
      photos: payload.photos || [],
      lockoutTagoutApplied: !!payload.lockoutTagoutApplied,
      correctiveActionRequired: !!payload.correctiveActionRequired,
      managerNotes: payload.managerNotes,
      signedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Update in-memory state
    if (hoistIndex >= 0) {
      memoryHoists[hoistIndex] = {
        ...memoryHoists[hoistIndex],
        lastInspectionDate: newInspection.signedAt,
        lastInspectionStatus: newInspection.status,
        lastInspectedBy: newInspection.inspectorId,
        lastInspectedByName: newInspection.inspectorName,
        status:
          payload.status === 'TAGGED_OUT'
            ? 'OUT_OF_SERVICE'
            : payload.status === 'FAULT_IDENTIFIED'
              ? 'FAULT_IDENTIFIED'
              : 'OPERATIONAL',
        lockoutTagoutActive: !!payload.lockoutTagoutApplied,
        activeFaultNotes: payload.faultNotes,
      };
    }
    memoryInspections.unshift(newInspection);

    try {
      const serverRes = await apiClient.post<HoistInspection>('/hoists/inspect', payload);
      if (serverRes) return serverRes;
    } catch {
      // Offline fallback succeeded
    }

    return newInspection;
  },

  getInspections: async (params?: {
    hoistId?: string;
    facility?: string;
    shiftDate?: string;
    limit?: number;
  }): Promise<HoistInspection[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.hoistId) searchParams.append('hoistId', params.hoistId);
      if (params?.facility && params.facility !== 'all')
        searchParams.append('facility', params.facility);
      if (params?.shiftDate) searchParams.append('shiftDate', params.shiftDate);
      if (params?.limit) searchParams.append('limit', String(params.limit));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const data = await apiClient.get<HoistInspection[]>(`/hoists/inspections${query}`);
      if (Array.isArray(data)) {
        return data;
      }
    } catch {
      // Fallback
    }

    let list = [...memoryInspections];
    if (params?.hoistId) {
      list = list.filter((i) => i.hoistId === params.hoistId);
    }
    if (params?.facility && params.facility !== 'all') {
      list = list.filter((i) => i.facility === params.facility);
    }
    if (params?.shiftDate) {
      list = list.filter((i) => i.shiftDate === params.shiftDate);
    }
    if (params?.limit) {
      list = list.slice(0, params.limit);
    }
    return list;
  },

  updateHoist: async (id: string, data: Partial<Hoist>): Promise<Hoist> => {
    const idx = memoryHoists.findIndex((h) => h.id === id);
    if (idx >= 0) {
      memoryHoists[idx] = { ...memoryHoists[idx], ...data, updatedAt: new Date().toISOString() };
    }
    try {
      const res = await apiClient.patch<Hoist>(`/hoists/${id}`, data);
      if (res) return res;
    } catch {
      // Fallback
    }
    return memoryHoists[idx];
  },
};

