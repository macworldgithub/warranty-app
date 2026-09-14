import { apiClient } from './client';
import { DecodeVinResponse } from '../types';

export const vehicleApi = {
  decodeVin: async (vin: string): Promise<DecodeVinResponse> => {
    return apiClient.post<DecodeVinResponse>('/vehicle/decode-vin', { vin });
  },
};
