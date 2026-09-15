import { apiClient } from './client';
import { Site } from '../types';

export const sitesApi = {
  getSites: async (): Promise<Site[]> => {
    return apiClient.get<Site[]>('/sites');
  },

  getSiteById: async (id: string): Promise<Site> => {
    return apiClient.get<Site>(`/sites/${id}`);
  },

  getSiteAuthorizedBrands: async (id: string): Promise<{ authorizedBrandIds: string[] }> => {
    return apiClient.get<{ authorizedBrandIds: string[] }>(`/sites/${id}/brands`);
  },
};
