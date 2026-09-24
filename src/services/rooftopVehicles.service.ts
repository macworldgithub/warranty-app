import { WarrantyCase, PowertrainType } from '../types';

export interface RooftopVehicle {
  id: string;
  vin: string;
  rego: string;
  make: string;
  model: string;
  year: number;
  powertrain: PowertrainType;
  color?: string;
  odometer: number;
  siteId: string;
  siteName: string;
  roNumber?: string;
  claimNumber?: string;
  concernTitle?: string;
  warrantyStatus: 'Active Claim' | 'Under Warranty' | 'Inspection Required' | 'Complete';
  caseCount: number;
  latestCase?: WarrantyCase;
}

// Initial dealership workshop fleet records per rooftop
const BASE_ROOFTOP_VEHICLES: RooftopVehicle[] = [
  // ── 1. Booran BYD Cranbourne (site_cranbourne_byd) ──────────────────
  {
    id: 'veh_cr_01',
    vin: 'LGXCE4C86P0019283',
    rego: '1BY-9EV',
    make: 'BYD',
    model: 'ATTO 3 Extended',
    year: 2024,
    powertrain: 'EV',
    color: 'Ski White',
    odometer: 14250,
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    roNumber: 'CR-98421',
    claimNumber: 'BYD-CLM-8839',
    concernTitle: 'Blade battery coolant manifold seepage & DTC P0B0D isolation alert',
    warrantyStatus: 'Active Claim',
    caseCount: 1,
  },
  {
    id: 'veh_cr_02',
    vin: 'LGXCE4C88R0048192',
    rego: '1SL-4EV',
    make: 'BYD',
    model: 'SEAL Performance AWD',
    year: 2024,
    powertrain: 'EV',
    color: 'Atlantis Grey',
    odometer: 8400,
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    roNumber: 'CR-98502',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_cr_03',
    vin: 'LGXCE4C82R0031829',
    rego: '1DL-2EV',
    make: 'BYD',
    model: 'Dolphin Premium',
    year: 2024,
    powertrain: 'EV',
    color: 'Coral Pink',
    odometer: 19800,
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    roNumber: 'CR-98610',
    concernTitle: '12V auxiliary charging fault — scheduled warranty inspection',
    warrantyStatus: 'Inspection Required',
    caseCount: 1,
  },
  {
    id: 'veh_cr_04',
    vin: 'LGXCE4C89S0071204',
    rego: '1SL-6HY',
    make: 'BYD',
    model: 'Sealion 6 Super Hybrid',
    year: 2025,
    powertrain: 'Hybrid',
    color: 'Arctic Blue',
    odometer: 4120,
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_cr_05',
    vin: 'LGXCE4C85S0093811',
    rego: '1SK-6UT',
    make: 'BYD',
    model: 'Shark 6 Dual Cab 4WD',
    year: 2025,
    powertrain: 'Hybrid',
    color: 'Marmara Black',
    odometer: 2600,
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },

  // ── 2. Booran Dandenong Multi (site_dandenong_multi) ────────────────
  {
    id: 'veh_dan_01',
    vin: 'KMHD851FBPU192834',
    rego: '1TC-8HY',
    make: 'Hyundai',
    model: 'Tucson 1.6T AWD',
    year: 2023,
    powertrain: 'ICE',
    color: 'Amazon Grey',
    odometer: 38200,
    siteId: 'site_dandenong_multi',
    siteName: 'Booran Dandenong Multi',
    roNumber: 'DAN-40192',
    concernTitle: 'Timing chain cover oil leak at upper camshaft seal',
    warrantyStatus: 'Active Claim',
    caseCount: 1,
  },
  {
    id: 'veh_dan_02',
    vin: 'KMHD851FCRU381920',
    rego: '1IQ-5EV',
    make: 'Hyundai',
    model: 'Ioniq 5 Epiq AWD',
    year: 2024,
    powertrain: 'EV',
    color: 'Digital Teal',
    odometer: 16500,
    siteId: 'site_dandenong_multi',
    siteName: 'Booran Dandenong Multi',
    roNumber: 'DAN-40245',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_dan_03',
    vin: 'KNAE261FBRA091823',
    rego: '1EV-6KA',
    make: 'Kia',
    model: 'EV6 GT-Line AWD',
    year: 2024,
    powertrain: 'EV',
    color: 'Yacht Blue',
    odometer: 22100,
    siteId: 'site_dandenong_multi',
    siteName: 'Booran Dandenong Multi',
    roNumber: 'DAN-40312',
    concernTitle: 'ICCU charge port actuator latch sticking intermittently',
    warrantyStatus: 'Inspection Required',
    caseCount: 1,
  },
  {
    id: 'veh_dan_04',
    vin: 'JMYXTGG3WRA019284',
    rego: '1MO-7PH',
    make: 'Mitsubishi',
    model: 'Outlander PHEV Exceed',
    year: 2024,
    powertrain: 'Hybrid',
    color: 'White Diamond',
    odometer: 29400,
    siteId: 'site_dandenong_multi',
    siteName: 'Booran Dandenong Multi',
    roNumber: 'DAN-40401',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_dan_05',
    vin: 'KNAE261FCPA049182',
    rego: '1CV-9KA',
    make: 'Kia',
    model: 'Carnival Platinum Diesel',
    year: 2023,
    powertrain: 'ICE',
    color: 'Panthera Metal',
    odometer: 44700,
    siteId: 'site_dandenong_multi',
    siteName: 'Booran Dandenong Multi',
    roNumber: 'DAN-40098',
    warrantyStatus: 'Complete',
    caseCount: 1,
  },

  // ── 3. Booran MG & Chery Cheltenham (site_cheltenham_mg) ────────────
  {
    id: 'veh_che_01',
    vin: 'LSJ4A4212RA092817',
    rego: '1MG-4EV',
    make: 'MG Motor',
    model: 'MG4 Essence 64',
    year: 2024,
    powertrain: 'EV',
    color: 'Volcano Orange',
    odometer: 11200,
    siteId: 'site_cheltenham_mg',
    siteName: 'Booran MG & Chery Cheltenham',
    roNumber: 'CHE-21049',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_che_02',
    vin: 'LSJ4A4214PA081920',
    rego: '1MG-2EV',
    make: 'MG Motor',
    model: 'MG ZS EV Long Range',
    year: 2023,
    powertrain: 'EV',
    color: 'Diamond Red',
    odometer: 31500,
    siteId: 'site_cheltenham_mg',
    siteName: 'Booran MG & Chery Cheltenham',
    roNumber: 'CHE-21110',
    concernTitle: 'On-board charger (OBC) thermal threshold error',
    warrantyStatus: 'Inspection Required',
    caseCount: 1,
  },
  {
    id: 'veh_che_03',
    vin: 'LVVD21A45RA018274',
    rego: '1OM-5CH',
    make: 'Chery',
    model: 'Omoda 5 GT AWD',
    year: 2024,
    powertrain: 'ICE',
    color: 'Titanium Grey',
    odometer: 15300,
    siteId: 'site_cheltenham_mg',
    siteName: 'Booran MG & Chery Cheltenham',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_che_04',
    vin: 'LVVD21A48RA038192',
    rego: '1TG-7CH',
    make: 'Chery',
    model: 'Tiggo 7 Pro Ultimate',
    year: 2024,
    powertrain: 'ICE',
    color: 'Khaki White',
    odometer: 9850,
    siteId: 'site_cheltenham_mg',
    siteName: 'Booran MG & Chery Cheltenham',
    roNumber: 'CHE-21240',
    concernTitle: 'Infotainment cluster black screen after OTA firmware update',
    warrantyStatus: 'Active Claim',
    caseCount: 1,
  },

  // ── 4. Booran Berwick Commercials (site_berwick_toyota_ford) ─────────
  {
    id: 'veh_ber_01',
    vin: 'MR0BA3CD4P0192837',
    rego: '1HL-8TO',
    make: 'Toyota',
    model: 'HiLux SR5 4x4 Double Cab',
    year: 2023,
    powertrain: 'ICE',
    color: 'Glacier White',
    odometer: 46000,
    siteId: 'site_berwick_toyota_ford',
    siteName: 'Booran Berwick Commercials',
    roNumber: 'BER-80120',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_ber_02',
    vin: 'MNBAXXWPA1RA09182',
    rego: '1RN-6FD',
    make: 'Ford',
    model: 'Ranger Wildtrak V6 Diesel',
    year: 2024,
    powertrain: 'ICE',
    color: 'Sedona Orange',
    odometer: 21300,
    siteId: 'site_berwick_toyota_ford',
    siteName: 'Booran Berwick Commercials',
    roNumber: 'BER-80215',
    concernTitle: '10-speed transmission flare on 3-4 upshift cold',
    warrantyStatus: 'Active Claim',
    caseCount: 1,
  },
  {
    id: 'veh_ber_03',
    vin: 'JTMB1RFV7RA018273',
    rego: '1RV-4TO',
    make: 'Toyota',
    model: 'RAV4 Cruiser Hybrid AWD',
    year: 2024,
    powertrain: 'Hybrid',
    color: 'Atomic Rush',
    odometer: 18900,
    siteId: 'site_berwick_toyota_ford',
    siteName: 'Booran Berwick Commercials',
    roNumber: 'BER-80280',
    warrantyStatus: 'Under Warranty',
    caseCount: 0,
  },
  {
    id: 'veh_ber_04',
    vin: 'MNBAXXWPB1PA04918',
    rego: '1EV-8FD',
    make: 'Ford',
    model: 'Everest Sport 4WD',
    year: 2023,
    powertrain: 'ICE',
    color: 'Meteor Grey',
    odometer: 34200,
    siteId: 'site_berwick_toyota_ford',
    siteName: 'Booran Berwick Commercials',
    roNumber: 'BER-80095',
    warrantyStatus: 'Complete',
    caseCount: 1,
  },
];

