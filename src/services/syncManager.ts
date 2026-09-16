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

          if (item.evidenceItems && item.evidenceItems.length > 0) {
            for (const ev of item.evidenceItems) {
              try {
                if (ev.fileUri && (ev.fileUri.startsWith('file://') || ev.fileUri.startsWith('content://') || ev.fileUri.startsWith('/'))) {
                  const formData = new FormData();
                  const ext = ev.mediaType === 'video' ? 'mp4' : 'jpg';
                  const mime = ev.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
                  const cleanRo = (item.roNumber || 'RO').replace(/[^a-zA-Z0-9]/g, '');
                  const descriptor = ev.ruleKey
                    .split('_')
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join('');
                  const oemFileName = `${cleanRo}${descriptor}.${ext}`;

                  formData.append('file', {
                    uri: ev.fileUri,
                    type: mime,
                    name: oemFileName,
                  } as any);
                  formData.append('ruleKey', ev.ruleKey);
                  formData.append('evidenceName', ev.ruleName || ev.ruleKey);
                  if (ev.ocrExtractedText) formData.append('ocrExtractedText', ev.ocrExtractedText);

                  await casesApi.uploadEvidenceFile(serverCaseId, formData);
                } else if (ev.storageUrl || ev.fileUri) {
                  await casesApi.addEvidence(serverCaseId, {
                    ruleKey: ev.ruleKey,
                    name: ev.ruleName || ev.ruleKey,
                    mediaType: (ev.mediaType as any) || 'image',
                    storageUrl: ev.storageUrl || ev.fileUri || '',
                    ocrExtractedText: ev.ocrExtractedText,
                    ocrConfidence: ev.ocrConfidence,
                    durationSeconds: ev.durationSeconds,
                  });
                }
              } catch (e) {
                console.warn('[SyncManager] Failed to upload evidence item for case:', e);
              }
            }
          }
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

