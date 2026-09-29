import { apiClient } from '../api/client';
import { ENV } from '../config/env';

export interface StartTestDrivePayload {
  repairOrder: string;
  registration: string;
  vin?: string;
  vehicleLabel?: string;
  make?: string;
  model?: string;
  year?: number;
  variant?: string;
  colour?: string;
  odometerKm?: number;
  customerName?: string;
  customerConcern?: string;
  technicianId: string;
  technicianName?: string;
  siteId?: string;
  isLiveGps?: boolean;
}

export interface TelemetryPointPayload {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp?: number;
  x?: number;
  y?: number;
  isInsideFence?: boolean;
}

export interface CompleteTestDrivePayload {
  duration?: string;
  durationSeconds?: number;
  distanceKm?: number;
  maxSpeedKph?: number;
  avgSpeedKph?: number;
  outcome: 'Passed' | 'Flagged';
  technicianNotes?: string;
  routePoints?: TelemetryPointPayload[];
  geofenceAutoVerified?: boolean;
}

const CANDIDATE_URL_BASES = [
  ENV.API_URL,
  'http://localhost:4000/api/v1',
  'http://127.0.0.1:4000/api/v1',
  'http://10.0.2.2:4000/api/v1',
  'http://192.168.100.33:4000/api/v1',
];

async function fetchFromCandidates<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<T> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const requests = CANDIDATE_URL_BASES.map(async (base) => {
    const url = `${base.replace(/\/+$/, '')}${cleanPath}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  });

  return await Promise.any(requests);
}

class RoadTestService {
  public async startDrive(payload: StartTestDrivePayload): Promise<any> {
    try {
      return await fetchFromCandidates<any>(
        '/test-drives/start',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        4000
      );
    } catch (_err) {
      return apiClient.request<any>('/test-drives/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  }

  public async sendTelemetryBatch(driveId: string, points: TelemetryPointPayload[]): Promise<any> {
    try {
      return await fetchFromCandidates<any>(
        `/test-drives/${driveId}/points`,
        {
          method: 'POST',
          body: JSON.stringify({ points }),
        },
        3000
      );
    } catch (_err) {
      return apiClient.request<any>(`/test-drives/${driveId}/points`, {
        method: 'POST',
        body: JSON.stringify({ points }),
      });
    }
  }

  public async completeDrive(driveId: string, payload: CompleteTestDrivePayload): Promise<any> {
    try {
      return await fetchFromCandidates<any>(
        `/test-drives/${driveId}/complete`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        5000
      );
    } catch (_err) {
      return apiClient.request<any>(`/test-drives/${driveId}/complete`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  }

  public async getHistoricalDrives(params?: {
    siteId?: string;
    technicianId?: string;
    outcome?: string;
    limit?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.set(k, String(v));
        }
      });
    }

    try {
      return await fetchFromCandidates<any>(
        `/test-drives?${query.toString()}`,
        { method: 'GET' },
        4000
      );
    } catch (_err) {
      return apiClient.request<any>(`/test-drives?${query.toString()}`, {
        method: 'GET',
      });
    }
  }

  public async createTrip(payload: any): Promise<any> {
    try {
      return await fetchFromCandidates<any>(
        '/test-drives',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        5000
      );
    } catch (_err) {
      return apiClient.request<any>('/test-drives', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  }

  public async updateTrip(id: string, payload: any): Promise<any> {
    try {
      return await fetchFromCandidates<any>(
        `/test-drives/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        5000
      );
    } catch (_err) {
      return apiClient.request<any>(`/test-drives/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
  }

  public async deleteTrip(id: string): Promise<any> {
    try {
      return await fetchFromCandidates<any>(
        `/test-drives/${id}`,
        { method: 'DELETE' },
        4000
      );
    } catch (_err) {
      return apiClient.request<any>(`/test-drives/${id}`, {
        method: 'DELETE',
      });
    }
  }
}

export const roadTestService = new RoadTestService();
