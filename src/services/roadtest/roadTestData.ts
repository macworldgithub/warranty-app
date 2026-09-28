import { RoadTestVehicle, TripRecord, RoutePoint, LookupMode } from '../../types/roadTest';

export const DEFAULT_VEHICLES: RoadTestVehicle[] = [
  {
    id: 'veh-rav4',
    registration: 'SGS 274',
    customerNumber: 'C-10482',
    customerName: 'Sarah Chen',
    vin: 'JTMRW3FV60D145832',
    repairOrder: 'RO-48291',
    year: 2024,
    make: 'Toyota',
    model: 'RAV4',
    variant: 'Cruiser Hybrid AWD',
    colour: 'Silver Sky',
    odometerKm: 28416,
    serviceAdvisor: 'Mia Johnson',
    concern: 'Intermittent steering vibration at 80–90 km/h under light acceleration',
  },
  {
    id: 'veh-ranger',
    registration: 'GOOD 01',
    customerNumber: 'C-09831',
    customerName: "James O'Connor",
    vin: 'MPBUMFF50PX412607',
    repairOrder: 'RO-48276',
    year: 2023,
    make: 'Ford',
    model: 'Ranger',
    variant: 'Wildtrak 3.0 V6',
    colour: 'Meteor Grey',
    odometerKm: 41702,
    serviceAdvisor: 'Noah Williams',
    concern: 'Confirm brake pedal pulsation after front rotor replacement',
  },
  {
    id: 'veh-cx5',
    registration: 'NXT 538',
    customerNumber: 'C-11207',
    customerName: 'Priya Kapoor',
    vin: 'JM0KF4WLA00391844',
    repairOrder: 'RO-48264',
    year: 2022,
    make: 'Mazda',
    model: 'CX-5',
    variant: 'Akera Turbo AWD',
    colour: 'Soul Red Crystal',
    odometerKm: 53680,
    serviceAdvisor: 'Mia Johnson',
    concern: 'Road test after transmission control module software update',
  },
];

export const INITIAL_TRIPS: TripRecord[] = [
  {
    id: 'trip-48230',
    vehicleId: 'veh-demo-1',
    vehicleLabel: '2023 Kia Sportage GT-Line',
    registration: 'KIA 729',
    repairOrder: 'RO-48230',
    dateLabel: 'Today',
    startTime: '10:14 am',
    duration: '14m 22s',
    distanceKm: 8.7,
    maxSpeedKph: 72,
    avgSpeedKph: 36,
    technician: 'Marcus Vance',
    outcome: 'Completed',
    note: 'Transmission shift pattern verified under normal load. No abnormal flare detected.',
  },
  {
    id: 'trip-48209',
    vehicleId: 'veh-demo-2',
    vehicleLabel: '2022 Mitsubishi Outlander Exceed',
    registration: 'MTS 481',
    repairOrder: 'RO-48209',
    dateLabel: 'Yesterday',
    startTime: '3:45 pm',
    duration: '09m 40s',
    distanceKm: 5.2,
    maxSpeedKph: 81,
    avgSpeedKph: 32,
    technician: 'Marcus Vance',
    outcome: 'Flagged',
    note: 'Vibration reproduced between 76–82 km/h. Returned to technician bay for inspection.',
  },
  {
    id: 'trip-48164',
    vehicleId: 'veh-demo-3',
    vehicleLabel: '2024 Hyundai Tucson Elite',
    registration: 'HYU 319',
    repairOrder: 'RO-48164',
    dateLabel: '19 Sep',
    startTime: '11:06 am',
    duration: '11m 51s',
    distanceKm: 6.1,
    maxSpeedKph: 67,
    avgSpeedKph: 31,
    technician: 'Alex Morgan',
    outcome: 'Completed',
    note: 'ADAS calibration verification completed successfully on the approved route.',
  },
];

export const DEMO_ROUTE: RoutePoint[] = [
  { x: 18, y: 68, speed: 0, distance: 0 },
  { x: 25, y: 66, speed: 14, distance: 0.2 },
  { x: 35, y: 59, speed: 32, distance: 0.7 },
  { x: 46, y: 53, speed: 48, distance: 1.3 },
  { x: 57, y: 46, speed: 61, distance: 2.0 },
  { x: 67, y: 38, speed: 78, distance: 2.8 },
  { x: 78, y: 31, speed: 86, distance: 3.7 },
  { x: 84, y: 39, speed: 71, distance: 4.3 },
  { x: 79, y: 49, speed: 57, distance: 4.8 },
  { x: 69, y: 58, speed: 44, distance: 5.3 },
  { x: 57, y: 64, speed: 38, distance: 5.8 },
  { x: 43, y: 70, speed: 31, distance: 6.3 },
  { x: 31, y: 74, speed: 22, distance: 6.7 },
  { x: 23, y: 72, speed: 9, distance: 6.9 },
  { x: 18, y: 68, speed: 0, distance: 7.0 },
];

const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function lookupVehicleInList(list: RoadTestVehicle[], mode: LookupMode, value: string): RoadTestVehicle | undefined {
  const needle = normalize(value);
  if (!needle) return undefined;

  const key: Record<LookupMode, keyof RoadTestVehicle> = {
    registration: 'registration',
    customer: 'customerNumber',
    vin: 'vin',
    repairOrder: 'repairOrder',
  };

  return list.find((v) => normalize(String(v[key[mode]])).includes(needle));
}

export const formatClock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};
