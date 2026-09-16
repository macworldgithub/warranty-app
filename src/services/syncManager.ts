import { casesApi } from '../api';
import { offlineStorage } from './offlineStorage';
import {
  WarrantyCase,
  CreateWarrantyCaseDto,
  PowertrainType,
  RepairStage,
} from '../types';

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: string;
  error?: string;
}

class SyncManager {
  private isSyncing: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify(error?: string) {
    const status: SyncStatus = {
      isSyncing: this.isSyncing,
      pendingCount: offlineStorage.getPendingUploads().length,
      lastSyncTime: new Date().toISOString(),
      error,
    };
    this.listeners.forEach(cb => cb(status));
  }

  public async syncPendingCases(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };

    const pending = offlineStorage.getPendingUploads();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    this.notify();

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        let serverCaseId = item.id;
        if (
          item.id.startsWith('CASE-') ||
          item.id.startsWith('local_') ||
          item.id.startsWith('draft_')
        ) {
          const createDto: CreateWarrantyCaseDto = {
            siteId: item.siteId || 'site_cranbourne_byd',
            siteName: item.siteName || 'Cranbourne BYD',
            brandId: item.brandId || 'brand_byd',
            brandName: item.brandName || 'BYD',
            brandPackId: item.brandPackId,
            brandPackVersion: item.brandPackVersion,
            roNumber: item.roNumber || 'RO-DRAFT',
            claimNumber: item.claimNumber,
            vin: item.vin || '',
            odometer: Number(item.odometer) || 0,
            make: item.make || item.brandName || 'BYD',
            model: item.model || 'ATTO 3',
            year: Number(item.year) || 2024,
            powertrain: (item.powertrain as PowertrainType) || 'EV',
            concernTitle:
              item.concernTitle || 'Warranty inspection and fault diagnosis',
            faultCategory: item.faultCategory || 'Oil leaks or seepage',
            partReplaced: Boolean(item.partReplaced),
            oldPartSerial: item.oldPartSerial,
            newPartSerial: item.newPartSerial,
            noiseFault: Boolean(item.noiseFault),
            diagnosticsAvailable: Boolean(item.diagnosticsAvailable),
            repairStage: (item.repairStage as RepairStage) || 'Repair complete',
            technicianId: item.technicianId,
            technicianName: item.technicianName,
            evidenceItems: item.evidenceItems || [],
            voiceNotes: item.voiceNotes || [],
          };
          const created = await casesApi.createCase(createDto);
          serverCaseId = created.id;
        }

        await casesApi.submitFromWorkshop(serverCaseId, {
          checklistSummary: {
            isReadyForSubmission: true,
          },
        });
        offlineStorage.removePendingUpload(item.id);
        synced++;
      } catch (err: any) {
        failed++;
      }
    }

    this.isSyncing = false;
    this.notify();
    return { synced, failed };
  }
}

export const syncManager = new SyncManager();

