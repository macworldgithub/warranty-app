import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { RoadTestVehicle, TripRecord, TripState, PermissionState, RoutePoint } from '../types/roadTest';
import { DEFAULT_VEHICLES, INITIAL_TRIPS, DEMO_ROUTE } from '../services/roadtest/roadTestData';

type RoadTestContextValue = {
  vehicle: RoadTestVehicle | null;
  armed: boolean;
  tripState: TripState;
  demoRunning: boolean;
  routeIndex: number;
  speedKph: number;
  maxSpeedKph: number;
  elapsedSec: number;
  distanceKm: number;
  routePoints: RoutePoint[];
  fenceRadius: number;
  permissionState: PermissionState;
  tripRecords: TripRecord[];
  allVehicles: RoadTestVehicle[];
  setVehicle: (vehicle: RoadTestVehicle) => void;
  armCustomVehicle: (custom: Partial<RoadTestVehicle>) => void;
  setFenceRadius: (radius: number) => void;
  armVehicle: () => void;
  disarmVehicle: () => void;
  startDemoDrive: () => void;
  resetDemo: () => void;
  enableNativeTracking: () => void;
};

const RoadTestContext = createContext<RoadTestContextValue | null>(null);

export function RoadTestProvider({ children }: { children: React.ReactNode }) {
  const [allVehicles, setAllVehicles] = useState<RoadTestVehicle[]>(DEFAULT_VEHICLES);
  const [vehicle, setVehicleState] = useState<RoadTestVehicle | null>(DEFAULT_VEHICLES[0]);
  const [armed, setArmed] = useState(true);
  const [tripState, setTripState] = useState<TripState>('inside');
  const [demoRunning, setDemoRunning] = useState(false);
  const [routeIndex, setRouteIndex] = useState(1);
  const [speedKph, setSpeedKph] = useState(0);
  const [maxSpeedKph, setMaxSpeedKph] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [fenceRadius, setFenceRadiusState] = useState(180);
  const [permissionState, setPermissionState] = useState<PermissionState>('enabled');
  const [tripRecords, setTripRecords] = useState<TripRecord[]>(INITIAL_TRIPS);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIndexRef = useRef(1);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const setFenceRadius = useCallback((radius: number) => {
    setFenceRadiusState(Math.min(500, Math.max(100, radius)));
  }, []);

  const armVehicle = useCallback(() => {
    if (!vehicle) return;
    setArmed(true);
    setTripState('inside');
  }, [vehicle]);

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
    setTripState('inside');
    setRouteIndex(1);
    activeIndexRef.current = 1;
    setSpeedKph(0);
    setMaxSpeedKph(0);
    setElapsedSec(0);
    setDistanceKm(0);
  }, [clearTimer]);

  const startDemoDrive = useCallback(() => {
    if (!vehicle) return;
    clearTimer();
    setArmed(true);
    setDemoRunning(true);
    setTripState('outside');
    setRouteIndex(2);
    activeIndexRef.current = 2;
    setSpeedKph(DEMO_ROUTE[1].speed);
    setMaxSpeedKph(DEMO_ROUTE[1].speed);
    setDistanceKm(DEMO_ROUTE[1].distance);
    setElapsedSec(6);

    timerRef.current = setInterval(() => {
      const next = activeIndexRef.current + 1;
      if (next >= DEMO_ROUTE.length) {
        clearTimer();
        activeIndexRef.current = DEMO_ROUTE.length - 1;
        setRouteIndex(DEMO_ROUTE.length);
        setTripState('returned');
        setSpeedKph(0);
        setDemoRunning(false);

        // Record completed road test
        const newRecord: TripRecord = {
          id: `trip-${Date.now()}`,
          vehicleId: vehicle.id,
          vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          registration: vehicle.registration,
          repairOrder: vehicle.repairOrder,
          dateLabel: 'Just now',
          startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: `${Math.floor((DEMO_ROUTE.length * 4) / 60)}m ${(DEMO_ROUTE.length * 4) % 60}s`,
          distanceKm: DEMO_ROUTE[DEMO_ROUTE.length - 1].distance,
          maxSpeedKph: Math.max(...DEMO_ROUTE.map((p) => p.speed)),
          avgSpeedKph: 48,
          technician: 'Workshop Tech',
          outcome: 'Completed',
          note: `Road test evidence logged for ${vehicle.repairOrder}. Geofence departure and arrival auto-verified.`,
        };
        setTripRecords((prev) => [newRecord, ...prev]);
        return;
      }

      activeIndexRef.current = next;
      setRouteIndex(next);
      const point = DEMO_ROUTE[next - 1];
      setSpeedKph(point.speed);
      setMaxSpeedKph((current) => Math.max(current, point.speed));
      setDistanceKm(point.distance);
      setElapsedSec((prev) => prev + 4);
    }, 1100);
  }, [clearTimer, vehicle]);

  const armCustomVehicle = useCallback((custom: Partial<RoadTestVehicle>) => {
    const newVeh: RoadTestVehicle = {
      id: custom.id || `veh-${Date.now()}`,
      registration: custom.registration || 'TEST-01',
      customerNumber: custom.customerNumber || 'C-LOCAL',
      customerName: custom.customerName || 'Booran Customer',
      vin: custom.vin || 'VIN-UNKNOWN',
      repairOrder: custom.repairOrder || 'RO-TEST',
      year: custom.year || 2024,
      make: custom.make || 'Toyota',
      model: custom.model || 'Demo',
      variant: custom.variant || 'Standard',
      colour: custom.colour || 'Silver',
      odometerKm: custom.odometerKm || 10000,
      serviceAdvisor: custom.serviceAdvisor || 'Service Team',
      concern: custom.concern || 'Road test requested for warranty diagnostics',
    };
    setAllVehicles((prev) => [newVeh, ...prev.filter((v) => v.registration !== newVeh.registration)]);
    setVehicleState(newVeh);
    setArmed(true);
    setTripState('inside');
    resetDemo();
  }, [resetDemo]);

  const enableNativeTracking = useCallback(() => {
    setPermissionState('enabled');
  }, []);

  const routePoints = useMemo(() => DEMO_ROUTE.slice(0, Math.max(1, routeIndex)), [routeIndex]);

  const value = useMemo(
    () => ({
      vehicle,
      armed,
      tripState,
      demoRunning,
      routeIndex,
      speedKph,
      maxSpeedKph,
      elapsedSec,
      distanceKm,
      routePoints,
      fenceRadius,
      permissionState,
      tripRecords,
      allVehicles,
      setVehicle: setVehicleState,
      armCustomVehicle,
      setFenceRadius,
      armVehicle,
      disarmVehicle,
      startDemoDrive,
      resetDemo,
      enableNativeTracking,
    }),
    [
      vehicle,
      armed,
      tripState,
      demoRunning,
      routeIndex,
      speedKph,
      maxSpeedKph,
      elapsedSec,
      distanceKm,
      routePoints,
      fenceRadius,
      permissionState,
      tripRecords,
      allVehicles,
      armCustomVehicle,
      setFenceRadius,
      armVehicle,
      disarmVehicle,
      startDemoDrive,
      resetDemo,
      enableNativeTracking,
    ]
  );

  return <RoadTestContext.Provider value={value}>{children}</RoadTestContext.Provider>;
}

export function useRoadTest(): RoadTestContextValue {
  const ctx = useContext(RoadTestContext);
  if (!ctx) {
    throw new Error('useRoadTest must be used within RoadTestProvider');
  }
  return ctx;
}
