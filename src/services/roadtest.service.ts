import { apiClient } from '../api/client';

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

class RoadTestService {
  public async startDrive(payload: StartTestDrivePayload): Promise<any> {
    return apiClient.post<any>('/test-drives/start', payload);
  }

  public async sendTelemetryBatch(driveId: string, points: TelemetryPointPayload[]): Promise<any> {
    return apiClient.post<any>(`/test-drives/${driveId}/points`, { points });
  }

  public async completeDrive(driveId: string, payload: CompleteTestDrivePayload): Promise<any> {
    return apiClient.post<any>(`/test-drives/${driveId}/complete`, payload);
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

    const qs = query.toString();
    return apiClient.get<any>(`/test-drives${qs ? `?${qs}` : ''}`);
  }

  public async createTrip(payload: any): Promise<any> {
    return apiClient.post<any>('/test-drives', payload);
  }

  public async updateTrip(id: string, payload: any): Promise<any> {
    return apiClient.put<any>(`/test-drives/${id}`, payload);
  }

  public async deleteTrip(id: string): Promise<any> {
    return apiClient.delete<any>(`/test-drives/${id}`);
  }
}

export const roadTestService = new RoadTestService();
