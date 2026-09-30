import { casesApi } from '../api/cases.api';
import { EvidenceItem, WarrantyCase } from '../types';
import { offlineStorage } from './offlineStorage';

export const evidenceUploadService = {
  /**
   * Uploads an evidence photo/video to the backend server (/uploads folder)
   * and saves the evidence item in MongoDB on the warranty case document.
   */
  uploadEvidenceToServer: async (params: {
    vin: string;
    roNumber?: string;
    evidenceItem: EvidenceItem;
    caseId?: string;
    vehicleDetails?: {
      make?: string;
      model?: string;
      year?: number;
      powertrain?: string;
    };
  }): Promise<{ success: boolean; storageUrl?: string; caseItem?: WarrantyCase }> => {
    const { vin, roNumber, evidenceItem, vehicleDetails } = params;
    const cleanVin = (vin || '').toUpperCase();

    try {
      // 1. Resolve target case in MongoDB
      let targetCaseId = params.caseId;
      if (!targetCaseId && cleanVin) {
        try {
          const cases = await casesApi.getCases({ vin: cleanVin, limit: 1 });
          if (cases && cases.length > 0 && cases[0].id) {
            targetCaseId = cases[0].id;
          }
        } catch (e) {
          console.warn('[EvidenceUpload] Failed finding existing case by VIN:', e);
        }
      }

      // If no case exists yet for this vehicle in MongoDB, create one:
      if (!targetCaseId && cleanVin) {
        try {
          const created = await casesApi.createCase({
            vin: cleanVin,
            roNumber: roNumber || '180001',
            make: vehicleDetails?.make || 'BYD',
            model: vehicleDetails?.model || 'Vehicle',
            year: vehicleDetails?.year || 2024,
            powertrain: (vehicleDetails?.powertrain as any) || 'EV',
            concernTitle: `${vehicleDetails?.make || 'BYD'} ${vehicleDetails?.model || ''} Condition Inspection`,
            faultCategory: 'Condition Inspection',
            status: 'IN_PROGRESS',
          } as any);
          targetCaseId = created.id;
        } catch (createErr) {
          console.warn('[EvidenceUpload] Failed auto-creating case in MongoDB:', createErr);
        }
      }

      if (!targetCaseId) {
        return { success: false };
      }

      // 2. Prepare FormData for file upload to /uploads folder
      let uploadedCase: WarrantyCase | null = null;
      let serverStorageUrl: string | undefined;

      if (evidenceItem.fileUri) {
        try {
          const formData = new FormData();
          const ext = evidenceItem.mediaType === 'video' ? 'mp4' : 'jpg';
          const mime = evidenceItem.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
          const cleanRo = (roNumber || 'RO').replace(/[^a-zA-Z0-9]/g, '');
          const descriptor = evidenceItem.ruleKey
            .split('_')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join('');
          const oemFileName = `${cleanRo}${descriptor}.${ext}`;

          formData.append('file', {
            uri: evidenceItem.fileUri,
            type: mime,
            name: oemFileName,
          } as any);
          formData.append('ruleKey', evidenceItem.ruleKey);
          formData.append('evidenceName', evidenceItem.ruleName || evidenceItem.ruleKey);
          if (evidenceItem.ocrExtractedText) {
            formData.append('ocrExtractedText', evidenceItem.ocrExtractedText);
          }

          uploadedCase = (await casesApi.uploadEvidenceFile(targetCaseId, formData)) as any;
          const found = uploadedCase?.evidenceItems?.find((e) => e.ruleKey === evidenceItem.ruleKey);
          serverStorageUrl = found?.storageUrl;
        } catch (uploadErr) {
          console.warn('[EvidenceUpload] uploadEvidenceFile failed, falling back to addEvidence:', uploadErr);
        }
      }

      // 3. Fallback: If binary upload failed or fileUri not accessible, save evidence record directly in MongoDB
      if (!serverStorageUrl) {
        try {
          const fallbackRes = await casesApi.addEvidence(targetCaseId, {
            ruleKey: evidenceItem.ruleKey,
            name: evidenceItem.ruleName || evidenceItem.ruleKey,
            mediaType: evidenceItem.mediaType || 'image',
            storageUrl: evidenceItem.storageUrl || evidenceItem.fileUri || '',
            ocrExtractedText: evidenceItem.ocrExtractedText,
            ocrConfidence: evidenceItem.ocrConfidence,
            durationSeconds: evidenceItem.durationSeconds,
          });
          uploadedCase = fallbackRes;
          const found = fallbackRes?.evidenceItems?.find((e) => e.ruleKey === evidenceItem.ruleKey);
          serverStorageUrl = found?.storageUrl || evidenceItem.storageUrl || evidenceItem.fileUri;
        } catch (addErr) {
          console.warn('[EvidenceUpload] addEvidence fallback failed:', addErr);
        }
      }

      // 4. Update local offlineStorage with server URL if available
      if (serverStorageUrl && cleanVin) {
        const updatedItem = {
          ...evidenceItem,
          storageUrl: serverStorageUrl,
        };
        offlineStorage.recordZoneCapture(cleanVin, evidenceItem.ruleKey, updatedItem);
      }

      return {
        success: true,
        storageUrl: serverStorageUrl,
        caseItem: uploadedCase || undefined,
      };
    } catch (err) {
      console.warn('[EvidenceUpload] Unexpected upload error:', err);
      return { success: false };
    }
  },
};
