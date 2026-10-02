import { apiClient } from './client';
import { Hoist, HoistInspection, HoistSummary, SubmitInspectionPayload } from '../types/hoist.types';

export const hoistApi = {
  getHoists: async (facility?: string, siteId?: string): Promise<Hoist[]> => {
    const params = new URLSearchParams();
    if (facility && facility !== 'all') params.append('facility', facility);
    if (siteId) params.append('siteId', siteId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Hoist[]>(`/hoists${query}`);
  },

  getSummary: async (facility?: string): Promise<HoistSummary> => {
    const query = facility && facility !== 'all' ? `?facility=${facility}` : '';
    return apiClient.get<HoistSummary>(`/hoists/summary${query}`);
  },

  getHoistById: async (id: string): Promise<Hoist> => {
    return apiClient.get<Hoist>(`/hoists/${id}`);
  },

  submitInspection: async (payload: SubmitInspectionPayload): Promise<HoistInspection> => {
    return apiClient.post<HoistInspection>('/hoists/inspect', payload);
  },

  getInspections: async (params?: {
    hoistId?: string;
    facility?: string;
    shiftDate?: string;
    limit?: number;
  }): Promise<HoistInspection[]> => {
    const searchParams = new URLSearchParams();
    if (params?.hoistId) searchParams.append('hoistId', params.hoistId);
    if (params?.facility && params.facility !== 'all') searchParams.append('facility', params.facility);
    if (params?.shiftDate) searchParams.append('shiftDate', params.shiftDate);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient.get<HoistInspection[]>(`/hoists/inspections${query}`);
  },

  updateHoist: async (id: string, data: Partial<Hoist>): Promise<Hoist> => {
    return apiClient.patch<Hoist>(`/hoists/${id}`, data);
  },
};
