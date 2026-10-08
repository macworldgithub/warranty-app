import { BrandPack, BrandPackRule, EvaluateRulesDto, EvaluatedRulesResponse } from '../types';

/**
 * Standard BYD Attachment A Brand Pack Rules
 */
export const BYD_TIER1_RULES: BrandPackRule[] = [
  {
    id: 'byd_r_vin',
    ruleKey: 'vin_photo',
    name: 'VIN Plate / Barcode',
    description: 'Clear photo of VIN compliance plate, barcode or windscreen label.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]VINPlate.jpg',
    guidanceText: 'Ensure the 17-character VIN is sharp, glare-free and fully readable.',
  },
  {
    id: 'byd_r_odo',
    ruleKey: 'odometer_photo',
    name: 'Odometer Cluster',
    description: 'Photo of the instrument cluster showing current vehicle mileage.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]Odometer.jpg',
    guidanceText: 'Capture total EV/HV odometer reading with ignition ON.',
  },
  {
    id: 'byd_r_front',
    ruleKey: 'front_vehicle_photo',
    name: 'Front of Vehicle',
    description: 'Wide shot of vehicle front showing overall condition and number plate.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]FrontOfCar.jpg',
    guidanceText: 'Step back to frame front bumper, grille, headlights and rego plate.',
  },
  {
    id: 'byd_r_fault_close',
    ruleKey: 'fault_closeup',
    name: 'Defect / Fault Close-Up',
    description: 'Detailed close-up photo of the defect filling the frame.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]FaultClose.jpg',
    guidanceText: 'Fill frame with defect. Use torch/flash in dark areas to ensure crisp focus.',
  },
  {
    id: 'byd_r_fault_loc',
    ruleKey: 'fault_location',
    name: 'Defect / Fault Location',
    description: 'Wider contextual shot showing where the fault sits on the vehicle.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]FaultLocation.jpg',
    guidanceText: 'Show the surrounding assembly to prove the component location on the vehicle.',
  },
];

/**
 * Conditional Core Evidence Rules
 */
export const CONDITIONAL_CORE_RULES: Record<string, BrandPackRule> = {
  old_part_serial: {
    id: 'r_old_part_serial',
    ruleKey: 'old_part_serial',
    name: 'Old Defective Part Serial',
    description: 'Photo showing the OEM part number and serial/QR label on defective removed part.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]OldPartSerial.jpg',
    guidanceText: 'Capture clear barcode/QR or stamped part number on the defective part.',
  },
  new_part_serial: {
    id: 'r_new_part_serial',
    ruleKey: 'new_part_serial',
    name: 'New Replacement Part Serial',
    description: 'Photo showing the OEM part number and serial/QR label on new replacement part.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]NewPartSerial.jpg',
    guidanceText: 'Capture clear barcode/QR or stamped part number on the new OEM box/part.',
  },
  diagnostic_evidence: {
    id: 'r_diag_evidence',
    ruleKey: 'diagnostic_evidence',
    name: 'Diagnostic Evidence / DTC Report',
    description: 'Photo of diagnostic scan tool (VDS / GDS) displaying active DTCs and freeze frame.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]DTCReport.jpg',
    guidanceText: 'Photograph diagnostic screen showing DTC code, system status and freeze-frame data.',
  },
  video_noise: {
    id: 'r_video_noise',
    ruleKey: 'video_before',
    name: 'Noise / Operational Fault Video',
    description: '30-60s video recording with audio demonstrating symptom or abnormal noise.',
    mediaType: 'video',
    tier: 1,
    isMandatory: true,
    minDurationSeconds: 5,
    maxDurationSeconds: 60,
    namingConvention: '[DealerRONumber]KnockingNoise(Before).mp4',
    guidanceText: 'Record steady video capturing the noise or operational malfunction clearly.',
  },
  before_repair: {
    id: 'r_before_repair',
    ruleKey: 'before_repair_photo',
    name: 'Pre-Repair Condition',
    description: 'Photo of affected area prior to disassembly or repair.',
    mediaType: 'image',
    tier: 1,
    isMandatory: false,
    namingConvention: '[DealerRONumber]BeforeRepair.jpg',
    guidanceText: 'Capture undisturbed state before technician begins repair work.',
  },
  after_repair: {
    id: 'r_after_repair',
    ruleKey: 'after_repair_photo',
    name: 'Post-Repair Completed',
    description: 'Photo of new part installed and completed assembly.',
    mediaType: 'image',
    tier: 1,
    isMandatory: true,
    namingConvention: '[DealerRONumber]AfterRepair.jpg',
    guidanceText: 'Capture completed assembly after new part installation and torque verification.',
  },
};