export const rooftopVehiclesService = {
  /**
   * Returns all vehicles for a specific rooftop siteId,
   * merged with live warranty cases raised at that site.
   */
  getVehiclesForRooftop: (siteId: string, cases: WarrantyCase[] = []): RooftopVehicle[] => {
    const isAll = !siteId || siteId.toUpperCase() === 'ALL';

    // 1. Get base rooftop vehicles
    const baseList = BASE_ROOFTOP_VEHICLES.filter(
      (v) => isAll || v.siteId.toLowerCase() === siteId.toLowerCase()
    );

    // 2. Map of existing vehicles by VIN - initialize dynamically with 0 cases
    const vehicleMap = new Map<string, RooftopVehicle>();
    for (const v of baseList) {
      vehicleMap.set(v.vin.toUpperCase(), {
        ...v,
        caseCount: 0,
        latestCase: undefined,
        warrantyStatus: 'Under Warranty',
      });
    }

    // 3. Merge cases for this siteId (or all if network view)
    const siteCases = cases.filter(
      (c) => isAll || (c.siteId && c.siteId.toLowerCase() === siteId.toLowerCase())
    );

    for (const c of siteCases) {
      if (!c.vin && !c.roNumber) continue;
      const cleanVin = (c.vin || '').trim().toUpperCase();
      const cleanRo = (c.roNumber || '').trim().toUpperCase();

      let existing = cleanVin ? vehicleMap.get(cleanVin) : undefined;
      if (!existing && cleanRo) {
        existing = Array.from(vehicleMap.values()).find(
          v => v.roNumber && v.roNumber.trim().toUpperCase() === cleanRo
        );
      }

      if (existing) {
        existing.caseCount += 1;
        existing.latestCase = c;
        if (c.roNumber) existing.roNumber = c.roNumber;
        if (c.claimNumber) existing.claimNumber = c.claimNumber;
        if (c.concernTitle) existing.concernTitle = c.concernTitle;
        if (c.odometer && c.odometer > (existing.odometer || 0)) {
          existing.odometer = c.odometer;
        }
        if (c.status === 'Flagged' || c.status === 'Awaiting Review' || c.status === 'Draft') {
          existing.warrantyStatus = 'Active Claim';
        } else if (c.status === 'Submitted' || c.status === 'Closed') {
          existing.warrantyStatus = 'Complete';
        }
      } else if (cleanVin) {
        // Vehicle created dynamically from live case
        vehicleMap.set(cleanVin, {
          id: `dyn_${cleanVin.slice(-6)}`,
          vin: cleanVin,
          rego: `VIC · ${cleanVin.slice(-3)}`,
          make: c.make || 'OEM',
          model: c.model || 'Vehicle',
          year: c.year || new Date().getFullYear(),
          powertrain: c.powertrain || 'ICE',
          odometer: c.odometer || 0,
          siteId: c.siteId || siteId,
          siteName: c.siteName || 'Booran Motors',
          roNumber: c.roNumber,
          claimNumber: c.claimNumber,
          concernTitle: c.concernTitle,
          warrantyStatus:
            c.status === 'Flagged' || c.status === 'Awaiting Review' || c.status === 'Draft'
              ? 'Active Claim'
              : c.status === 'Submitted'
              ? 'Complete'
              : 'Under Warranty',
          caseCount: 1,
          latestCase: c,
        });
      }
    }

    return Array.from(vehicleMap.values());
  },
};
