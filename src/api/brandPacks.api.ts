import { apiClient } from './client';
import {
  BrandPack,
  EvaluateRulesDto,
  EvaluatedRulesResponse,
} from '../types';

export const brandPacksApi = {
  getActiveByBrandId: async (brandId: string): Promise<BrandPack> => {
    return apiClient.get<BrandPack>(`/brand-packs/brand/${brandId}/active`);
  },

  evaluateRules: async (dto: EvaluateRulesDto): Promise<EvaluatedRulesResponse> => {
    return apiClient.post<EvaluatedRulesResponse>('/brand-packs/evaluate-rules', dto);
  },

  getBrandPackById: async (id: string): Promise<BrandPack> => {
    return apiClient.get<BrandPack>(`/brand-packs/${id}`);
  },
};
