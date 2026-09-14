import { apiClient } from './client';
import {
  WarrantyCase,
  CreateWarrantyCaseDto,
  EvidenceItem,
  VoiceNote,
} from '../types';

export interface CaseFilters {
  siteId?: string;
  brandId?: string;
  status?: string;
  technicianId?: string;
  roNumber?: string;
  vin?: string;
}

export const casesApi = {
  getCases: async (filters?: CaseFilters): Promise<WarrantyCase[]> => {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });
      const str = params.toString();
      if (str) query = `?${str}`;
    }
    return apiClient.get<WarrantyCase[]>(`/warranty-cases${query}`);
  },

  getCaseById: async (id: string): Promise<WarrantyCase> => {
    return apiClient.get<WarrantyCase>(`/warranty-cases/${id}`);
  },

  createCase: async (dto: CreateWarrantyCaseDto): Promise<WarrantyCase> => {
    return apiClient.post<WarrantyCase>('/warranty-cases', dto);
  },

  updateCase: async (
    id: string,
    dto: Partial<CreateWarrantyCaseDto>
  ): Promise<WarrantyCase> => {
    return apiClient.patch<WarrantyCase>(`/warranty-cases/${id}`, dto);
  },

  addEvidence: async (
    caseId: string,
    evidenceItem: EvidenceItem
  ): Promise<WarrantyCase> => {
    return apiClient.post<WarrantyCase>(
      `/warranty-cases/${caseId}/evidence`,
      evidenceItem
    );
  },

  uploadEvidenceFile: async (
    caseId: string,
    formData: FormData
  ): Promise<{ url: string; oemFileName: string; fileSize: number }> => {
    return apiClient.uploadFormData(
      `/warranty-cases/${caseId}/evidence/upload`,
      formData
    );
  },

  addVoiceNotes: async (
    caseId: string,
    voiceNotes: VoiceNote[]
  ): Promise<WarrantyCase> => {
    return apiClient.post<WarrantyCase>(
      `/warranty-cases/${caseId}/voice-notes`,
      { voiceNotes }
    );
  },

  submitFromWorkshop: async (
    caseId: string,
    payload?: { checklistSummary?: any }
  ): Promise<WarrantyCase> => {
    return apiClient.post<WarrantyCase>(
      `/warranty-cases/${caseId}/submit-from-workshop`,
      payload || {}
    );
  },
};
