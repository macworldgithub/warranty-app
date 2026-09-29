import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { calculateDistanceMeters } from './GeofenceContext';

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
  latitude?: number;
  longitude?: number;
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
  isLiveDrive: boolean;
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
  startLiveDrive: () => void;
  finishLiveDrive: () => void;
  recordLivePoint: (lat: number, lng: number, speedKmh?: number, isInsideFence?: boolean) => void;
  loadVehicleByROOrRego: (query: string) => boolean;
}

const RoadTestContext = createContext<RoadTestContextValue | null>(null);

export function RoadTestProvider({ children }: { children: React.ReactNode }) {
  const [vehicle, setVehicle] = useState<RoadTestVehicle | null>(INITIAL_DEMO_VEHICLES[0]);
  const [armed, setArmed] = useState(true);
  const [tripState, setTripState] = useState<TripState>('inside');
  const [demoRunning, setDemoRunning] = useState(false);
  const [isLiveDrive, setIsLiveDrive] = useState(false);
  const [speedKph, setSpeedKph] = useState(0);
  const [maxSpeedKph, setMaxSpeedKph] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [fenceRadius, setFenceRadius] = useState(180);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([DEFAULT_DEMO_ROUTE[0]]);
  const [tripRecords, setTripRecords] = useState<RoadTestTripRecord[]>(INITIAL_TRIP_RECORDS);

  const timerRef = useRef<any>(null);
  const liveTimerRef = useRef<any>(null);
  const activeIndexRef = useRef(1);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const wasOutsideRef = useRef<boolean>(false);

  // References to state to prevent stale closures in finishLiveDrive
  const elapsedSecRef = useRef(0);
  const distanceKmRef = useRef(0);
  const maxSpeedKphRef = useRef(0);
  const vehicleRef = useRef<RoadTestVehicle | null>(vehicle);

  useEffect(() => {
    elapsedSecRef.current = elapsedSec;
  }, [elapsedSec]);

  useEffect(() => {
    distanceKmRef.current = distanceKm;
  }, [distanceKm]);

  useEffect(() => {
    maxSpeedKphRef.current = maxSpeedKph;
  }, [maxSpeedKph]);

  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = null;
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
    lastPointRef.current = null;
    wasOutsideRef.current = false;
  }, []);

  const disarmVehicle = useCallback(() => {
    clearTimer();
    setDemoRunning(false);
    setIsLiveDrive(false);
    setArmed(false);
    setTripState('inside');
    setSpeedKph(0);
  }, [clearTimer]);

  const resetDemo = useCallback(() => {
    clearTimer();
    setDemoRunning(false);
    setIsLiveDrive(false);
    setArmed(true);
    setTripState('inside');
    setSpeedKph(0);
    setMaxSpeedKph(0);
    setElapsedSec(0);
    setDistanceKm(0);
    setRoutePoints([DEFAULT_DEMO_ROUTE[0]]);
    activeIndexRef.current = 1;
    lastPointRef.current = null;
    wasOutsideRef.current = false;
  }, [clearTimer]);

  const finishLiveDrive = useCallback(() => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = null;
    setIsLiveDrive(false);
    setTripState('returned');
    setSpeedKph(0);

    const v = vehicleRef.current;
    if (v) {
      const minutes = Math.floor(elapsedSecRef.current / 60);
      const seconds = elapsedSecRef.current % 60;
      const durationStr = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
      const currentDist = distanceKmRef.current;
      const currentMax = maxSpeedKphRef.current;

      const newRecord: RoadTestTripRecord = {
        id: `trip-${Date.now()}`,
        repairOrder: v.repairOrder,
        registration: v.registration,
        vehicleLabel: `${v.year} ${v.make} ${v.model}`,
        dateLabel: 'Just now',
        startTime: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        duration: durationStr || '1m 15s',
        distanceKm: Number(currentDist.toFixed(2)) || 0.1,
        maxSpeedKph: Math.round(currentMax) || 0,
        outcome: currentMax > 105 ? 'Flagged' : 'Passed',
        technician: 'Active Technician (Live GPS)',
        note: `Live GPS road test completed. Logged ${currentDist.toFixed(1)} km, Max Speed: ${Math.round(currentMax)} km/h. Dealer perimeter return auto-verified.`,
      };
      setTripRecords((prev) => [newRecord, ...prev]);
    }
  }, []);

  const startLiveDrive = useCallback(() => {
    clearTimer();
    setDemoRunning(false);
    setIsLiveDrive(true);
    setArmed(true);
    setTripState('inside');
    setElapsedSec(0);
    setDistanceKm(0);
    setSpeedKph(0);
    setMaxSpeedKph(0);
    setRoutePoints([{ x: 18, y: 68, speed: 0 }]);
    lastPointRef.current = null;
    wasOutsideRef.current = false;

    liveTimerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  const recordLivePoint = useCallback(
    (lat: number, lng: number, speedKmh?: number, isInsideFence?: boolean) => {
      const currentSpeed = speedKmh !== undefined && speedKmh > 0 ? Math.round(speedKmh) : 0;
      setSpeedKph(currentSpeed);
      setMaxSpeedKph((prev) => Math.max(prev, currentSpeed));

      if (lastPointRef.current) {
        const incMeters = calculateDistanceMeters(
          lastPointRef.current.lat,
          lastPointRef.current.lng,
          lat,
          lng,
        );
        if (incMeters >= 3 && incMeters <= 500) {
          setDistanceKm((prev) => Number((prev + incMeters / 1000).toFixed(2)));
        }
      }
      lastPointRef.current = { lat, lng };

      // Project real (lat, lng) to SVG map coordinates (0-100) centered around Cranbourne (18, 68)
      const siteLat = -38.0992;
      const siteLng = 145.2813;
      const dx = (lng - siteLng) * 111320 * Math.cos((siteLat * Math.PI) / 180);
      const dy = (lat - siteLat) * 111320;
      const svgX = Math.max(2, Math.min(98, 18 + dx / 15.38));
      const svgY = Math.max(2, Math.min(98, 68 - dy / 15.38));

      setRoutePoints((prev) => {
        const next = [...prev, { x: svgX, y: svgY, speed: currentSpeed, latitude: lat, longitude: lng }];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });

      // Real-time Geofence Boundary Transition:
      if (isInsideFence === false) {
        wasOutsideRef.current = true;
        setTripState('outside');
      } else if (isInsideFence === true && wasOutsideRef.current) {
        // Automatic Return: Technician drove back inside dealership perimeter
        finishLiveDrive();
      }
    },
    [finishLiveDrive],
  );

  const startDemoDrive = useCallback(() => {
    if (!armed) setArmed(true);
    clearTimer();
    setIsLiveDrive(false);
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
        clearTimer();
        setDemoRunning(false);
        setTripState('returned');
        setSpeedKph(0);

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
            technician: 'Active Technician (Simulation)',
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
        isLiveDrive,
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
        startLiveDrive,
        finishLiveDrive,
        recordLivePoint,
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
