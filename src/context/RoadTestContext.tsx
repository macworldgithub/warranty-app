import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

export type TripState = 'inside' | 'outside' | 'returned';

export interface RoadTestVehicle {
  id: string;
  registration: string;
  repairOrder: string;
  customerName: string;
  make: string;
  model: string;
  year: number;
  variant: string;
  colour: string;
  odometerKm: number;
  vin: string;
  concern: string;
}

export interface RoutePoint {
  x: number;
  y: number;
  speed: number;
}

export interface RoadTestTripRecord {
  id: string;
  repairOrder: string;
  registration: string;
  vehicleLabel: string;
  dateLabel: string;
  startTime: string;
  duration: string;
  distanceKm: number;
  maxSpeedKph: number;
  outcome: 'Passed' | 'Flagged';
  technician: string;
  note: string;
}

export const DEFAULT_DEMO_ROUTE: RoutePoint[] = [
  { x: 18, y: 68, speed: 0 },
  { x: 18, y: 65, speed: 12 },
  { x: 19, y: 58, speed: 28 },
  { x: 23, y: 54, speed: 42 },
  { x: 31, y: 55, speed: 58 },
  { x: 42, y: 62, speed: 64 },
  { x: 50, y: 68, speed: 71 },
  { x: 62, y: 76, speed: 76 },
  { x: 74, y: 79, speed: 68 },
  { x: 84, y: 72, speed: 54 },
  { x: 80, y: 58, speed: 46 },
  { x: 68, y: 44, speed: 62 },
  { x: 55, y: 35, speed: 67 },
  { x: 44, y: 28, speed: 52 },
  { x: 35, y: 24, speed: 48 },
  { x: 26, y: 22, speed: 38 },
  { x: 21, y: 32, speed: 29 },
  { x: 18, y: 48, speed: 22 },
  { x: 18, y: 68, speed: 0 },
];

export const INITIAL_DEMO_VEHICLES: RoadTestVehicle[] = [
  {
    id: 'veh-1',
    registration: 'SGS 274',
    repairOrder: 'RO-48291',
    customerName: 'Marcus Vance',
    make: 'Holden',
    model: 'Commodore',
    year: 2021,
    variant: 'RS-V Liftback',
    colour: 'Heron White',
    odometerKm: 48210,
    vin: '6G1MK5E37LL194821',
    concern: 'Intermittent shudder under light load at 60–80 km/h after transmission fluid service.',
  },
  {
    id: 'veh-2',
    registration: 'BWM 882',
    repairOrder: 'RO-48305',
    customerName: 'Sarah Jenkins',
    make: 'Hyundai',
    model: 'Tucson',
    year: 2022,
    variant: 'Highlander AWD',
    colour: 'Phantom Black',
    odometerKm: 32150,
    vin: 'KMHJ381BBNU842109',
    concern: 'Rattle from front-right suspension over sharp road joints.',
  },
  {
    id: 'veh-3',
    registration: 'VIC 901',
    repairOrder: 'RO-48319',
    customerName: 'David Chen',
    make: 'Kia',
    model: 'Sportage',
    year: 2023,
    variant: 'GT-Line Diesel',
    colour: 'Steel Grey',
    odometerKm: 18400,
    vin: 'KNAFX81ABPT291048',
    concern: 'Check engine warning lamp illuminated during sustained highway driving.',
  },
];

export const INITIAL_TRIP_RECORDS: RoadTestTripRecord[] = [
  {
    id: 'trip-1',
    repairOrder: 'RO-48291',
    registration: 'SGS 274',
    vehicleLabel: '2021 Holden Commodore RS-V',
    dateLabel: 'Today',
    startTime: '2:18 pm',
    duration: '12m 48s',
    distanceKm: 6.8,
    maxSpeedKph: 76,
    outcome: 'Passed',
    technician: 'Senior Tech (A. Miller)',
    note: 'Shudder duplicated between 64 km/h and 71 km/h on Dandenong Rd test sector. Telemetry confirms lockup clutch slip variance.',
  },
  {
    id: 'trip-2',
    repairOrder: 'RO-48190',
    registration: '1QZ 4AA',
    vehicleLabel: '2022 Hyundai Tucson Highlander',
    dateLabel: 'Yesterday',
    startTime: '10:45 am',
    duration: '15m 12s',
    distanceKm: 9.4,
    maxSpeedKph: 82,
    outcome: 'Passed',
    technician: 'Lead Diagnostics Tech',
    note: 'Post-sway bar bushing replacement check. Noise resolved across all simulated road undulations.',
  },
  {
    id: 'trip-3',
    repairOrder: 'RO-47952',
    registration: 'YTX 108',
    vehicleLabel: '2020 Kia Sorento GT-Line',
    dateLabel: '24 Sep',
    startTime: '4:02 pm',
    duration: '8m 20s',
    distanceKm: 4.2,
    maxSpeedKph: 64,
    outcome: 'Flagged',
    technician: 'Apprentice / Tech 4',
    note: 'Road test terminated early. Intermittent brake shudder flagged for mandatory rotor dial-indicator inspection.',
  },
];

