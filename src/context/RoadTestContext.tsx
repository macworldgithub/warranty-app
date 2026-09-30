import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { calculateDistanceMeters } from './GeofenceContext';
import { useAuth } from './AuthContext';
import { roadTestService } from '../services/roadtest.service';

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
  status?: string;
  siteId?: string;
  siteName?: string;
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
  siteId?: string;
  siteName?: string;
  routePoints?: RoutePoint[];
}

export const DEFAULT_DEMO_ROUTE: RoutePoint[] = [
  { x: 18, y: 68, speed: 0, latitude: -38.09920, longitude: 145.28130 },
  { x: 18, y: 65, speed: 12, latitude: -38.09878, longitude: 145.28130 },
  { x: 19, y: 58, speed: 28, latitude: -38.09782, longitude: 145.28148 },
  { x: 23, y: 54, speed: 42, latitude: -38.09726, longitude: 145.28217 },
  { x: 31, y: 55, speed: 58, latitude: -38.09740, longitude: 145.28357 },
  { x: 42, y: 62, speed: 64, latitude: -38.09837, longitude: 145.28549 },
  { x: 50, y: 68, speed: 71, latitude: -38.09920, longitude: 145.28688 },
  { x: 62, y: 76, speed: 76, latitude: -38.10031, longitude: 145.28898 },
  { x: 74, y: 79, speed: 68, latitude: -38.10072, longitude: 145.29107 },
  { x: 84, y: 72, speed: 54, latitude: -38.09975, longitude: 145.29282 },
  { x: 80, y: 58, speed: 46, latitude: -38.09782, longitude: 145.29212 },
  { x: 68, y: 44, speed: 62, latitude: -38.09588, longitude: 145.29003 },
  { x: 55, y: 35, speed: 67, latitude: -38.09464, longitude: 145.28776 },
  { x: 44, y: 28, speed: 52, latitude: -38.09367, longitude: 145.28584 },
  { x: 35, y: 24, speed: 48, latitude: -38.09312, longitude: 145.28427 },
  { x: 26, y: 22, speed: 38, latitude: -38.09284, longitude: 145.28269 },
  { x: 21, y: 32, speed: 29, latitude: -38.09422, longitude: 145.28182 },
  { x: 18, y: 48, speed: 22, latitude: -38.09643, longitude: 145.28130 },
  { x: 18, y: 68, speed: 0, latitude: -38.09920, longitude: 145.28130 },
];

export const INITIAL_DEMO_VEHICLES: RoadTestVehicle[] = [
  {
    id: 'veh-byd-1',
    registration: '1BY-9EV',
    repairOrder: 'RO-48901',
    customerName: 'Internal Dealership Fleet',
    make: 'BYD',
    model: 'ATTO 3',
    year: 2024,
    variant: 'Extended',
    colour: 'Surf Blue',
    odometerKm: 3410,
    vin: 'LGXCE43C8P0192831',
    concern: 'Diagnostic pre-delivery verification & telemetry test.',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
  },
  {
    id: 'veh-byd-2',
    registration: '1BY-4EV',
    repairOrder: 'RO-48872',
    customerName: 'Service Fleet',
    make: 'BYD',
    model: 'SEAL',
    year: 2024,
    variant: 'Performance AWD',
    colour: 'Arctic White',
    odometerKm: 1820,
    vin: 'LGXCE43C8P0192452',
    concern: 'Suspension & regenerative braking diagnostic check.',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
  },
  {
    id: 'veh-byd-3',
    registration: 'CRN-882',
    repairOrder: 'RO-48740',
    customerName: 'Demonstrator Vehicle',
    make: 'BYD',
    model: 'Dolphin',
    year: 2023,
    variant: 'Premium',
    colour: 'Coral Pink',
    odometerKm: 8900,
    vin: 'LGXCE43C8P0181734',
    concern: 'Pre-handover road test and wheel alignment validation.',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
  },
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
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
  },
];