/**
 * BYD Specific Tier 2 Fault Annex Rules (Attachment A & Annex 2)
 */
export const BYD_TIER2_FAULT_RULES: Record<string, BrandPackRule[]> = {
  oil_leak: [
    {
      id: 'byd_t2_oil_dry',
      ruleKey: 'tier2_oil_dry_reference',
      name: 'Dry-Area Reference Photo',
      description: 'Photo of adjacent dry metal or component to prove leak boundary extent.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]OilDryArea.jpg',
      guidanceText: 'Show clean/dry surrounding area to delineate the leak source from ambient road grime.',
    },
    {
      id: 'byd_t2_oil_origin',
      ruleKey: 'tier2_oil_origin',
      name: 'Leak Origin & Seepage Point',
      description: 'Close-up of gasket seam, seal mating surface or casting weep point.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]LeakOrigin.jpg',
      guidanceText: 'Pinpoint the exact origin point of oil/fluid weeping.',
    },
    {
      id: 'byd_t2_oil_fluid',
      ruleKey: 'tier2_oil_fluid_color',
      name: 'Fluid Color & Type Verification',
      description: 'Macro shot of fluid droplet on white cloth/paper to confirm fluid type.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]FluidColor.jpg',
      guidanceText: 'Demonstrate fluid color (e.g. blue coolant, red ATF, clear brake fluid).',
    },
  ],
  ecu_sensor: [
    {
      id: 'byd_t2_ecu_pins',
      ruleKey: 'tier2_ecu_pins',
      name: 'ECU Connector & Pin Condition',
      description: 'Close-up photo of harness connector showing pins are straight and corrosion-free.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]ECUPins.jpg',
      guidanceText: 'Inspect pin face for pushed-back terminals, fretting or water ingress.',
    },
    {
      id: 'byd_t2_ecu_harness',
      ruleKey: 'tier2_ecu_harness',
      name: 'Wiring Harness & Bracket Mounting',
      description: 'Photo showing harness routing, ground eyelet and bracket condition.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]ECUHarness.jpg',
      guidanceText: 'Confirm no pinched wire harness or loose ground bolt.',
    },
  ],
  software: [
    {
      id: 'byd_t2_sw_before',
      ruleKey: 'tier2_sw_before',
      name: 'Pre-Update Software Version',
      description: 'BYD VDS screen showing current ECU software version prior to flashing.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]SWBefore.jpg',
      guidanceText: 'Capture complete software version string and calibration ID before update.',
    },
    {
      id: 'byd_t2_sw_after',
      ruleKey: 'tier2_sw_after',
      name: 'Post-Update Software Version',
      description: 'BYD VDS screen confirming new target ECU software version after flash.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]SWAfter.jpg',
      guidanceText: 'Capture updated version screen confirming successful ECU programming.',
    },
  ],
  hv_battery: [
    {
      id: 'byd_t2_hv_isolator',
      ruleKey: 'tier2_hv_isolator',
      name: 'HV MSD Isolator Disconnected',
      description: 'Photo of Manual Service Disconnect switch in removed/locked position.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]HVIsolator.jpg',
      guidanceText: 'Verify HV safety protocol by capturing disconnected MSD plug with lockout tag.',
    },
    {
      id: 'byd_t2_hv_pack_label',
      ruleKey: 'tier2_hv_pack_label',
      name: 'Battery Pack ID & Warning Labels',
      description: 'Clear photo of HV battery pack identification label, serial and warning tags.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]BatteryPackSerial.jpg',
      guidanceText: 'Ensure battery pack serial number and high-voltage warning label are legible.',
    },
    {
      id: 'byd_t2_hv_torque',
      ruleKey: 'tier2_hv_torque_check',
      name: 'Insulation & Torque Witness Marks',
      description: 'Photo showing torque witness marks on HV busbars or terminal fasteners.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]HVTorqueCheck.jpg',
      guidanceText: 'Show paint witness marks indicating correct terminal torque.',
    },
  ],
  charging: [
    {
      id: 'byd_t2_charge_port',
      ruleKey: 'tier2_charge_port',
      name: 'Charge Port Inlet & Locking Pin',
      description: 'Macro photo of charge inlet receptacle (Type 2 / CCS2) and locking pin.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]ChargePort.jpg',
      guidanceText: 'Inspect terminals for arcing, burn marks, foreign debris or stuck lock actuator.',
    },
    {
      id: 'byd_t2_charger_id',
      ruleKey: 'tier2_charger_id',
      name: 'EVSE / Charger Model & Serial',
      description: 'Photo of charging equipment nameplate used during diagnostic testing.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]ChargerID.jpg',
      guidanceText: 'Record charger output specifications and serial number.',
    },
  ],
  powertrain_chassis: [
    {
      id: 'byd_t2_chassis_casting',
      ruleKey: 'tier2_chassis_casting',
      name: 'Component Casting / Part Markings',
      description: 'Photo of stamped or cast OEM part identification marking.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]CastingMark.jpg',
      guidanceText: 'Capture the OEM casting logo and part number stamp on defective structural part.',
    },
    {
      id: 'byd_t2_chassis_clearance',
      ruleKey: 'tier2_chassis_clearance',
      name: 'Impact Exclusion & Surrounding Clearance',
      description: 'Wide shot showing absence of road strike or exterior impact damage.',
      mediaType: 'image',
      tier: 2,
      isMandatory: false,
      namingConvention: '[DealerRONumber]ImpactExclusion.jpg',
      guidanceText: 'Document lack of scrape marks, bent brackets or impact damage to prove manufacturing defect.',
    },
  ],
};

