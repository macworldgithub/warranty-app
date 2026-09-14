import { WarrantyCase, CreateWarrantyCaseDto } from '../types';

interface LocalDraft extends Partial<CreateWarrantyCaseDto> {
  localId: string;
  savedAt: string;
  step: number;
}

class OfflineStorageService {
  private drafts: Map<string, LocalDraft> = new Map();
  private pendingUploads: Map<string, WarrantyCase> = new Map();

  constructor() {
    // Initial in-memory store; can persist to MMKV or AsyncStorage
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
}

export const offlineStorage = new OfflineStorageService();
