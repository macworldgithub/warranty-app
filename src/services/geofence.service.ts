import { apiClient } from '../api/client';

export interface PingTelemetryDto {
  technicianId: string;
  technicianName?: string;
  siteId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speedKmh?: number;
  currentActivity?: 'INSPECTION' | 'ROAD_TEST' | 'WORKSHOP' | 'IDLE';
  activeCaseId?: string;
  activeRoNumber?: string;
}

export interface GeofencePingResponse {
  status: 'ON_SITE' | 'OFF_SITE';
  insideGeofence: boolean;
  distanceMeters: number;
  siteId: string;
  siteName: string;
  radiusMeters: number;
  presence: {
    technicianId: string;
    technicianName: string;
    siteId: string;
    siteName: string;
    status: 'ON_SITE' | 'OFF_SITE';
    distanceMeters: number;
    currentActivity: string;
    speedKmh: number;
    lastPingAt: string;
  };
}

import { ENV } from '../config/env';

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
  timeoutMs = 3000
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

class MobileGeofenceService {
  public async ping(dto: PingTelemetryDto): Promise<GeofencePingResponse> {
    try {
      return await fetchFromCandidates<GeofencePingResponse>(
        '/geofence/ping',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
        3000
      );
    } catch (_err) {
      // Fallback to apiClient default request
      return apiClient.request<GeofencePingResponse>('/geofence/ping', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    }
  }

  public async getSiteRoster(siteId: string) {
    try {
      return await fetchFromCandidates<any>(
        `/geofence/roster/${siteId}`,
        { method: 'GET' },
        3000
      );
    } catch (_err) {
      return apiClient.request(`/geofence/roster/${siteId}`, {
        method: 'GET',
      });
    }
  }

  public async updateSiteRadius(siteId: string, radiusMeters: number) {
    try {
      return await fetchFromCandidates<any>(
        `/sites/${siteId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ geofenceRadiusMeters: radiusMeters }),
        },
        3000
      );
    } catch (_err) {
      return apiClient.request(`/sites/${siteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ geofenceRadiusMeters: radiusMeters }),
      });
    }
  }
}

export const mobileGeofenceService = new MobileGeofenceService();