/**
 * Non-BYD Multi-Brand Common Tier 2 Rules
 * Clean baseline component evidence without brand-specific deep-dive annexes
 */
export const COMMON_TIER2_RULES: BrandPackRule[] = [
  {
    id: 'common_t2_component_detail',
    ruleKey: 'tier2_component_detail',
    name: 'Component Detail Photo',
    description: 'Additional clear photo of failed component or installation area.',
    mediaType: 'image',
    tier: 2,
    isMandatory: false,
    namingConvention: '[DealerRONumber]ComponentDetail.jpg',
    guidanceText: 'Capture another angle of the defective component for clerk verification.',
  },
  {
    id: 'common_t2_assembly_context',
    ruleKey: 'tier2_assembly_context',
    name: 'Surrounding Assembly Context',
    description: 'Wider contextual photo showing mounting alignment and adjoining components.',
    mediaType: 'image',
    tier: 2,
    isMandatory: false,
    namingConvention: '[DealerRONumber]AssemblyContext.jpg',
    guidanceText: 'Provide clear view of mounting position and absence of secondary damage.',
  },
];

export const brandPacksService = {
  /**
   * Returns active brand pack for any brand.
   * If BYD, returns BYD Attachment A Pack.
   * If other brand (Hyundai, Kia, MG, Chery, Toyota, Ford, etc.), returns the common Tier 1 pack.
   */
  getBrandPackForBrand: (brandIdOrName: string): BrandPack => {
    const isByd =
      (brandIdOrName || '').toLowerCase().includes('byd') ||
      brandIdOrName === 'brand_byd';

    if (isByd) {
      return {
        id: 'brandpack_byd_v1',
        brandId: 'brand_byd',
        brandName: 'BYD',
        version: 1,
        status: 'PUBLISHED',
        name: 'BYD Attachment A - Photo & Video Checklist v1.0',
        description: 'Official BYD-WB-2602-02 Attachment A Evidence Checklist and OEM Naming Pack',
        rules: [
          ...BYD_TIER1_RULES,
          CONDITIONAL_CORE_RULES.old_part_serial,
          CONDITIONAL_CORE_RULES.new_part_serial,
          CONDITIONAL_CORE_RULES.diagnostic_evidence,
          CONDITIONAL_CORE_RULES.video_noise,
          CONDITIONAL_CORE_RULES.before_repair,
          CONDITIONAL_CORE_RULES.after_repair,
          ...Object.values(BYD_TIER2_FAULT_RULES).flat(),
        ],
      };
    }

    const brandNameClean = (brandIdOrName || 'Brand').replace(/^brand_/i, '').toUpperCase();

    return {
      id: `brandpack_${brandNameClean.toLowerCase()}_v1`,
      brandId: brandIdOrName,
      brandName: brandNameClean,
      version: 1,
      status: 'PUBLISHED',
      name: `${brandNameClean} Standard Evidence Checklist v1.0`,
      description: `Universal Multi-Brand Tier 1 Evidence Pack for ${brandNameClean} (Booran Multi-Brand Standard)`,
      rules: [
        ...BYD_TIER1_RULES,
        CONDITIONAL_CORE_RULES.old_part_serial,
        CONDITIONAL_CORE_RULES.new_part_serial,
        CONDITIONAL_CORE_RULES.diagnostic_evidence,
        CONDITIONAL_CORE_RULES.video_noise,
        CONDITIONAL_CORE_RULES.before_repair,
        CONDITIONAL_CORE_RULES.after_repair,
        ...COMMON_TIER2_RULES,
      ],
    };
  },

  /**
   * Resolves exact required rules based on brand, fault category, and conditional gates.
   * If BYD: applies BYD Attachment A + Category Annex 2 criteria.
   * If other brand: defaults to BYD Tier 1 criteria minus specific BYD fault rules.
   */
  evaluateRules: (dto: EvaluateRulesDto): EvaluatedRulesResponse => {
    const isByd =
      (dto.brandId || '').toLowerCase().includes('byd') ||
      dto.brandId === 'brand_byd';

    const resolvedRules: BrandPackRule[] = [...BYD_TIER1_RULES];

    // Conditional: Part Replaced
    if (dto.partReplaced) {
      resolvedRules.push(CONDITIONAL_CORE_RULES.old_part_serial);
      resolvedRules.push(CONDITIONAL_CORE_RULES.new_part_serial);
    }

    // Conditional: Diagnostics Available
    if (dto.diagnosticsAvailable) {
      resolvedRules.push(CONDITIONAL_CORE_RULES.diagnostic_evidence);
    }

    // Conditional: Noise or Operational Glitch
    if (dto.noiseFault) {
      resolvedRules.push(CONDITIONAL_CORE_RULES.video_noise);
    }

    // Conditional: Repair Stage
    if (dto.repairStage === 'Pre-repair only' || dto.repairStage === 'During repair') {
      resolvedRules.push(CONDITIONAL_CORE_RULES.before_repair);
    }
    if (dto.repairStage === 'Repair complete') {
      resolvedRules.push(CONDITIONAL_CORE_RULES.after_repair);
    }

    // Tier 2 Rules Evaluation
    if (isByd) {
      // Map category label or id to BYD Annex 2 rules
      const catKey = getCategoryKey(dto.faultCategory);
      const bydExtras = BYD_TIER2_FAULT_RULES[catKey] || [];
      resolvedRules.push(...bydExtras);
    } else {
      // For any other brand, provide clean common tier 2 items (minus BYD-specific fault Annex 2)
      resolvedRules.push(...COMMON_TIER2_RULES);
    }

    const mandatoryCount = resolvedRules.filter((r) => r.isMandatory).length;
    const optionalCount = resolvedRules.length - mandatoryCount;

    return {
      brandPackId: isByd ? 'brandpack_byd_v1' : `brandpack_${(dto.brandId || 'general').toLowerCase()}_v1`,
      brandPackVersion: 1,
      packName: isByd ? 'BYD Attachment A Pack' : `${dto.brandId || 'General'} Standard Pack`,
      resolvedRules,
      mandatoryCount,
      optionalCount,
    };
  },
};

function getCategoryKey(faultCategory?: string): string {
  const c = (faultCategory || '').toLowerCase();
  if (c.includes('oil') || c.includes('leak') || c.includes('seep')) return 'oil_leak';
  if (c.includes('ecu') || c.includes('sensor')) return 'ecu_sensor';
  if (c.includes('software') || c.includes('program') || c.includes('update')) return 'software';
  if (c.includes('battery') || c.includes('hv') || c.includes('high-voltage') || c.includes('high voltage')) return 'hv_battery';
  if (c.includes('charging') || c.includes('charge')) return 'charging';
  if (c.includes('powertrain') || c.includes('chassis') || c.includes('body')) return 'powertrain_chassis';
  return 'general';
}
