import { BrandPackRule } from '../types';

export const namingEngine = {
  /**
   * Generates official OEM-compliant filename based on Brand Pack rule pattern and RO number.
   * e.g. [DealerRONumber]FrontOfCar.jpg -> CR21693FrontOfCar.jpg
   */
  generateOemFileName: (
    rule: BrandPackRule | { namingConvention?: string; ruleKey?: string; mediaType?: string },
    roNumber: string,
    faultDescriptor?: string
  ): string => {
    // Sanitize RO number (remove spaces and special chars, keep alphanumeric and hyphens)
    const cleanRo = (roNumber || 'RO0000').replace(/[^a-zA-Z0-9]/g, '');

    const pattern = rule.namingConvention || `[DealerRONumber]${rule.ruleKey || 'Evidence'}.jpg`;

    let fileName = pattern.replace(/\[DealerRONumber\]/g, cleanRo);

    // If there's a fault descriptor in video naming (e.g. [DealerRONumber]KnockingNoise(Before).mp4)
    if (faultDescriptor && fileName.includes('KnockingNoise')) {
      const cleanDesc = faultDescriptor.replace(/[^a-zA-Z0-9]/g, '');
      fileName = fileName.replace('KnockingNoise', cleanDesc || 'FaultVideo');
    }

    return fileName;
  },

  /**
   * Derives default rule key from filename if needed
   */
  getRuleKeyFromFileName: (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes('vin')) return 'vin_photo';
    if (lower.includes('odo')) return 'odometer_photo';
    if (lower.includes('front')) return 'front_vehicle_photo';
    if (lower.includes('close')) return 'fault_closeup';
    if (lower.includes('location')) return 'fault_location';
    if (lower.includes('oldpart')) return 'old_part_serial';
    if (lower.includes('newpart')) return 'new_part_serial';
    if (lower.includes('dtc')) return 'diagnostic_evidence';
    if (lower.includes('video') || lower.includes('noise')) return 'video_before';
    if (lower.includes('after')) return 'after_repair_photo';
    if (lower.includes('isolation')) return 'tier2_hv_isolation';
    if (lower.includes('packserial')) return 'tier2_hv_pack_label';
    return 'general_evidence';
  },
};
