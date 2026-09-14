import { apiClient } from './client';
import { Brand } from '../types';

export const brandsApi = {
  getBrands: async (): Promise<Brand[]> => {
    return apiClient.get<Brand[]>('/brands');
  },

  getBrandById: async (id: string): Promise<Brand> => {
    return apiClient.get<Brand>(`/brands/${id}`);
  },
};
