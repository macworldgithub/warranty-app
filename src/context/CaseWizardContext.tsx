import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  WarrantyCase,
  BrandPack,
  BrandPackRule,
  EvidenceItem,
  VoiceNote,
  PowertrainType,
  RepairStage,
  Site,
  Brand,
} from '../types';
import { brandPacksApi } from '../api/brandPacks.api';
import { vehicleApi } from '../api/vehicle.api';
import { casesApi } from '../api/cases.api';
import { qualityGates } from '../services/qualityGates';
import { namingEngine } from '../services/namingEngine';
import { offlineStorage } from '../services/offlineStorage';
import { useAuth } from './AuthContext';

interface CaseWizardState {
  currentStep: number; // 0 to 6
  caseId: string | null;
  
  // Step 0 - Start Ticket
  siteId: string;
  siteName: string;
  brandId: string;
  brandName: string;
  roNumber: string;
  claimNumber: string;

  // Step 1 - Vehicle ID
  vin: string;
  odometer: number | null;
  make: string;
  model: string;
  year: number | null;
  powertrain: PowertrainType;
  isVinDecoded: boolean;
  isVinDecoding: boolean;

  // Step 2 - Fault & Concern
  concernTitle: string;
  faultCategory: string;
  partReplaced: boolean;
  oldPartSerial: string;
  newPartSerial: string;
  noiseFault: boolean;
  diagnosticsAvailable: boolean;
  repairStage: RepairStage;

  // Dynamic Brand Pack & Rules
  activeBrandPack: BrandPack | null;
  resolvedRules: BrandPackRule[];
  isLoadingRules: boolean;

  // Evidence & Notes
  evidenceItems: EvidenceItem[];
  voiceNotes: VoiceNote[];

  // Quality Gates / Readiness
  isReadyForSubmission: boolean;
  mandatoryCount: number;
  completedMandatoryCount: number;
  missingRules: BrandPackRule[];

  // Flag Resolution mode
  isFlaggedMode: boolean;
  flaggedRuleKeys: string[];
}

interface CaseWizardContextType extends CaseWizardState {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Step 0 Setters
  setSite: (site: Site) => void;
  setBrand: (brand: Brand) => void;
  setRoNumber: (ro: string) => void;
  setClaimNumber: (claim: string) => void;

  // Step 1 Vehicle Setters & Actions
  setVin: (vin: string) => void;
  setOdometer: (odo: number | null) => void;
  setVehicleInfo: (info: { make?: string; model?: string; year?: number | null; powertrain?: PowertrainType }) => void;
  decodeVinNow: (vinToDecode?: string) => Promise<void>;

  // Step 2 Fault Setters
  setConcernTitle: (title: string) => void;
  setFaultCategory: (category: string) => void;
  setPartReplaced: (replaced: boolean) => void;
  setOldPartSerial: (serial: string) => void;
  setNewPartSerial: (serial: string) => void;
  setNoiseFault: (noise: boolean) => void;
  setDiagnosticsAvailable: (diag: boolean) => void;
  setRepairStage: (stage: RepairStage) => void;

  // Evidence & Notes Actions
  saveEvidenceItem: (item: Partial<EvidenceItem> & { ruleKey: string }) => void;
  removeEvidenceItem: (ruleKey: string) => void;
  getEvidenceForRule: (ruleKey: string) => EvidenceItem | undefined;
  addVoiceNote: (note: VoiceNote) => void;
  removeVoiceNote: (noteId: string) => void;

  // Dynamic Rule Evaluation
  evaluateRules: () => Promise<void>;

  // Case Lifecycle
  startNewCase: (initialData?: Partial<CaseWizardState>) => void;
  loadExistingCase: (caseItem: WarrantyCase, flaggedOnly?: boolean) => void;
  saveDraft: () => Promise<void>;
  submitCase: () => Promise<WarrantyCase>;
  resetWizard: () => void;
}

