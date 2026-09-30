import { WarrantyCase, CreateWarrantyCaseDto, EvidenceItem } from '../types';

interface LocalDraft extends Partial<CreateWarrantyCaseDto> {
  localId: string;
  savedAt: string;
  step: number;
}

export interface VehicleZoneInspection {
  vin: string;
  roNumber?: string;
  capturedZoneKeys: string[];
  evidenceItems: EvidenceItem[];
  defects: { zoneKey: string; description: string; flaggedAt: string }[];
  status?: 'IN_PROGRESS' | 'COMPLETE';
  updatedAt: string;
}

// Persistent global storage in memory that survives re-logins and re-renders
const GLOBAL_ZONE_INSPECTIONS: Map<string, VehicleZoneInspection> = new Map();
const GLOBAL_DRAFTS: Map<string, LocalDraft> = new Map();
const GLOBAL_UPLOADS: Map<string, WarrantyCase> = new Map();

const INITIAL_ZONE_INSPECTIONS: VehicleZoneInspection[] = [
  // 1. ATTO 3 Extended (LGXCE4C86P0019283) - In progress inspection
  {
    vin: 'LGXCE4C86P0019283',
    roNumber: '180001',
    capturedZoneKeys: [
      'front_vehicle_photo',
      'rear_vehicle_photo',
      'driver_side_photo',
      'passenger_side_photo',
      'roof_photo',
      'bonnet_photo',
      'boot_photo',
    ],
    evidenceItems: [],
    defects: [],
    status: 'IN_PROGRESS',
    updatedAt: new Date().toISOString(),
  },
  // 2. SEAL Performance AWD (LGXCE4C88R0048192) - 10 of 10 zones captured, 1 defect
  {
    vin: 'LGXCE4C88R0048192',
    roNumber: '180002',
    capturedZoneKeys: [
      'front_vehicle_photo',
      'rear_vehicle_photo',
      'driver_side_photo',
      'passenger_side_photo',
      'roof_photo',
      'bonnet_photo',
      'boot_photo',
      'interior_photo',
      'engine_bay_photo',
      'cargo_tray_photo',
    ],
    evidenceItems: [],
    defects: [
      {
        zoneKey: 'front_vehicle_photo',
        description: 'Front bumper scratch (Depth: 1.2mm, Length: 8cm)',
        flaggedAt: new Date(Date.now() - 7100 * 1000).toISOString(),
      },
    ],
    status: 'COMPLETE',
    updatedAt: new Date(Date.now() - 7100 * 1000).toISOString(),
  },
  // 3. Dolphin Premium (LGXCE4C82R0031829) - 4 zones captured
  {
    vin: 'LGXCE4C82R0031829',
    roNumber: '180003',
    capturedZoneKeys: [
      'front_vehicle_photo',
      'rear_vehicle_photo',
      'driver_side_photo',
      'passenger_side_photo',
    ],
    evidenceItems: [],
    defects: [],
    status: 'IN_PROGRESS',
    updatedAt: new Date(Date.now() - 14400 * 1000).toISOString(),
  },
  // 4. Sealion 6 Super Hybrid (LGXCE4C89S0071204) - 1 zone captured
  {
    vin: 'LGXCE4C89S0071204',
    roNumber: '180004',
    capturedZoneKeys: ['front_vehicle_photo'],
    evidenceItems: [],
    defects: [],
    status: 'IN_PROGRESS',
    updatedAt: new Date(Date.now() - 28800 * 1000).toISOString(),
  },
];

class OfflineStorageService {
  private drafts: Map<string, LocalDraft> = GLOBAL_DRAFTS;
  private pendingUploads: Map<string, WarrantyCase> = GLOBAL_UPLOADS;
  private vehicleInspections: Map<string, VehicleZoneInspection> = GLOBAL_ZONE_INSPECTIONS;
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn('offlineStorage listener error:', e);
      }
    });
  }

  constructor() {
    // Only seed initial zones if NOT already present in persistent store
    for (const insp of INITIAL_ZONE_INSPECTIONS) {
      const key = insp.vin.toUpperCase();
      if (!this.vehicleInspections.has(key)) {
        this.vehicleInspections.set(key, insp);
      }
    }
  }

  public saveDraft(draft: LocalDraft): void {
    this.drafts.set(draft.localId, {
      ...draft,
      savedAt: new Date().toISOString(),
    });
  }

  public getDraft(localId: string): LocalDraft | undefined {
    return this.drafts.get(localId);
  }

  public getAllDrafts(): LocalDraft[] {
    return Array.from(this.drafts.values()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }

  public removeDraft(localId: string): void {
    this.drafts.delete(localId);
  }

  public queuePendingUpload(caseItem: WarrantyCase): void {
    this.pendingUploads.set(caseItem.id, caseItem);
  }

  public getPendingUploads(): WarrantyCase[] {
    return Array.from(this.pendingUploads.values());
  }

  public removePendingUpload(caseId: string): void {
    this.pendingUploads.delete(caseId);
  }

  // ── Real Vehicle Zone Inspection API ──────────────────────────────────
  public saveVehicleInspection(inspection: VehicleZoneInspection): void {
    this.vehicleInspections.set(inspection.vin.toUpperCase(), {
      ...inspection,
      updatedAt: new Date().toISOString(),
    });
    this.notify();
  }

  public getVehicleInspection(vin: string): VehicleZoneInspection | undefined {
    return this.vehicleInspections.get(vin.toUpperCase());
  }

  public getAllVehicleInspections(): VehicleZoneInspection[] {
    return Array.from(this.vehicleInspections.values());
  }

  public recordZoneCapture(
    vin: string,
    zoneKey: string,
    evidenceItem: EvidenceItem,
    defectDescription?: string
  ): VehicleZoneInspection {
    const cleanVin = vin.toUpperCase();
    const existing = this.vehicleInspections.get(cleanVin) || {
      vin: cleanVin,
      capturedZoneKeys: [],
      evidenceItems: [],
      defects: [],
      status: 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
    };

    if (!existing.capturedZoneKeys.includes(zoneKey)) {
      existing.capturedZoneKeys.push(zoneKey);
    }

    const idx = existing.evidenceItems.findIndex((e) => e.ruleKey === zoneKey);
    if (idx >= 0) {
      existing.evidenceItems[idx] = evidenceItem;
    } else {
      existing.evidenceItems.push(evidenceItem);
    }

    if (defectDescription) {
      existing.defects.push({
        zoneKey,
        description: defectDescription,
        flaggedAt: new Date().toISOString(),
      });
    }

    if (existing.capturedZoneKeys.length >= 10) {
      existing.status = 'COMPLETE';
    }

    this.saveVehicleInspection(existing);
    return existing;
  }
}

export const offlineStorage = new OfflineStorageService();
