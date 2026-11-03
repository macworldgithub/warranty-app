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
  technicianName?: string;
  roNumber?: string;
  vin?: string;
  search?: string;
  limit?: number;
  page?: number;
}

export const casesApi = {
  getCases: async (filters?: CaseFilters): Promise<WarrantyCase[]> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    const fetchPage = () => apiClient.get<WarrantyCase[] | {
      data: WarrantyCase[];
      meta?: { hasNextPage: boolean };
    }>(`/warranty-cases?${params.toString()}`);

    const fetchAll = filters?.page === undefined && filters?.limit === undefined;
    if (fetchAll) params.set('limit', '100');
    const cases: WarrantyCase[] = [];
    let page = 1;
    while (true) {
      if (fetchAll) params.set('page', String(page));
      const result = await fetchPage();
      if (Array.isArray(result)) return [...cases, ...result];
      cases.push(...(result?.data ?? []));
      if (!fetchAll || !result?.meta?.hasNextPage || !result.data.length) return cases;
      page += 1;
    }
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

  flagCase: async (
    caseId: string,
    dto: {
      evidenceRuleKey?: string;
      reasonCode: string;
      instruction: string;
      flaggedBy?: string;
    }
  ): Promise<WarrantyCase> => {
    return apiClient.post<WarrantyCase>(`/warranty-cases/${caseId}/flag`, {
      evidenceRuleKey: dto.evidenceRuleKey || 'general',
      reasonCode: dto.reasonCode || 'OTHER',
      instruction: dto.instruction,
      flaggedBy: dto.flaggedBy || 'Warranty Admin',
    });
  },

  markSubmitted: async (
    caseId: string,
    dto: {
      claimNumber?: string;
      internalClerkNotes?: string;
    }
  ): Promise<WarrantyCase> => {
    return apiClient.post<WarrantyCase>(
      `/warranty-cases/${caseId}/mark-submitted`,
      {
        claimNumber: dto.claimNumber || `CLM-${Date.now().toString().slice(-6)}`,
        internalClerkNotes: dto.internalClerkNotes || 'Approved by Admin',
      }
    );
  },
};