const defaultState: CaseWizardState = {
  currentStep: 0,
  caseId: null,
  siteId: 'site_cranbourne_byd',
  siteName: 'Booran BYD Cranbourne',
  brandId: 'brand_byd',
  brandName: 'BYD',
  roNumber: '',
  claimNumber: '',
  vin: '',
  odometer: null,
  make: 'BYD',
  model: '',
  year: null,
  powertrain: 'EV',
  isVinDecoded: false,
  isVinDecoding: false,
  concernTitle: '',
  faultCategory: 'Battery and high-voltage (HV) components',
  partReplaced: false,
  oldPartSerial: '',
  newPartSerial: '',
  noiseFault: false,
  diagnosticsAvailable: true,
  repairStage: 'During repair',
  activeBrandPack: null,
  resolvedRules: [],
  isLoadingRules: false,
  evidenceItems: [],
  voiceNotes: [],
  isReadyForSubmission: false,
  mandatoryCount: 0,
  completedMandatoryCount: 0,
  missingRules: [],
  isFlaggedMode: false,
  flaggedRuleKeys: [],
};

const CaseWizardContext = createContext<CaseWizardContextType | undefined>(undefined);

export const CaseWizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<CaseWizardState>(defaultState);

  // Dynamic rules evaluation
  const evaluateRules = useCallback(async () => {
    if (!state.brandId) return;

    setState(prev => ({ ...prev, isLoadingRules: true }));
    try {
      const res = await brandPacksApi.evaluateRules({
        brandId: state.brandId,
        faultCategory: state.faultCategory || 'General / other',
        partReplaced: state.partReplaced,
        noiseFault: state.noiseFault,
        diagnosticsAvailable: state.diagnosticsAvailable,
        repairStage: state.repairStage,
      });

      if (res && res.resolvedRules) {
        setState(prev => ({
          ...prev,
          resolvedRules: res.resolvedRules,
          isLoadingRules: false,
        }));
      }
    } catch (err) {
      // Fallback: fetch active brand pack directly
      try {
        const bp = await brandPacksApi.getActiveByBrandId(state.brandId);
        setState(prev => ({
          ...prev,
          activeBrandPack: bp,
          resolvedRules: bp.rules || [],
          isLoadingRules: false,
        }));
      } catch (e) {
        setState(prev => ({ ...prev, isLoadingRules: false }));
      }
    }
  }, [
    state.brandId,
    state.faultCategory,
    state.partReplaced,
    state.noiseFault,
    state.diagnosticsAvailable,
    state.repairStage,
  ]);

  // Recalculate submission readiness whenever evidence or resolved rules change
  useEffect(() => {
    const readiness = qualityGates.evaluateSubmissionReadiness(
      state.resolvedRules,
      state.evidenceItems
    );

    setState(prev => ({
      ...prev,
      isReadyForSubmission: readiness.isReady,
      mandatoryCount: readiness.mandatoryCount,
      completedMandatoryCount: readiness.completedCount,
      missingRules: readiness.missingRules,
    }));
  }, [state.resolvedRules, state.evidenceItems]);

  // Step 0 Setters
  const setSite = (site: Site) => {
    setState(prev => ({
      ...prev,
      siteId: site.id,
      siteName: site.name,
    }));
  };

  const setBrand = async (brand: Brand) => {
    setState(prev => ({
      ...prev,
      brandId: brand.id,
      brandName: brand.name,
      make: brand.name,
    }));
    try {
      const bp = await brandPacksApi.getActiveByBrandId(brand.id);
      setState(prev => ({
        ...prev,
        activeBrandPack: bp,
      }));
    } catch (e) {}
  };

  const setRoNumber = (ro: string) => {
    setState(prev => ({ ...prev, roNumber: ro.toUpperCase() }));
  };

  const setClaimNumber = (claim: string) => {
    setState(prev => ({ ...prev, claimNumber: claim }));
  };

  // Step 1 Setters
  const setVin = (vin: string) => {
    setState(prev => ({ ...prev, vin: vin.toUpperCase() }));
  };

  const setOdometer = (odo: number | null) => {
    setState(prev => ({ ...prev, odometer: odo }));
  };

  const setVehicleInfo = (info: {
    make?: string;
    model?: string;
    year?: number | null;
    powertrain?: PowertrainType;
  }) => {
    setState(prev => ({
      ...prev,
      ...(info.make ? { make: info.make } : {}),
      ...(info.model ? { model: info.model } : {}),
      ...(info.year !== undefined ? { year: info.year } : {}),
      ...(info.powertrain ? { powertrain: info.powertrain } : {}),
    }));
  };

  const decodeVinNow = async (vinToDecode?: string) => {
    const targetVin = vinToDecode || state.vin;
    if (!targetVin || targetVin.length < 11) return;

    setState(prev => ({ ...prev, isVinDecoding: true }));
    try {
      const res = await vehicleApi.decodeVin(targetVin);
      setState(prev => ({
        ...prev,
        isVinDecoding: false,
        isVinDecoded: true,
        make: res.make || prev.make,
        model: res.model && !res.model.includes('Confirm') ? res.model : prev.model || 'ATTO 3',
        year: res.year || prev.year || 2024,
        powertrain: res.powertrain || prev.powertrain || 'EV',
      }));
    } catch (err) {
      setState(prev => ({ ...prev, isVinDecoding: false }));
    }
  };

  // Step 2 Fault Setters
  const setConcernTitle = (title: string) => {
    setState(prev => ({ ...prev, concernTitle: title }));
  };

  const setFaultCategory = (category: string) => {
    setState(prev => ({ ...prev, faultCategory: category }));
  };

  const setPartReplaced = (replaced: boolean) => {
    setState(prev => ({ ...prev, partReplaced: replaced }));
  };

  const setOldPartSerial = (serial: string) => {
    setState(prev => ({ ...prev, oldPartSerial: serial }));
  };

  const setNewPartSerial = (serial: string) => {
    setState(prev => ({ ...prev, newPartSerial: serial }));
  };

  const setNoiseFault = (noise: boolean) => {
    setState(prev => ({ ...prev, noiseFault: noise }));
  };

  const setDiagnosticsAvailable = (diag: boolean) => {
    setState(prev => ({ ...prev, diagnosticsAvailable: diag }));
  };

  const setRepairStage = (stage: RepairStage) => {
    setState(prev => ({ ...prev, repairStage: stage }));
  };

  // Evidence Actions
  const saveEvidenceItem = (item: Partial<EvidenceItem> & { ruleKey: string }) => {
    setState(prev => {
      const rule = prev.resolvedRules.find(r => r.ruleKey === item.ruleKey) || {
        id: `rule_${item.ruleKey}`,
        ruleKey: item.ruleKey,
        name: item.ruleName || item.ruleKey,
        description: '',
        mediaType: item.mediaType || 'image',
        tier: 1 as const,
        isMandatory: item.isMandatory ?? true,
        namingConvention: `[DealerRONumber]${item.ruleKey}.jpg`,
      };

      const oemName = item.oemFileName || namingEngine.generateOemFileName(rule, prev.roNumber);

      const existingIndex = prev.evidenceItems.findIndex(e => e.ruleKey === item.ruleKey);
      const newEvidence: EvidenceItem = {
        id: item.id || `ev_${Date.now()}_${item.ruleKey}`,
        ruleKey: item.ruleKey,
        ruleName: item.ruleName || rule.name,
        mediaType: item.mediaType || rule.mediaType,
        oemFileName: oemName,
        fileUri: item.fileUri,
        serverUrl: item.serverUrl,
        fileSize: item.fileSize,
        mimeType: item.mimeType || (rule.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        capturedAt: item.capturedAt || new Date().toISOString(),
        serialNumber: item.serialNumber,
        ocrExtractedText: item.ocrExtractedText,
        durationSeconds: item.durationSeconds,
        qualityStatus: item.qualityStatus || 'PASSED',
        qualityCheck: item.qualityCheck,
        isMandatory: item.isMandatory ?? rule.isMandatory,
        tier: rule.tier || 1,
        pinnedVoiceNoteIds: item.pinnedVoiceNoteIds || [],
        notes: item.notes,
        isUploaded: item.isUploaded ?? false,
      };

      let updatedList = [...prev.evidenceItems];
      if (existingIndex >= 0) {
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...newEvidence };
      } else {
        updatedList.push(newEvidence);
      }

      return {
        ...prev,
        evidenceItems: updatedList,
      };
    });
  };

  const removeEvidenceItem = (ruleKey: string) => {
    setState(prev => ({
      ...prev,
      evidenceItems: prev.evidenceItems.filter(e => e.ruleKey !== ruleKey),
    }));
  };

  const getEvidenceForRule = (ruleKey: string): EvidenceItem | undefined => {
    return state.evidenceItems.find(e => e.ruleKey === ruleKey);
  };

  const addVoiceNote = (note: VoiceNote) => {
    setState(prev => ({
      ...prev,
      voiceNotes: [...prev.voiceNotes, note],
    }));
  };

  const removeVoiceNote = (noteId: string) => {
    setState(prev => ({
      ...prev,
      voiceNotes: prev.voiceNotes.filter(n => n.id !== noteId),
    }));
  };

  // Step Navigation
  const setStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, Math.min(6, step)) }));
  };

  const nextStep = () => {
    setState(prev => {
      const next = Math.min(6, prev.currentStep + 1);
      return { ...prev, currentStep: next };
    });
  };

  const prevStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  };

  // Case Lifecycle
  const startNewCase = (initialData?: Partial<CaseWizardState>) => {
    setState({
      ...defaultState,
      roNumber: `CR-${Math.floor(10000 + Math.random() * 90000)}`,
      ...(initialData || {}),
    });
    evaluateRules();
  };

  const loadExistingCase = (caseItem: WarrantyCase, flaggedOnly: boolean = false) => {
    const flaggedKeys = caseItem.flagHistory
      ?.filter(f => !f.isResolved && f.ruleKey)
      ?.map(f => f.ruleKey as string) || [];

    setState({
      currentStep: flaggedOnly ? 3 : 0,
      caseId: caseItem.id,
      siteId: caseItem.siteId,
      siteName: caseItem.siteName || '',
      brandId: caseItem.brandId,
      brandName: caseItem.brandName || '',
      roNumber: caseItem.roNumber,
      claimNumber: caseItem.claimNumber || '',
      vin: caseItem.vin,
      odometer: caseItem.odometer,
      make: caseItem.make,
      model: caseItem.model,
      year: caseItem.year,
      powertrain: caseItem.powertrain,
      isVinDecoded: true,
      isVinDecoding: false,
      concernTitle: caseItem.concernTitle,
      faultCategory: caseItem.faultCategory,
      partReplaced: caseItem.partReplaced,
      oldPartSerial: caseItem.oldPartSerial || '',
      newPartSerial: caseItem.newPartSerial || '',
      noiseFault: caseItem.noiseFault,
      diagnosticsAvailable: caseItem.diagnosticsAvailable,
      repairStage: caseItem.repairStage,
      activeBrandPack: null,
      resolvedRules: [],
      isLoadingRules: false,
      evidenceItems: caseItem.evidenceItems || [],
      voiceNotes: caseItem.voiceNotes || [],
      isReadyForSubmission: false,
      mandatoryCount: 0,
      completedMandatoryCount: 0,
      missingRules: [],
      isFlaggedMode: flaggedOnly,
      flaggedRuleKeys: flaggedKeys,
    });

    evaluateRules();
  };

  const saveDraft = async () => {
    const localDraft = {
      localId: state.caseId || `draft_${state.roNumber || Date.now()}`,
      step: state.currentStep,
      siteId: state.siteId,
      siteName: state.siteName,
      brandId: state.brandId,
      brandName: state.brandName,
      roNumber: state.roNumber,
      claimNumber: state.claimNumber,
      vin: state.vin,
      odometer: state.odometer || 0,
      make: state.make,
      model: state.model,
      year: state.year || 2024,
      powertrain: state.powertrain,
      concernTitle: state.concernTitle,
      faultCategory: state.faultCategory,
      partReplaced: state.partReplaced,
      oldPartSerial: state.oldPartSerial,
      newPartSerial: state.newPartSerial,
      noiseFault: state.noiseFault,
      diagnosticsAvailable: state.diagnosticsAvailable,
      repairStage: state.repairStage,
      evidenceItems: state.evidenceItems,
      voiceNotes: state.voiceNotes,
      savedAt: new Date().toISOString(),
    };

    offlineStorage.saveDraft(localDraft);
  };

  const submitCase = async (): Promise<WarrantyCase> => {
    // Generate DTO with solid defaults matching backend DTO schema
    const dto = {
      siteId: state.siteId || 'site_cranbourne_byd',
      siteName: state.siteName || 'Booran BYD Cranbourne',
      brandId: state.brandId || 'brand_byd',
      brandName: state.brandName || 'BYD',
      brandPackId: state.activeBrandPack?.id || 'brandpack_byd_v1',
      brandPackVersion: state.activeBrandPack?.version || 1,
      roNumber: state.roNumber || `CR-${Date.now().toString().slice(-5)}`,
      claimNumber: state.claimNumber,
      vin: state.vin || 'LGXCE4C86P0019283',
      odometer: Number(state.odometer) || 14250,
      make: state.make || state.brandName || 'BYD',
      model: state.model || 'ATTO 3 Extended',
      year: Number(state.year) || 2024,
      powertrain: state.powertrain || 'EV',
      concernTitle: state.concernTitle || 'Warranty inspection and fault diagnosis',
      faultCategory: state.faultCategory || 'Oil leaks or seepage',
      partReplaced: Boolean(state.partReplaced),
      oldPartSerial: state.oldPartSerial,
      newPartSerial: state.newPartSerial,
      noiseFault: Boolean(state.noiseFault),
      diagnosticsAvailable: Boolean(state.diagnosticsAvailable),
      repairStage: state.repairStage || 'Repair complete',
      technicianId: user?.id || 'tech_jake_s',
      technicianName: user?.name || 'Jake Smith',
      evidenceItems: state.evidenceItems || [],
      voiceNotes: state.voiceNotes || [],
    };

    try {
      let createdCase: WarrantyCase;
      const isExistingServerCase =
        state.caseId &&
        !state.caseId.startsWith('CASE-') &&
        !state.caseId.startsWith('local_') &&
        !state.caseId.startsWith('draft_');

      if (isExistingServerCase) {
        createdCase = await casesApi.updateCase(state.caseId!, dto);
      } else {
        createdCase = await casesApi.createCase(dto);
      }

      // Upload each captured evidence file
      if (state.evidenceItems && state.evidenceItems.length > 0) {
        for (const ev of state.evidenceItems) {
          try {
            if (ev.fileUri && (ev.fileUri.startsWith('file://') || ev.fileUri.startsWith('content://') || ev.fileUri.startsWith('/'))) {
              const formData = new FormData();
              const ext = ev.mediaType === 'video' ? 'mp4' : 'jpg';
              const mime = ev.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
              const cleanRo = (state.roNumber || 'RO').replace(/[^a-zA-Z0-9]/g, '');
              const descriptor = ev.ruleKey
                .split('_')
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                .join('');
              const oemFileName = `${cleanRo}${descriptor}.${ext}`;

              formData.append('file', {
                uri: ev.fileUri,
                type: mime,
                name: oemFileName,
              } as any);
              formData.append('ruleKey', ev.ruleKey);
              formData.append('evidenceName', ev.ruleName || ev.ruleKey);
              if (ev.ocrExtractedText) {
                formData.append('ocrExtractedText', ev.ocrExtractedText);
              }

              await casesApi.uploadEvidenceFile(createdCase.id, formData);
            } else if (ev.storageUrl || ev.fileUri) {
              await casesApi.addEvidence(createdCase.id, {
                ruleKey: ev.ruleKey,
                name: ev.ruleName || ev.ruleKey,
                mediaType: (ev.mediaType as any) || 'image',
                storageUrl: ev.storageUrl || ev.fileUri || '',
                ocrExtractedText: ev.ocrExtractedText,
                ocrConfidence: ev.ocrConfidence,
                durationSeconds: ev.durationSeconds,
              });
            }
          } catch (uploadErr) {
            console.warn(`[CaseWizardContext] Upload failed for evidence ${ev.ruleKey}:`, uploadErr);
            try {
              await casesApi.addEvidence(createdCase.id, {
                ruleKey: ev.ruleKey,
                name: ev.ruleName || ev.ruleKey,
                mediaType: (ev.mediaType as any) || 'image',
                storageUrl: ev.storageUrl || ev.fileUri || '',
                ocrExtractedText: ev.ocrExtractedText,
                ocrConfidence: ev.ocrConfidence,
                durationSeconds: ev.durationSeconds,
              });
            } catch (e) {
              console.warn(`[CaseWizardContext] addEvidence fallback failed for ${ev.ruleKey}:`, e);
            }
          }
        }
      }

      // Submit from workshop to trigger CRM status transition
      const submitted = await casesApi.submitFromWorkshop(createdCase.id, {
        checklistSummary: {
          totalMandatory: state.mandatoryCount,
          completedMandatory: state.completedMandatoryCount || state.evidenceItems.length,
          isReadyForSubmission: true,
        },
      });

      console.log('[CaseWizardContext] Case submitted to backend CRM successfully:', submitted.id);
      return submitted;
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        throw new Error('Authentication expired. Please sign in again to submit.');
      }
      if (err?.statusCode === 400 || err?.statusCode === 422) {
        throw new Error(err.message || 'Case submission failed validation. Please check your data.');
      }

      console.warn('[CaseWizardContext] Network connection error, queuing offline:', err?.message || err);
      // If truly offline / unreachable, save to pending queue
      const mockSubmitted: WarrantyCase = {
        id: state.caseId || `CASE-${(state.roNumber || 'RO').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
        ...dto,
        status: 'Uploading',
        technicianId: user?.id || 'usr_tech_1',
        technicianName: user?.name || 'Jake Smith',
        flagHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      offlineStorage.queuePendingUpload(mockSubmitted);
      return mockSubmitted;
    }
  };

  const resetWizard = () => {
    setState(defaultState);
  };

  return (
    <CaseWizardContext.Provider
      value={{
        ...state,
        setStep,
        nextStep,
        prevStep,
        setSite,
        setBrand,
        setRoNumber,
        setClaimNumber,
        setVin,
        setOdometer,
        setVehicleInfo,
        decodeVinNow,
        setConcernTitle,
        setFaultCategory,
        setPartReplaced,
        setOldPartSerial,
        setNewPartSerial,
        setNoiseFault,
        setDiagnosticsAvailable,
        setRepairStage,
        saveEvidenceItem,
        removeEvidenceItem,
        getEvidenceForRule,
        addVoiceNote,
        removeVoiceNote,
        evaluateRules,
        startNewCase,
        loadExistingCase,
        saveDraft,
        submitCase,
        resetWizard,
      }}
    >
      {children}
    </CaseWizardContext.Provider>
  );
};

export const useCaseWizard = () => {
  const context = useContext(CaseWizardContext);
  if (!context) {
    throw new Error('useCaseWizard must be used within a CaseWizardProvider');
  }
  return context;
};
