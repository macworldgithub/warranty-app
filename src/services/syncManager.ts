import { casesApi } from '../api';
import { offlineStorage } from './offlineStorage';
import { WarrantyCase } from '../types';

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
        await casesApi.submitFromWorkshop(item.id);
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
