/**
 * VIN (Vehicle Identification Number) Utilities
 * Follows ISO 3779 / North American & Australian VIN standard
 */

/**
 * Normalizes VIN string by removing whitespace, hyphens, and converting to uppercase.
 */
export function normalizeVIN(value: string): string {
  if (!value) return '';
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

/**
 * Validates whether a normalized string is a syntactically valid 17-character VIN.
 * Characters I (i), O (o), and Q (q) are prohibited in valid VINs to avoid confusion with 1 and 0.
 */
export function isValidVIN(vin: string): boolean {
  const normalized = normalizeVIN(vin);
  // Standard 17-character VIN format excluding I, O, Q
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(normalized);
}

/**
 * Performs optional check-digit calculation (9th position in North American/ISO standard)
 */
export function validateVinCheckDigit(vin: string): boolean {
  const normalized = normalizeVIN(vin);
  if (!isValidVIN(normalized)) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const charValues: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
    '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = normalized[i];
    const val = charValues[char];
    if (val === undefined) return false;
    sum += val * weights[i];
  }

  const remainder = sum % 11;
  const expectedCheckChar = remainder === 10 ? 'X' : remainder.toString();
  return normalized[8] === expectedCheckChar;
}

/**
 * Extract basic details from VIN WMI (World Manufacturer Identifier)
 */
export function getVinManufacturerHint(vin: string): string {
  const normalized = normalizeVIN(vin);
  if (normalized.startsWith('LGX')) return 'BYD (China/Global)';
  if (normalized.startsWith('KMH') || normalized.startsWith('KM8')) return 'Hyundai';
  if (normalized.startsWith('KNA') || normalized.startsWith('KND')) return 'Kia';
  if (normalized.startsWith('LSJ')) return 'MG (SAIC Motor)';
  if (normalized.startsWith('LVV')) return 'Chery';
  if (normalized.startsWith('JMB') || normalized.startsWith('MMB')) return 'Mitsubishi';
  if (normalized.startsWith('JN1') || normalized.startsWith('MNT')) return 'Nissan';
  if (normalized.startsWith('MP1')) return 'Isuzu UTE';
  if (normalized.startsWith('TMB')) return 'Škoda';
  if (normalized.startsWith('JSA') || normalized.startsWith('TSM')) return 'Suzuki';
  if (normalized.startsWith('6FP') || normalized.startsWith('1FT') || normalized.startsWith('WF0')) return 'Ford';
  if (normalized.startsWith('6T1') || normalized.startsWith('JT2') || normalized.startsWith('MR0')) return 'Toyota';
  return 'Standard Multi-Brand OEM';
}