interface RoadTestContextValue {
  vehicle: RoadTestVehicle | null;
  armed: boolean;
  tripState: TripState;
  demoRunning: boolean;
  speedKph: number;
  maxSpeedKph: number;
  elapsedSec: number;
  distanceKm: number;
  routePoints: RoutePoint[];
  fenceRadius: number;
  tripRecords: RoadTestTripRecord[];
  setVehicle: (vehicle: RoadTestVehicle | null) => void;
  setFenceRadius: (radius: number) => void;
  armVehicle: () => void;
  disarmVehicle: () => void;
  startDemoDrive: () => void;
  resetDemo: () => void;
  loadVehicleByROOrRego: (query: string) => boolean;
}

const RoadTestContext = createContext<RoadTestContextValue | null>(null);

export function RoadTestProvider({ children }: { children: React.ReactNode }) {
  const [vehicle, setVehicle] = useState<RoadTestVehicle | null>(INITIAL_DEMO_VEHICLES[0]);
  const [armed, setArmed] = useState(true);
  const [tripState, setTripState] = useState<TripState>('inside');
  const [demoRunning, setDemoRunning] = useState(false);
  const [speedKph, setSpeedKph] = useState(0);
  const [maxSpeedKph, setMaxSpeedKph] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [fenceRadius, setFenceRadius] = useState(180);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([DEFAULT_DEMO_ROUTE[0]]);
  const [tripRecords, setTripRecords] = useState<RoadTestTripRecord[]>(INITIAL_TRIP_RECORDS);

  const timerRef = useRef<any>(null);
  const activeIndexRef = useRef(1);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const armVehicle = useCallback(() => {
    setArmed(true);
    setTripState('inside');
    setSpeedKph(0);
    setMaxSpeedKph(0);
    setElapsedSec(0);
    setDistanceKm(0);
    setRoutePoints([DEFAULT_DEMO_ROUTE[0]]);
    activeIndexRef.current = 1;
  }, []);

  const disarmVehicle = useCallback(() => {
    clearTimer();
    setDemoRunning(false);
    setArmed(false);
    setTripState('inside');
    setSpeedKph(0);
  }, [clearTimer]);

  const resetDemo = useCallback(() => {
    clearTimer();
    setDemoRunning(false);
    setArmed(true);
    setTripState('inside');
    setSpeedKph(0);
    setMaxSpeedKph(0);
    setElapsedSec(0);
    setDistanceKm(0);
    setRoutePoints([DEFAULT_DEMO_ROUTE[0]]);
    activeIndexRef.current = 1;
  }, [clearTimer]);

  const startDemoDrive = useCallback(() => {
    if (!armed) setArmed(true);
    clearTimer();
    setDemoRunning(true);
    setTripState('outside');
    setElapsedSec(0);
    setDistanceKm(0);
    setMaxSpeedKph(0);
    setRoutePoints([DEFAULT_DEMO_ROUTE[0]]);
    activeIndexRef.current = 1;

    timerRef.current = setInterval(() => {
      const idx = activeIndexRef.current;
      const targetPoint = DEFAULT_DEMO_ROUTE[idx];

      if (!targetPoint) {
        // Complete trip
        clearTimer();
        setDemoRunning(false);
        setTripState('returned');
        setSpeedKph(0);

        // Auto-save record
        if (vehicle) {
          const newRecord: RoadTestTripRecord = {
            id: `trip-${Date.now()}`,
            repairOrder: vehicle.repairOrder,
            registration: vehicle.registration,
            vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            dateLabel: 'Just now',
            startTime: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
            duration: '12m 48s',
            distanceKm: 6.8,
            maxSpeedKph: 76,
            outcome: 'Passed',
            technician: 'Active Technician',
            note: 'Automated road test verified via Booran geofence tracking. No boundary violations.',
          };
          setTripRecords((prev) => [newRecord, ...prev]);
        }
        return;
      }

      setRoutePoints((prev) => [...prev, targetPoint]);
      setSpeedKph(targetPoint.speed);
      setMaxSpeedKph((prev) => Math.max(prev, targetPoint.speed));
      setElapsedSec((prev) => prev + 4);
      setDistanceKm((prev) => Number((prev + targetPoint.speed * 0.0011).toFixed(1)));

      activeIndexRef.current += 1;
    }, 850);
  }, [armed, clearTimer, vehicle]);

  const loadVehicleByROOrRego = useCallback((query: string) => {
    const q = query.trim().toUpperCase();
    const found = INITIAL_DEMO_VEHICLES.find(
      (v) =>
        v.repairOrder.toUpperCase().includes(q) ||
        v.registration.toUpperCase().includes(q) ||
        v.vin.toUpperCase().includes(q) ||
        v.customerName.toUpperCase().includes(q)
    );
    if (found) {
      setVehicle(found);
      armVehicle();
      return true;
    }
    return false;
  }, [armVehicle]);

  return (
    <RoadTestContext.Provider
      value={{
        vehicle,
        armed,
        tripState,
        demoRunning,
        speedKph,
        maxSpeedKph,
        elapsedSec,
        distanceKm,
        routePoints,
        fenceRadius,
        tripRecords,
        setVehicle,
        setFenceRadius,
        armVehicle,
        disarmVehicle,
        startDemoDrive,
        resetDemo,
        loadVehicleByROOrRego,
      }}
    >
      {children}
    </RoadTestContext.Provider>
  );
}

export function useRoadTest() {
  const context = useContext(RoadTestContext);
  if (!context) {
    throw new Error('useRoadTest must be used within a RoadTestProvider');
  }
  return context;
}
