import { apiClient } from './client';
import {
  LoanAgreement,
  LoanAgreementKpis,
} from '../types/loanAgreement.types';

export const loanAgreementsApi = {
  getKpis: async (siteId?: string): Promise<LoanAgreementKpis> => {
    const query = siteId && siteId !== 'all' ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return apiClient.get<LoanAgreementKpis>(`/loan-agreements/kpis${query}`);
  },

  findAll: async (siteId?: string, status?: string): Promise<LoanAgreement[]> => {
    const params: string[] = [];
    if (siteId && siteId !== 'all') params.push(`siteId=${encodeURIComponent(siteId)}`);
    if (status && status !== 'all') params.push(`status=${encodeURIComponent(status)}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return apiClient.get<LoanAgreement[]>(`/loan-agreements${query}`);
  },

  findById: async (id: string): Promise<LoanAgreement> => {
    return apiClient.get<LoanAgreement>(`/loan-agreements/${id}`);
  },

  issueAgreement: async (dto: any): Promise<LoanAgreement> => {
    return apiClient.post<LoanAgreement>('/loan-agreements/issue', dto);
  },

  signAgreement: async (id: string, dto: any): Promise<LoanAgreement> => {
    return apiClient.post<LoanAgreement>(`/loan-agreements/${id}/sign`, dto);
  },

  returnAgreement: async (id: string, dto: any): Promise<LoanAgreement> => {
    return apiClient.post<LoanAgreement>(`/loan-agreements/${id}/return`, dto);
  },
};
