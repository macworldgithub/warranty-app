export type MediaType = 'image' | 'video' | 'document' | 'audio';

export interface BrandPackRule {
  id: string;
  ruleKey: string;
  name: string;
  description: string;
  mediaType: MediaType;
  tier: 1 | 2;
  isMandatory: boolean;
  namingConvention: string;
  guidanceText?: string;
  exampleImageUrl?: string;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  faultCategorySpecific?: string[];
}

export interface BrandPack {
  _id?: string;
  id: string;
  brandId: string;
  brandName: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  name: string;
  description?: string;
  publishedAt?: string;
  publishedBy?: string;
  rules: BrandPackRule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluateRulesDto {
  brandId: string;
  faultCategory: string;
  partReplaced: boolean;
  noiseFault: boolean;
  diagnosticsAvailable: boolean;
  repairStage: 'Pre-repair only' | 'During repair' | 'Repair complete';
}

export interface EvaluatedRulesResponse {
  brandPackId: string;
  brandPackVersion: number;
  packName: string;
  resolvedRules: BrandPackRule[];
  mandatoryCount: number;
  optionalCount: number;
}
