import { apiClient } from './client';
import {
  BrandPack,
  EvaluateRulesDto,
  EvaluatedRulesResponse,
} from '../types';
import { brandPacksService } from '../services/brandPacks.service';

export const brandPacksApi = {
  getActiveByBrandId: async (brandId: string): Promise<BrandPack> => {
    try {
      const pack = await apiClient.get<BrandPack>(`/brand-packs/brand/${brandId}/active`);
      if (pack && pack.rules && pack.rules.length > 0) {
        return pack;
      }
    } catch (e) {
      // Fallback to local Brand Pack engine
    }
    return brandPacksService.getBrandPackForBrand(brandId);
  },

  evaluateRules: async (dto: EvaluateRulesDto): Promise<EvaluatedRulesResponse> => {
    try {
      const res = await apiClient.post<EvaluatedRulesResponse>('/brand-packs/evaluate-rules', dto);
      if (res && res.resolvedRules && res.resolvedRules.length > 0) {
        return res;
      }
    } catch (e) {
      // Fallback to local rule evaluator
    }
    return brandPacksService.evaluateRules(dto);
  },

  getBrandPackById: async (id: string): Promise<BrandPack> => {
    try {
      return await apiClient.get<BrandPack>(`/brand-packs/${id}`);
    } catch {
      return brandPacksService.getBrandPackForBrand(id);
    }
  },
};

