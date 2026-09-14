export interface VinParseResult {
  vin: string;
  isValidLength: boolean;
  isValidCharacters: boolean;
  confidence: number;
}

export interface OdometerParseResult {
  reading: number;
  unit: 'km' | 'mi';
  confidence: number;
}

export const ocrService = {
  /**
   * Sanitizes and extracts 17-character VIN string from OCR raw text
   */
  extractVin: (rawText: string): VinParseResult => {
    if (!rawText) {
      return { vin: '', isValidLength: false, isValidCharacters: false, confidence: 0 };
    }

    // Replace common OCR confusion characters in VIN context
    const clean = rawText
      .toUpperCase()
      .replace(/[\s\-_.:]/g, '');

    // VIN regex: 17 characters excluding I, O, Q
    const vinRegex = /[A-HJ-NPR-Z0-9]{17}/;
    const match = clean.match(vinRegex);

    if (match) {
      const vin = match[0];
      return {
        vin,
        isValidLength: true,
        isValidCharacters: true,
        confidence: 0.95,
      };
    }

    // Partial fallback for dirty/cropped labels
    const partial = clean.replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
    return {
      vin: partial,
      isValidLength: partial.length === 17,
      isValidCharacters: !/[IOQ]/.test(partial),
      confidence: partial.length === 17 ? 0.8 : 0.4,
    };
  },

  /**
   * Parses numerical odometer cluster mileage
   */
  extractOdometer: (rawText: string): OdometerParseResult => {
    if (!rawText) {
      return { reading: 0, unit: 'km', confidence: 0 };
    }

    const clean = rawText.replace(/,/g, '');
    const numMatch = clean.match(/\b\d{3,6}\b/);

    if (numMatch) {
      const reading = parseInt(numMatch[0], 10);
      const isMiles = /mi|miles/i.test(rawText);
      return {
        reading,
        unit: isMiles ? 'mi' : 'km',
        confidence: 0.92,
      };
    }

    return { reading: 0, unit: 'km', confidence: 0 };
  },

  /**
   * Parses 1D / 2D Barcodes and QR serial codes
   */
  extractBarcodeSerial: (rawBarcode: string): string => {
    if (!rawBarcode) return '';
    // Strip packaging prefixes like P/N, S/N, (1P), (S)
    return rawBarcode
      .replace(/^(\(1P\)|\(S\)|P\/N:|S\/N:|PN:|SN:)/i, '')
      .trim();
  },
};
