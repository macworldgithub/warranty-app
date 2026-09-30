import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { useAuth } from './AuthContext';
import { mobileGeofenceService, PingTelemetryDto, GeofencePingResponse } from '../services/geofence.service';

// Safe check: Is the native Android / iOS module linked into the currently running binary?
let GeolocationModule: any = null;
let isNativeGeolocationAvailable = false;

try {
  const pkg = require('@react-native-community/geolocation');
  const geo = pkg?.default || pkg;
  if (geo && typeof geo.getCurrentPosition === 'function') {
    GeolocationModule = geo;
    isNativeGeolocationAvailable = true;
    try {
      GeolocationModule.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        locationProvider: 'auto',
      });
    } catch (_cfgErr) { }
  }
} catch (_e) {
  isNativeGeolocationAvailable = false;
  GeolocationModule = null;
}

export interface LiveGpsCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speedKmh?: number;
  timestamp?: number;
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GeofenceContextType {
  presenceStatus: 'ON_SITE' | 'OFF_SITE';
  insideGeofence: boolean;
  distanceMeters: number;
  siteName: string;
  radiusMeters: number;
  currentActivity: 'WORKSHOP' | 'ROAD_TEST' | 'INSPECTION' | 'IDLE';
  activeRoNumber?: string;
  lastPingAt: Date | null;
  isPinging: boolean;
  liveCoords: LiveGpsCoords | null;
  hasLocationPermission: boolean;
  gpsMode: 'LIVE' | 'SIMULATED';
  customWorkshop: { lat: number; lng: number; name: string } | null;
  anchorWorkshopToLocation: (lat: number, lng: number, name?: string) => void;
  resetWorkshopToDealership: () => void;
  pingNow: (override?: Partial<PingTelemetryDto>) => Promise<void>;
  setPresenceActivity: (activity: 'WORKSHOP' | 'ROAD_TEST' | 'INSPECTION' | 'IDLE', ro?: string) => void;
  toggleSimulatedPresence: () => void;
  requestLocationAccess: () => Promise<boolean>;
  switchToLiveMode: () => void;
  updateSiteRadius: (radius: number) => Promise<void>;
}

const GeofenceContext = createContext<GeofenceContextType | undefined>(undefined);

// Reference site coordinates for Cranbourne (fallback reference)
export const SITE_CRANBOURNE = {
  lat: -38.0992,
  lng: 145.2813,
  name: 'Booran BYD Cranbourne',
};

// Preset for testing in Pakistan (e.g. Lahore hub)
export const SITE_PAKISTAN = {
  lat: 31.5204,
  lng: 74.3587,
  name: 'Pakistan Workshop & Test Track',
};

// Location ~1.8km away outside the 200m perimeter
export const OFF_SITE_LOCATION = {
  lat: -38.1120,
  lng: 145.2980,
};

async function askLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    if (isNativeGeolocationAvailable && GeolocationModule?.requestAuthorization) {
      GeolocationModule.requestAuthorization();
    }
    return true;
  }
  if (Platform.OS === 'android') {
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      const fineGranted =
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const coarseGranted =
        results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      return fineGranted || coarseGranted;
    } catch (err) {
      console.warn('Error requesting location permissions:', err);
      return false;
    }
  }
  return false;
}