export const INITIAL_TRIP_RECORDS: RoadTestTripRecord[] = [
  {
    id: 'trip-figma-1',
    repairOrder: 'RO-48901',
    registration: '1BY-9EV',
    vehicleLabel: '2024 BYD ATTO 3',
    dateLabel: 'Today 4:42 pm',
    startTime: '4:42 pm',
    duration: '18 min',
    distanceKm: 7.4,
    maxSpeedKph: 68,
    outcome: 'Passed',
    technician: 'Shaun H.',
    note: 'Internal test drive completed. All systems and telemetry verified.',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    routePoints: DEFAULT_DEMO_ROUTE,
  },
  {
    id: 'trip-figma-2',
    repairOrder: 'RO-48872',
    registration: '1BY-4EV',
    vehicleLabel: '2024 BYD SEAL',
    dateLabel: 'Today 2:10 pm',
    startTime: '2:10 pm',
    duration: '12 min',
    distanceKm: 4.1,
    maxSpeedKph: 72,
    outcome: 'Passed',
    technician: 'Shaun H.',
    note: 'Drive cycle normal. Regenerative braking verified within threshold.',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    routePoints: DEFAULT_DEMO_ROUTE.slice(0, 10),
  },
  {
    id: 'trip-figma-3',
    repairOrder: 'RO-48740',
    registration: 'CRN-882',
    vehicleLabel: 'BYD Dolphin',
    dateLabel: 'Yesterday',
    startTime: '11:20 am',
    duration: '9 min',
    distanceKm: 3.2,
    maxSpeedKph: 55,
    outcome: 'Passed',
    technician: 'Shaun H.',
    note: 'Internal dealership shakedown test. No steering pull or vibrations detected.',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    routePoints: DEFAULT_DEMO_ROUTE.slice(0, 8),
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
  pendingCompletion: boolean;
  setVehicle: (vehicle: RoadTestVehicle | null) => void;
  setFenceRadius: (radius: number) => void;
  armVehicle: () => void;
  disarmVehicle: () => void;
  startDemoDrive: () => void;
  resetDemo: () => void;
  startLiveDrive: (customVehicle?: Partial<RoadTestVehicle>) => void;
  finishLiveDrive: () => void;
  stopAndSaveDrive: (notes?: string) => Promise<void>;
  saveDiagnosisAndComplete: (data: { outcome: 'Passed' | 'Flagged'; notes: string }) => Promise<void>;
  cancelPendingCompletion: () => void;
  recordLivePoint: (lat: number, lng: number, speedKmh?: number, isInsideFence?: boolean) => void;
  loadVehicleByROOrRego: (query: string) => boolean;
  deleteTripRecord: (id: string) => Promise<void>;
  updateTripRecord: (id: string, updates: Partial<RoadTestTripRecord>) => Promise<void>;
  createManualTripRecord: (trip: Partial<RoadTestTripRecord>) => Promise<void>;
}

const RoadTestContext = createContext<RoadTestContextValue | null>(null);

export function RoadTestProvider({ children }: { children: React.ReactNode }) {
  const { user, activeSiteId } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SERVICE_MANAGER';
  const isClerk = user?.role === 'CLERK';
  const isSingleSiteOperator = !isAdmin && !isClerk;
  const technicianSiteId = activeSiteId || user?.defaultSiteId || user?.authorizedSiteIds?.[0] || 'site_cranbourne_byd';

  const initialVeh = isSingleSiteOperator
    ? INITIAL_DEMO_VEHICLES.find(
        (v) => v.siteId?.toLowerCase() === technicianSiteId.toLowerCase()
      ) || INITIAL_DEMO_VEHICLES[0]
    : INITIAL_DEMO_VEHICLES[0];

  const [vehicle, setVehicle] = useState<RoadTestVehicle | null>(initialVeh);
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
  const [tripRecords, setTripRecords] = useState<RoadTestTripRecord[]>(
    isSingleSiteOperator ? INITIAL_TRIP_RECORDS : []
  );
  const [pendingCompletion, setPendingCompletion] = useState(false);

  const activeDriveIdRef = useRef<string | null>(null);
  const timerRef = useRef<any>(null);
  const liveTimerRef = useRef<any>(null);
  const activeIndexRef = useRef(1);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const movementAnchorRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const speedSamplesRef = useRef<number[]>([]);
  const wasOutsideRef = useRef<boolean>(false);
  const pointsBufferRef = useRef<RoutePoint[]>([DEFAULT_DEMO_ROUTE[0]]);

  // References to state to prevent stale closures
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

  // Synchronize vehicle rooftop when technician profile or site changes
  useEffect(() => {
    if (isSingleSiteOperator) {
      setVehicle((curr) => {
        if (!curr || (curr.siteId && curr.siteId.toLowerCase() !== technicianSiteId.toLowerCase())) {
          return (
            INITIAL_DEMO_VEHICLES.find(
              (v) => v.siteId?.toLowerCase() === technicianSiteId.toLowerCase()
            ) || INITIAL_DEMO_VEHICLES[0]
          );
        }
        return curr;
      });
    }
  }, [isSingleSiteOperator, technicianSiteId]);

  // Load historical drives from backend: scoped to rooftop for technicians,
  // assigned sites for clerks, and all sites for admin/service managers.
  useEffect(() => {
    const queryParams: any = { limit: 50 };
    if (isSingleSiteOperator) {
      queryParams.siteId = technicianSiteId;
    }

    roadTestService.getHistoricalDrives(queryParams)
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        if (items.length > 0) {
          const mapped: RoadTestTripRecord[] = items.map((it: any) => ({
            id: it.id,
            repairOrder: it.repairOrder,
            registration: it.registration,
            vehicleLabel: it.vehicleLabel,
            dateLabel: it.startTime
              ? new Date(it.startTime).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              : 'Recent',
            startTime: it.startTime
              ? new Date(it.startTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
              : '12:00',
            duration: it.duration || '10m 00s',
            distanceKm: it.distanceKm || 0,
            maxSpeedKph: it.maxSpeedKph || 0,
            outcome: it.outcome === 'Flagged' ? 'Flagged' : 'Passed',
            technician: it.technicianName || 'Technician',
            note: it.technicianNotes || 'Road test completed.',
            siteId: it.siteId || technicianSiteId,
            siteName: it.siteName || 'Booran Workshop',
            routePoints: it.routePoints && it.routePoints.length > 0 ? it.routePoints : DEFAULT_DEMO_ROUTE,
          }));
          setTripRecords(mapped);
        } else if (!isSingleSiteOperator) {
          setTripRecords([]);
        }
      })
      .catch((e) => console.log('Historical drives fetch error:', e));
  }, [isSingleSiteOperator, technicianSiteId]);

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
    pointsBufferRef.current = [DEFAULT_DEMO_ROUTE[0]];
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
    setPendingCompletion(false);
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
    pointsBufferRef.current = [DEFAULT_DEMO_ROUTE[0]];
    activeIndexRef.current = 1;
    lastPointRef.current = null;
    wasOutsideRef.current = false;
    setPendingCompletion(false);
  }, [clearTimer]);

  const finishLiveDrive = useCallback(() => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = null;
    setIsLiveDrive(false);
    setTripState('returned');
    setSpeedKph(0);
    setPendingCompletion(true);
  }, []);

  const cancelPendingCompletion = useCallback(() => {
    setPendingCompletion(false);
  }, []);

  const saveDiagnosisAndComplete = useCallback(
    async (data: { outcome: 'Passed' | 'Flagged'; notes: string }) => {
      const v = vehicleRef.current;
      const minutes = Math.floor(elapsedSecRef.current / 60);
      const seconds = elapsedSecRef.current % 60;
      const durationStr = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
      const currentDist = Number(distanceKmRef.current.toFixed(2)) || 0.1;
      const currentMax = Math.round(maxSpeedKphRef.current) || 0;
      const currentPoints = pointsBufferRef.current;

      const techName = user?.name || 'Active Technician';
      const recordId = activeDriveIdRef.current || `trip-${Date.now()}`;

      const newRecord: RoadTestTripRecord = {
        id: recordId,
        repairOrder: v?.repairOrder || 'RO-UNKNOWN',
        registration: v?.registration || 'DEMO',
        vehicleLabel: v ? `${v.year} ${v.make} ${v.model}` : 'Vehicle',
        dateLabel: 'Just now',
        startTime: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        duration: durationStr || '1m 15s',
        distanceKm: currentDist,
        maxSpeedKph: currentMax,
        outcome: data.outcome,
        technician: techName,
        note: data.notes || (data.outcome === 'Flagged' ? 'Fault reproduced on road test.' : 'Road test passed. No anomalies found.'),
        siteId: v?.siteId || technicianSiteId,
        siteName: v?.siteName || 'Booran Workshop',
        routePoints: currentPoints,
      };

      setTripRecords((prev) => [newRecord, ...prev]);
      setPendingCompletion(false);

      // Persist completion to backend
      if (activeDriveIdRef.current) {
        try {
          await roadTestService.completeDrive(activeDriveIdRef.current, {
            duration: durationStr,
            durationSeconds: elapsedSecRef.current,
            distanceKm: currentDist,
            maxSpeedKph: currentMax,
            outcome: data.outcome,
            technicianNotes: data.notes,
            routePoints: currentPoints as any,
            geofenceAutoVerified: true,
          });
        } catch (err) {
          console.warn('Backend completion failed, kept local record:', err);
        }
      }
      activeDriveIdRef.current = null;
    },
    [user, technicianSiteId]
  );

  const deleteTripRecord = useCallback(async (id: string) => {
    setTripRecords((prev) => prev.filter((t) => t.id !== id));
    try {
      await roadTestService.deleteTrip(id);
    } catch (err) {
      console.warn('Backend delete trip failed:', err);
    }
  }, []);

  const updateTripRecord = useCallback(async (id: string, updates: Partial<RoadTestTripRecord>) => {
    setTripRecords((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    try {
      await roadTestService.updateTrip(id, {
        repairOrder: updates.repairOrder,
        registration: updates.registration,
        vehicleLabel: updates.vehicleLabel,
        outcome: updates.outcome,
        technicianNotes: updates.note,
        duration: updates.duration,
        distanceKm: updates.distanceKm,
        maxSpeedKph: updates.maxSpeedKph,
      });
    } catch (err) {
      console.warn('Backend update trip failed:', err);
    }
  }, []);

  const createManualTripRecord = useCallback(async (trip: Partial<RoadTestTripRecord>) => {
    const id = trip.id || `TD-${Date.now().toString(36).toUpperCase()}`;
    const newRecord: RoadTestTripRecord = {
      id,
      repairOrder: trip.repairOrder || 'RO-MANUAL',
      registration: trip.registration || 'REGO-000',
      vehicleLabel: trip.vehicleLabel || 'Client Vehicle',
      dateLabel: 'Today',
      startTime: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      duration: trip.duration || '10m 00s',
      distanceKm: trip.distanceKm ?? 5.0,
      maxSpeedKph: trip.maxSpeedKph ?? 65,
      outcome: trip.outcome || 'Passed',
      technician: trip.technician || user?.name || 'Technician',
      note: trip.note || 'Diagnostic test drive completed.',
      siteId: trip.siteId || technicianSiteId,
      siteName: trip.siteName || vehicleRef.current?.siteName || 'Booran Workshop',
      routePoints: DEFAULT_DEMO_ROUTE,
    };

    setTripRecords((prev) => [newRecord, ...prev]);

    try {
      await roadTestService.createTrip({
        repairOrder: newRecord.repairOrder,
        registration: newRecord.registration,
        vehicleLabel: newRecord.vehicleLabel,
        outcome: newRecord.outcome,
        technicianNotes: newRecord.note,
        technicianName: newRecord.technician,
        technicianId: user?.id,
        siteId: newRecord.siteId || technicianSiteId,
        siteName: newRecord.siteName,
        duration: newRecord.duration,
        distanceKm: newRecord.distanceKm,
        maxSpeedKph: newRecord.maxSpeedKph,
      });
    } catch (err) {
      console.warn('Backend create manual trip failed:', err);
    }
  }, [user, technicianSiteId]);

  const stopAndSaveDrive = useCallback(
    async (notes?: string) => {
      clearTimer();
      setIsLiveDrive(false);
      setDemoRunning(false);
      setTripState('returned');
      setSpeedKph(0);

      const v = vehicleRef.current;
      const minutes = Math.floor(elapsedSecRef.current / 60);
      const seconds = elapsedSecRef.current % 60;
      const durationStr = minutes > 0 ? `${minutes} min` : `${seconds}s`;
      const currentDist = Number(distanceKmRef.current.toFixed(1)) || 0.1;
      const currentMax = Math.round(maxSpeedKphRef.current) || 0;
      const currentPoints = pointsBufferRef.current.length > 0 ? [...pointsBufferRef.current] : DEFAULT_DEMO_ROUTE;

      const techName = user?.name || 'Active Technician';
      const recordId = activeDriveIdRef.current || `trip-${Date.now()}`;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

      const newRecord: RoadTestTripRecord = {
        id: recordId,
        repairOrder: v?.repairOrder || 'RO-INTERNAL',
        registration: v?.registration || '1BY-9EV',
        vehicleLabel: v ? `${v.year} ${v.make} ${v.model}` : '2024 BYD ATTO 3',
        dateLabel: `Today ${timeStr}`,
        startTime: timeStr,
        duration: durationStr,
        distanceKm: currentDist,
        maxSpeedKph: currentMax,
        outcome: 'Passed',
        technician: techName,
        note: notes || 'Internal test drive completed.',
        siteId: v?.siteId || technicianSiteId,
        siteName: v?.siteName || 'Booran BYD Cranbourne',
        routePoints: currentPoints,
      };

      setTripRecords((prev) => [newRecord, ...prev]);
      setPendingCompletion(false);

      if (activeDriveIdRef.current) {
        try {
          await roadTestService.completeDrive(activeDriveIdRef.current, {
            duration: durationStr,
            durationSeconds: elapsedSecRef.current,
            distanceKm: currentDist,
            maxSpeedKph: currentMax,
            outcome: 'Passed',
            technicianNotes: notes || 'Internal test drive completed.',
            routePoints: currentPoints as any,
            geofenceAutoVerified: true,
          });
        } catch (err) {
          console.warn('Backend complete drive failed:', err);
        }
      }
      activeDriveIdRef.current = null;
    },
    [clearTimer, user, technicianSiteId]
  );

  const startLiveDrive = useCallback((customVehicle?: Partial<RoadTestVehicle>) => {
    clearTimer();
    setDemoRunning(false);
    setIsLiveDrive(true);
    setArmed(true);
    setTripState('outside');
    setElapsedSec(0);
    setDistanceKm(0);
    setSpeedKph(0);
    setMaxSpeedKph(0);

    if (customVehicle) {
      const merged: RoadTestVehicle = {
        ...(vehicleRef.current || INITIAL_DEMO_VEHICLES[0]),
        ...customVehicle,
      };
      setVehicle(merged);
      vehicleRef.current = merged;
    }

    setRoutePoints([]);
    pointsBufferRef.current = [];
    movementAnchorRef.current = null;
    speedSamplesRef.current = [];
    lastPointRef.current = null;
    wasOutsideRef.current = false;
    distanceKmRef.current = 0;
    maxSpeedKphRef.current = 0;
    setPendingCompletion(false);

    const v = vehicleRef.current;
    if (v) {
      roadTestService
        .startDrive({
          repairOrder: v.repairOrder,
          registration: v.registration,
          vin: v.vin,
          vehicleLabel: `${v.year} ${v.make} ${v.model} ${v.variant}`,
          make: v.make,
          model: v.model,
          year: v.year,
          variant: v.variant,
          colour: v.colour,
          odometerKm: v.odometerKm,
          customerName: v.customerName,
          customerConcern: v.concern,
          technicianId: user?.id || 'tech_byd_01',
          technicianName: user?.name || 'Shaun H.',
          siteId: v.siteId || technicianSiteId,
          isLiveGps: true,
        })
        .then((res) => {
          if (res && res.id) {
            activeDriveIdRef.current = res.id;
          }
        })
        .catch((e) => console.log('Could not start live drive on server:', e));
    }

    liveTimerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
  }, [clearTimer, user, technicianSiteId]);

  const recordLivePoint = useCallback(
    (lat: number, lng: number, speedKmh?: number, isInsideFence?: boolean) => {
      const now = Date.now();
      const nativeSpeed = typeof speedKmh === 'number' && speedKmh > 0 ? Math.round(speedKmh) : 0;
      let calculatedSpeed = 0;

      if (!movementAnchorRef.current) {
        movementAnchorRef.current = { lat, lng, time: now };
      } else {
        const dtSec = (now - movementAnchorRef.current.time) / 1000;
        const incMeters = calculateDistanceMeters(
          movementAnchorRef.current.lat,
          movementAnchorRef.current.lng,
          lat,
          lng
        );

        // Movement threshold (>= 1.5m to eliminate stationary jitter)
        if (incMeters >= 1.5 && incMeters <= 5000) {
          setDistanceKm((prev) => {
            const next = Number((prev + incMeters / 1000).toFixed(2));
            distanceKmRef.current = next;
            return next;
          });

          if (dtSec >= 0.5) {
            calculatedSpeed = Math.round((incMeters / dtSec) * 3.6);
            if (calculatedSpeed > 160) calculatedSpeed = 0; // Filter impossible GPS telemetry jump
          }
          movementAnchorRef.current = { lat, lng, time: now };
        } else if (dtSec > 3.5) {
          // Stationary for > 3.5 seconds: advance anchor so distance does not accumulate drift
          movementAnchorRef.current = { lat, lng, time: now };
        }
      }

      // Select most accurate instantaneous speed reading
      let rawSpeed = 0;
      if (nativeSpeed > 0 && calculatedSpeed > 0) {
        rawSpeed = Math.round((nativeSpeed + calculatedSpeed) / 2);
      } else if (nativeSpeed > 0) {
        rawSpeed = nativeSpeed;
      } else if (calculatedSpeed > 0) {
        rawSpeed = calculatedSpeed;
      }

      // Smooth with rolling window (last 3 samples)
      if (rawSpeed > 0) {
        speedSamplesRef.current.push(rawSpeed);
        if (speedSamplesRef.current.length > 3) speedSamplesRef.current.shift();
      } else {
        if (speedSamplesRef.current.length > 0) {
          speedSamplesRef.current.shift();
        }
      }

      const smoothedSpeed = speedSamplesRef.current.length > 0
        ? Math.round(speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length)
        : 0;

      setSpeedKph(smoothedSpeed);
      if (smoothedSpeed > 0) {
        setMaxSpeedKph((prev) => {
          const nextMax = Math.max(prev, smoothedSpeed);
          maxSpeedKphRef.current = nextMax;
          return nextMax;
        });
      }

      // Project real (lat, lng) to SVG map coordinates (0-100) centered around Cranbourne (18, 68)
      const siteLat = -38.0992;
      const siteLng = 145.2813;
      const dx = (lng - siteLng) * 111320 * Math.cos((siteLat * Math.PI) / 180);
      const dy = (lat - siteLat) * 111320;
      const svgX = Math.max(2, Math.min(98, 18 + dx / 15.38));
      const svgY = Math.max(2, Math.min(98, 68 - dy / 15.38));

      const newPoint: RoutePoint = {
        x: svgX,
        y: svgY,
        speed: smoothedSpeed,
        latitude: lat,
        longitude: lng,
      };

      pointsBufferRef.current.push(newPoint);

      setRoutePoints((prev) => {
        const next = [...prev, newPoint];
        return next.length > 400 ? next.slice(next.length - 400) : next;
      });

      // Stream to backend periodically (every 5 points)
      if (activeDriveIdRef.current && pointsBufferRef.current.length % 5 === 0) {
        const batch = pointsBufferRef.current.slice(-5);
        roadTestService.sendTelemetryBatch(activeDriveIdRef.current, batch as any).catch(() => {});
      }

      // Real-time Geofence Boundary Transition:
      if (isInsideFence === false) {
        wasOutsideRef.current = true;
        setTripState('outside');
      } else if (isInsideFence === true && wasOutsideRef.current) {
        // Automatic Return only if trip genuinely progressed (>200m or >60s)
        if (distanceKmRef.current >= 0.2 || elapsedSecRef.current >= 60) {
          finishLiveDrive();
        }
      }
    },
    [finishLiveDrive]
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
    pointsBufferRef.current = [DEFAULT_DEMO_ROUTE[0]];
    activeIndexRef.current = 1;
    setPendingCompletion(false);

    const v = vehicleRef.current;
    if (v) {
      roadTestService
        .startDrive({
          repairOrder: v.repairOrder,
          registration: v.registration,
          vin: v.vin,
          vehicleLabel: `${v.year} ${v.make} ${v.model} ${v.variant}`,
          make: v.make,
          model: v.model,
          year: v.year,
          variant: v.variant,
          colour: v.colour,
          odometerKm: v.odometerKm,
          customerName: v.customerName,
          customerConcern: v.concern,
          technicianId: user?.id || 'tech_byd_01',
          technicianName: user?.name || 'Active Technician',
          siteId: v.siteId || technicianSiteId,
          isLiveGps: false,
        })
        .then((res) => {
          if (res && res.id) {
            activeDriveIdRef.current = res.id;
          }
        })
        .catch((e) => console.log('Could not start demo drive on server:', e));
    }

    timerRef.current = setInterval(() => {
      const idx = activeIndexRef.current;
      const targetPoint = DEFAULT_DEMO_ROUTE[idx];

      if (!targetPoint) {
        clearTimer();
        setDemoRunning(false);
        setTripState('returned');
        setSpeedKph(0);
        setPendingCompletion(true);
        return;
      }

      pointsBufferRef.current.push(targetPoint);
      setRoutePoints((prev) => [...prev, targetPoint]);
      setSpeedKph(targetPoint.speed);
      setMaxSpeedKph((prev) => Math.max(prev, targetPoint.speed));
      setElapsedSec((prev) => prev + 4);
      setDistanceKm((prev) => Number((prev + targetPoint.speed * 0.0011).toFixed(1)));

      activeIndexRef.current += 1;
    }, 850);
  }, [armed, clearTimer, user, technicianSiteId]);

  const loadVehicleByROOrRego = useCallback(
    (query: string) => {
      const q = query.trim().toUpperCase();
      if (!q) return false;
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

      // Dynamic vehicle creation for any entered RO or plate
      const isRo = q.startsWith('RO') || /^\d+$/.test(q);
      const customVeh: RoadTestVehicle = {
        id: `veh-${Date.now()}`,
        registration: isRo ? 'VIC 888' : q,
        repairOrder: isRo ? (q.startsWith('RO-') ? q : `RO-${q}`) : `RO-${Math.floor(40000 + Math.random() * 9999)}`,
        customerName: 'Customer Vehicle',
        make: 'BYD',
        model: 'Seal',
        year: 2024,
        variant: 'AWD Performance',
        colour: 'Aurora White',
        odometerKm: 28400,
        vin: `6G1MK5E37LL${Math.floor(100000 + Math.random() * 899999)}`,
        concern: 'Customer reported diagnostic drivability concern for warranty verification.',
        siteId: technicianSiteId,
        siteName: vehicleRef.current?.siteName || 'Booran Workshop',
      };
      setVehicle(customVeh);
      armVehicle();
      return true;
    },
    [armVehicle, technicianSiteId]
  );

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
        pendingCompletion,
        setVehicle,
        setFenceRadius,
        armVehicle,
        disarmVehicle,
        startDemoDrive,
        resetDemo,
        startLiveDrive,
        finishLiveDrive,
        stopAndSaveDrive,
        saveDiagnosisAndComplete,
        cancelPendingCompletion,
        recordLivePoint,
        loadVehicleByROOrRego,
        deleteTripRecord,
        updateTripRecord,
        createManualTripRecord,
      }}
    >
      {children}
    </RoadTestContext.Provider>
  );
}

export const useRoadTest = () => {
  const context = useContext(RoadTestContext);
  if (!context) {
    throw new Error('useRoadTest must be used within a RoadTestProvider');
  }
  return context;
};
