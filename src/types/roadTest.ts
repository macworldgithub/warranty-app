export type LookupMode = 'registration' | 'customer' | 'vin' | 'repairOrder';

export type RoadTestVehicle = {
  id: string;
  registration: string;
  customerNumber: string;
  customerName: string;
  vin: string;
  repairOrder: string;
  year: number;
  make: string;
  model: string;
  variant: string;
  colour: string;
  odometerKm: number;
  serviceAdvisor: string;
  concern: string;
};

export type TripRecord = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  registration: string;
  repairOrder: string;
  dateLabel: string;
  startTime: string;
  duration: string;
  distanceKm: number;
  maxSpeedKph: number;
  avgSpeedKph: number;
  technician: string;
  outcome: 'Completed' | 'Flagged';
  note: string;
};

export type TripState = 'inside' | 'outside' | 'returned';
export type PermissionState = 'not_requested' | 'requesting' | 'enabled' | 'foreground_only' | 'denied' | 'unavailable';

export type RoutePoint = {
  x: number;
  y: number;
  speed: number;
  distance: number;
};