export const GeofenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeSiteId, isAuthenticated } = useAuth();

  const [presenceStatus, setPresenceStatus] = useState<'ON_SITE' | 'OFF_SITE'>('OFF_SITE');
  const [insideGeofence, setInsideGeofence] = useState<boolean>(false);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [siteName, setSiteName] = useState<string>('Booran BYD Cranbourne');
  const [radiusMeters, setRadiusMeters] = useState<number>(200);
  const [currentActivity, setCurrentActivity] = useState<'WORKSHOP' | 'ROAD_TEST' | 'INSPECTION' | 'IDLE'>('WORKSHOP');
  const [activeRoNumber, setActiveRoNumber] = useState<string | undefined>(undefined);
  const [lastPingAt, setLastPingAt] = useState<Date | null>(new Date());
  const [isPinging, setIsPinging] = useState<boolean>(false);

  // Custom workshop anchor for local/Pakistan testing
  const [customWorkshop, setCustomWorkshop] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const customWorkshopRef = useRef<{ lat: number; lng: number; name: string } | null>(null);

  // Live GPS state
  const [gpsMode, setGpsMode] = useState<'LIVE' | 'SIMULATED'>('LIVE');
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [liveCoords, setLiveCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);

  // Active refs to avoid stale closure during intervals/listeners
  const liveCoordsRef = useRef<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const gpsModeRef = useRef<'LIVE' | 'SIMULATED'>('LIVE');
  const simulatedCoordsRef = useRef<{ lat: number; lng: number }>(OFF_SITE_LOCATION);
  const isPingingRef = useRef<boolean>(false);

  const anchorWorkshopToLocation = useCallback((lat: number, lng: number, name?: string) => {
    const loc = { lat, lng, name: name || 'Local Testing Workshop' };
    customWorkshopRef.current = loc;
    setCustomWorkshop(loc);
    setSiteName(loc.name);
    setDistanceMeters(0);
    setInsideGeofence(true);
    setPresenceStatus('ON_SITE');
  }, []);

  const resetWorkshopToDealership = useCallback(() => {
    customWorkshopRef.current = null;
    setCustomWorkshop(null);
    setSiteName('Booran BYD Cranbourne');
  }, []);

  useEffect(() => {
    gpsModeRef.current = gpsMode;
  }, [gpsMode]);

  const pingNow = useCallback(async (override?: Partial<PingTelemetryDto>) => {
    if (!isAuthenticated || !user) return;
    if (isPingingRef.current) return;

    let coords: { lat: number; lng: number };
    let accuracy: number | undefined = override?.accuracy;

    if (override?.latitude !== undefined && override?.longitude !== undefined) {
      coords = { lat: override.latitude, lng: override.longitude };
    } else if (gpsModeRef.current === 'LIVE') {
      if (liveCoordsRef.current) {
        coords = {
          lat: liveCoordsRef.current.latitude,
          lng: liveCoordsRef.current.longitude,
        };
        accuracy = liveCoordsRef.current.accuracy;
      } else {
        // In LIVE mode, do not send fake Melbourne coordinates if GPS fix is pending
        return;
      }
    } else {
      coords = simulatedCoordsRef.current;
    }

    const payload: PingTelemetryDto = {
      technicianId: user.id,
      technicianName: user.name,
      siteId: activeSiteId || 'site_cranbourne_byd',
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy,
      speedKmh: override?.speedKmh ?? (currentActivity === 'ROAD_TEST' ? 48 : 0),
      currentActivity: override?.currentActivity ?? currentActivity,
      activeRoNumber: override?.activeRoNumber ?? activeRoNumber,
    };

    isPingingRef.current = true;
    setIsPinging(true);
    try {
      const res: GeofencePingResponse = await mobileGeofenceService.ping(payload);
      if (res) {
        setPresenceStatus(res.status);
        setInsideGeofence(res.insideGeofence);
        setDistanceMeters(res.distanceMeters);
        if (res.siteName) setSiteName(res.siteName);
        if (res.radiusMeters) setRadiusMeters(res.radiusMeters);
        setLastPingAt(new Date());
      }
    } catch (pingErr) {
      // Local fallback in case backend is unreachable: Compute true Haversine distance
      const dist = calculateDistanceMeters(coords.lat, coords.lng, SITE_CRANBOURNE.lat, SITE_CRANBOURNE.lng);
      const isInside = dist <= radiusMeters;
      setDistanceMeters(dist);
      setInsideGeofence(isInside);
      setPresenceStatus(isInside ? 'ON_SITE' : 'OFF_SITE');
      setLastPingAt(new Date());
    } finally {
      isPingingRef.current = false;
      setIsPinging(false);
    }
  }, [isAuthenticated, user, activeSiteId, currentActivity, activeRoNumber, radiusMeters]);

  // Request location permission explicitly
  const requestLocationAccess = useCallback(async (): Promise<boolean> => {
    const granted = await askLocationPermission();
    setHasLocationPermission(granted);
    if (granted && isNativeGeolocationAvailable && GeolocationModule?.getCurrentPosition) {
      setGpsMode('LIVE');
      const handlePos = (pos: any) => {
        const speedKmh = pos.coords.speed && pos.coords.speed > 0 ? Math.round(pos.coords.speed * 3.6) : 0;
        const c: LiveGpsCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speedKmh,
          timestamp: pos.timestamp || Date.now(),
        };
        liveCoordsRef.current = c;
        setLiveCoords(c);

        let refLat = customWorkshopRef.current?.lat ?? SITE_CRANBOURNE.lat;
        let refLng = customWorkshopRef.current?.lng ?? SITE_CRANBOURNE.lng;

        // Auto-anchor workshop to user's location if testing in Pakistan / outside Australia
        if (customWorkshopRef.current === null && c.latitude > 0) {
          const autoLoc = { lat: c.latitude, lng: c.longitude, name: 'Local Pakistan Workshop' };
          customWorkshopRef.current = autoLoc;
          setCustomWorkshop(autoLoc);
          setSiteName(autoLoc.name);
          refLat = c.latitude;
          refLng = c.longitude;
        }

        const realDist = calculateDistanceMeters(c.latitude, c.longitude, refLat, refLng);
        const isInside = realDist <= radiusMeters;
        setDistanceMeters(realDist);
        setInsideGeofence(isInside);
        setPresenceStatus(isInside ? 'ON_SITE' : 'OFF_SITE');

        pingNow({
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: c.accuracy,
          speedKmh,
        });
      };

      try {
        GeolocationModule.getCurrentPosition(
          handlePos,
          (err: any) => {
            console.warn('Geolocation high-accuracy fix failed, retrying with network provider:', err);
            try {
              GeolocationModule.getCurrentPosition(
                handlePos,
                (err2: any) => {
                  console.warn('Geolocation network fix failed:', err2);
                },
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
              );
            } catch (_err2) { }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      } catch (_posErr) {
        console.warn('getCurrentPosition error:', _posErr);
      }
    }
    return granted;
  }, [pingNow, radiusMeters]);

  const switchToLiveMode = useCallback(() => {
    setGpsMode('LIVE');
    requestLocationAccess();
  }, [requestLocationAccess]);

  // Set activity and trigger ping
  const setPresenceActivity = useCallback((
    activity: 'WORKSHOP' | 'ROAD_TEST' | 'INSPECTION' | 'IDLE',
    ro?: string
  ) => {
    setCurrentActivity(activity);
    if (ro !== undefined) setActiveRoNumber(ro);

    if (gpsModeRef.current === 'LIVE' && liveCoordsRef.current) {
      pingNow({
        currentActivity: activity,
        activeRoNumber: ro,
        latitude: liveCoordsRef.current.latitude,
        longitude: liveCoordsRef.current.longitude,
      });
    } else {
      if (activity === 'ROAD_TEST') {
        simulatedCoordsRef.current = OFF_SITE_LOCATION;
      } else {
        simulatedCoordsRef.current = SITE_CRANBOURNE;
      }
      pingNow({
        currentActivity: activity,
        activeRoNumber: ro,
        latitude: simulatedCoordsRef.current.lat,
        longitude: simulatedCoordsRef.current.lng,
      });
    }
  }, [pingNow]);

  // Toggle simulated on-site / off-site for rapid developer demo/testing
  const toggleSimulatedPresence = useCallback(() => {
    setGpsMode('SIMULATED');
    const nextIsOff = presenceStatus === 'ON_SITE';
    simulatedCoordsRef.current = nextIsOff ? OFF_SITE_LOCATION : SITE_CRANBOURNE;
    const nextActivity = nextIsOff ? 'ROAD_TEST' : 'WORKSHOP';
    setCurrentActivity(nextActivity);
    pingNow({
      currentActivity: nextActivity,
      latitude: simulatedCoordsRef.current.lat,
      longitude: simulatedCoordsRef.current.lng,
    });
  }, [presenceStatus, pingNow]);

  // Request location permission on mount / authentication
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    requestLocationAccess();
  }, [isAuthenticated, user, requestLocationAccess]);

  // Start live GPS watchPosition stream
  useEffect(() => {
    if (!isAuthenticated || !user || !hasLocationPermission || !isNativeGeolocationAvailable || !GeolocationModule?.watchPosition) return;

    let watchId: number | null = null;

    const startWatcher = (useHighAccuracy: boolean) => {
      try {
        return GeolocationModule.watchPosition(
          (pos: any) => {
            const speedKmh = pos.coords.speed && pos.coords.speed > 0 ? Math.round(pos.coords.speed * 3.6) : 0;
            const c: LiveGpsCoords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speedKmh,
              timestamp: pos.timestamp || Date.now(),
            };
            liveCoordsRef.current = c;
            setLiveCoords(c);

            if (gpsModeRef.current === 'LIVE') {
              let refLat = customWorkshopRef.current?.lat ?? SITE_CRANBOURNE.lat;
              let refLng = customWorkshopRef.current?.lng ?? SITE_CRANBOURNE.lng;

              if (customWorkshopRef.current === null && c.latitude > 0) {
                const autoLoc = { lat: c.latitude, lng: c.longitude, name: 'Local Pakistan Workshop' };
                customWorkshopRef.current = autoLoc;
                setCustomWorkshop(autoLoc);
                setSiteName(autoLoc.name);
                refLat = c.latitude;
                refLng = c.longitude;
              }

              const liveDist = calculateDistanceMeters(c.latitude, c.longitude, refLat, refLng);
              const isInside = liveDist <= radiusMeters;
              setDistanceMeters(liveDist);
              setInsideGeofence(isInside);
              setPresenceStatus(isInside ? 'ON_SITE' : 'OFF_SITE');

              pingNow({
                latitude: c.latitude,
                longitude: c.longitude,
                accuracy: c.accuracy,
                speedKmh,
              });
            }
          },
          (err: any) => {
            console.warn(`Geolocation watch error (highAccuracy=${useHighAccuracy}):`, err);
            if (useHighAccuracy) {
              watchId = startWatcher(false);
            }
          },
          {
            enableHighAccuracy: useHighAccuracy,
            distanceFilter: 0, // Ensure continuous real-time updates even when stationary
            interval: 2500,
            fastestInterval: 1200,
          }
        );
      } catch (_wErr) {
        console.warn('Geolocation watchPosition unavailable');
        return null;
      }
    };

    watchId = startWatcher(true);

    return () => {
      if (watchId !== null && GeolocationModule?.clearWatch) {
        GeolocationModule.clearWatch(watchId);
      }
    };
  }, [isAuthenticated, user, hasLocationPermission, pingNow, radiusMeters]);

  // Periodic telemetry fallback heartbeat (5s during active road test, 20s during workshop)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const pingDelay = currentActivity === 'ROAD_TEST' ? 5000 : 20000;
    const interval = setInterval(() => {
      pingNow();
    }, pingDelay);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, activeSiteId, currentActivity, pingNow]);

  const updateSiteRadius = useCallback(async (radius: number) => {
    setRadiusMeters(radius);
    if (activeSiteId) {
      try {
        await mobileGeofenceService.updateSiteRadius(activeSiteId, radius);
      } catch (err) {
        console.warn('Failed to persist site radius:', err);
      }
    }
  }, [activeSiteId]);

  return (
    <GeofenceContext.Provider
      value={{
        presenceStatus,
        insideGeofence,
        distanceMeters,
        siteName,
        radiusMeters,
        currentActivity,
        activeRoNumber,
        lastPingAt,
        isPinging,
        liveCoords,
        hasLocationPermission,
        gpsMode,
        customWorkshop,
        anchorWorkshopToLocation,
        resetWorkshopToDealership,
        pingNow,
        setPresenceActivity,
        toggleSimulatedPresence,
        requestLocationAccess,
        switchToLiveMode,
        updateSiteRadius,
      }}
    >
      {children}
    </GeofenceContext.Provider>
  );
};

export const useGeofence = () => {
  const context = useContext(GeofenceContext);
  if (!context) {
    throw new Error('useGeofence must be used within a GeofenceProvider');
  }
  return context;
};
