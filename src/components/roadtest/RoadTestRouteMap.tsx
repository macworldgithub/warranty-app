import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Polyline, G, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import {
  Wrench,
  Navigation,
  Crosshair,
  Plus,
  Minus,
  MapPin,
  Route,
  CheckCircle2,
  Car,
  Clock,
  Gauge,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { RoutePoint, TripState, DEFAULT_DEMO_ROUTE } from '../../context/RoadTestContext';
import { useGeofence } from '../../context/GeofenceContext';

interface RoadTestRouteMapProps {
  points: RoutePoint[];
  state: TripState;
  compact?: boolean;
  siteLat?: number;
  siteLng?: number;
  siteName?: string;
  fenceRadius?: number;
  floatingStats?: {
    distanceKm: number;
    durationMin: number;
    speedKph: number;
  };
}

// Slippy Map Web Mercator calculations (EPSG:3857) - 100% Free OpenStreetMap
function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function getMetersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

function normalizePoint(p: RoutePoint, defaultSiteLat: number, defaultSiteLng: number): {
  lat: number;
  lng: number;
  speed: number;
} {
  if (p.latitude !== undefined && p.longitude !== undefined) {
    return { lat: p.latitude, lng: p.longitude, speed: p.speed ?? 0 };
  }
  // Inverse projection from legacy SVG coordinates (18, 68) around dealership center
  const dx = (p.x - 18) * 15.38;
  const dy = (68 - p.y) * 15.38;
  const lng = defaultSiteLng + dx / (111320 * Math.cos((defaultSiteLat * Math.PI) / 180));
  const lat = defaultSiteLat + dy / 111320;
  return { lat, lng, speed: p.speed ?? 0 };
}

export function RoadTestRouteMap({
  points,
  state,
  compact = false,
  siteLat: propSiteLat,
  siteLng: propSiteLng,
  siteName: propSiteName,
  fenceRadius: propFenceRadius,
  floatingStats,
}: RoadTestRouteMapProps) {
  const geofence = useGeofence();
  const workshopLat =
    propSiteLat ??
    geofence.customWorkshop?.lat ??
    (geofence.liveCoords && geofence.liveCoords.latitude > 0 ? geofence.liveCoords.latitude : -38.0992);
  const workshopLng =
    propSiteLng ??
    geofence.customWorkshop?.lng ??
    (geofence.liveCoords && geofence.liveCoords.latitude > 0 ? geofence.liveCoords.longitude : 145.2813);
  const workshopName =
    propSiteName ??
    geofence.customWorkshop?.name ??
    geofence.siteName ??
    'Booran BYD Cranbourne';
  const radiusM = propFenceRadius ?? geofence.radiusMeters ?? 200;

  const [containerSize, setContainerSize] = useState({ width: 360, height: compact ? 120 : 255 });
  const [zoom, setZoom] = useState<number>(compact ? 15 : 16);
  const [viewMode, setViewMode] = useState<'follow' | 'fullTrack'>(
    compact || state === 'returned' ? 'fullTrack' : 'follow'
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  }, []);

  // Normalize all route points to real geographic latitude and longitude
  const normalizedPoints = useMemo(() => {
    const list = points && points.length > 0 ? points : [DEFAULT_DEMO_ROUTE[0]];
    return list.map((p) => normalizePoint(p, workshopLat, workshopLng));
  }, [points, workshopLat, workshopLng]);

  const startPoint = normalizedPoints[0] ?? {
    lat: workshopLat,
    lng: workshopLng,
    speed: 0,
  };

  const currentPoint = normalizedPoints[normalizedPoints.length - 1] ?? startPoint;

  // Bounding box calculation to fit the full tracked test drive circuit
  const bounds = useMemo(() => {
    if (!normalizedPoints || normalizedPoints.length === 0) {
      return {
        centerLat: workshopLat,
        centerLng: workshopLng,
        optimalZoom: 16,
      };
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const p of normalizedPoints) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    // Include workshop in the circuit bounds
    minLat = Math.min(minLat, workshopLat);
    maxLat = Math.max(maxLat, workshopLat);
    minLng = Math.min(minLng, workshopLng);
    maxLng = Math.max(maxLng, workshopLng);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latSpan = Math.max(0.003, (maxLat - minLat) * 1.35);
    const lngSpan = Math.max(0.003, (maxLng - minLng) * 1.35);

    const zoomX = Math.log2((containerSize.width * 360) / (lngSpan * 256));
    const zoomY = Math.log2((containerSize.height * 180) / (latSpan * 256));

    const optimalZoom = Math.max(13, Math.min(17, Math.floor(Math.min(zoomX, zoomY))));

    return {
      centerLat,
      centerLng,
      optimalZoom,
    };
  }, [normalizedPoints, workshopLat, workshopLng, containerSize]);

  // When trip finishes or compact card loads, switch automatically to full tracked track
  useEffect(() => {
    if (state === 'returned' || compact) {
      setViewMode('fullTrack');
      setZoom(bounds.optimalZoom);
      setPan({ x: 0, y: 0 });
    }
  }, [state, compact, bounds.optimalZoom]);

  // Dynamic center coordinate: follows vehicle or frames the entire track
  const effectiveCenterLat =
    viewMode === 'fullTrack' || compact ? bounds.centerLat : currentPoint.lat;
  const effectiveCenterLng =
    viewMode === 'fullTrack' || compact ? bounds.centerLng : currentPoint.lng;
  const effectiveZoom =
    viewMode === 'fullTrack' || compact ? bounds.optimalZoom : zoom;

  // Pan gesture responder for freely dragging the map
  const panResponder = useMemo(() => {
    if (compact) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gestureState) =>
        Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        panStartRef.current = { x: pan.x, y: pan.y };
      },
      onPanResponderMove: (_e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        setPan({
          x: panStartRef.current.x + gestureState.dx,
          y: panStartRef.current.y + gestureState.dy,
        });
      },
    });
  }, [compact, pan]);

  // Project any lat/lng to container pixel coordinates with current pan and zoom
  const projectToPixel = useCallback(
    (lat: number, lng: number) => {
      const cTileX = lon2tile(effectiveCenterLng, effectiveZoom);
      const cTileY = lat2tile(effectiveCenterLat, effectiveZoom);
      const pTileX = lon2tile(lng, effectiveZoom);
      const pTileY = lat2tile(lat, effectiveZoom);

      const x = containerSize.width / 2 + (pTileX - cTileX) * 256 + pan.x;
      const y = containerSize.height / 2 + (pTileY - cTileY) * 256 + pan.y;
      return { x, y };
    },
    [effectiveCenterLat, effectiveCenterLng, effectiveZoom, containerSize, pan]
  );

  // Compute OpenStreetMap raster tiles covering the viewport (100% Free OSM)
  const tiles = useMemo(() => {
    const cTileX = lon2tile(effectiveCenterLng, effectiveZoom);
    const cTileY = lat2tile(effectiveCenterLat, effectiveZoom);

    const minX = Math.floor(cTileX - (containerSize.width / 2 + pan.x) / 256) - 1;
    const maxX = Math.ceil(cTileX + (containerSize.width / 2 - pan.x) / 256) + 1;
    const minY = Math.floor(cTileY - (containerSize.height / 2 + pan.y) / 256) - 1;
    const maxY = Math.ceil(cTileY + (containerSize.height / 2 - pan.y) / 256) + 1;

    const result: Array<{ key: string; url: string; left: number; top: number }> = [];

    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        const left = containerSize.width / 2 + (tx - cTileX) * 256 + pan.x;
        const top = containerSize.height / 2 + (ty - cTileY) * 256 + pan.y;

        const subdomains = ['a', 'b', 'c'];
        const sub = subdomains[Math.abs(tx + ty) % subdomains.length];
        const url = `https://${sub}.tile.openstreetmap.org/${effectiveZoom}/${tx}/${ty}.png`;

        result.push({
          key: `${effectiveZoom}-${tx}-${ty}-osm`,
          url,
          left,
          top,
        });
      }
    }
    return result;
  }, [effectiveCenterLat, effectiveCenterLng, effectiveZoom, containerSize, pan]);

  // Full tracked polyline connecting all recorded test drive points
  const travelledPolylinePoints = useMemo(() => {
    return normalizedPoints
      .map((p) => {
        const px = projectToPixel(p.lat, p.lng);
        return `${px.x.toFixed(1)},${px.y.toFixed(1)}`;
      })
      .join(' ');
  }, [normalizedPoints, projectToPixel]);

  // Workshop & Geofence projections
  const workshopPixel = projectToPixel(workshopLat, workshopLng);
  const startPixel = projectToPixel(startPoint.lat, startPoint.lng);
  const vehiclePixel = projectToPixel(currentPoint.lat, currentPoint.lng);
  const metersPerPixel = getMetersPerPixel(workshopLat, effectiveZoom);
  const fenceRadiusPixels = radiusM / metersPerPixel;

  const handleZoomIn = () => {
    setZoom((z) => Math.min(18, z + 1));
    setViewMode('follow');
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(13, z - 1));
    setViewMode('follow');
  };

  const handleRecenterCar = () => {
    setViewMode('follow');
    setPan({ x: 0, y: 0 });
    setZoom(16);
  };

  const handleFitFullTrack = () => {
    setViewMode('fullTrack');
    setPan({ x: 0, y: 0 });
    setZoom(bounds.optimalZoom);
  };

  const isVehicleOutside = state === 'outside';
  const isTripReturned = state === 'returned';

  return (
    <View
      style={[styles.container, compact && styles.compact]}
      onLayout={onLayout}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      {/* 1. Real OpenStreetMap Tiles (Only OSM View) */}
      <View style={StyleSheet.absoluteFill}>
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{
              uri: tile.url,
              headers: { 'User-Agent': 'BooranWarrantyApp/1.0 (dealership road test telemetry)' },
            }}
            style={[
              styles.tileImage,
              {
                left: tile.left,
                top: tile.top,
              },
            ]}
            fadeDuration={100}
            resizeMode="cover"
          />
        ))}
      </View>

      {/* 2. SVG Overlays: Full Track Polyline, Workshop Geofence, Start & Vehicle Markers */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#DC2626" stopOpacity="1" />
            <Stop offset="100%" stopColor="#D71920" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Workshop Geofence Radius Boundary Circle (Real meters scaled to map) */}
        <Circle
          cx={workshopPixel.x}
          cy={workshopPixel.y}
          r={Math.max(12, fenceRadiusPixels)}
          fill="#D71920"
          fillOpacity={0.12}
          stroke="#D71920"
          strokeWidth={1.8}
          strokeDasharray="4 3"
        />

        {/* Workshop Dealership Pin Marker */}
        <G>
          <Circle
            cx={workshopPixel.x}
            cy={workshopPixel.y}
            r={10}
            fill="#D71920"
            fillOpacity={0.25}
          />
          <Circle
            cx={workshopPixel.x}
            cy={workshopPixel.y}
            r={5}
            fill="#D71920"
            stroke="#FFFFFF"
            strokeWidth={1.8}
          />
        </G>

        {/* Full Tracked Test Drive Track (Solid Booran Red with White Outer Contrast Glow) */}
        {travelledPolylinePoints ? (
          <G>
            {/* White outline for high contrast over OSM streets */}
            <Polyline
              points={travelledPolylinePoints}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={5.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Core Booran Red Test Drive Track */}
            <Polyline
              points={travelledPolylinePoints}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth={4.0}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        ) : null}

        {/* Start Point Marker (Green Flag/Circle) */}
        {normalizedPoints.length > 1 && (
          <G>
            <Circle
              cx={startPixel.x}
              cy={startPixel.y}
              r={7}
              fill="#059669"
              stroke="#FFFFFF"
              strokeWidth={1.8}
            />
            <Circle
              cx={startPixel.x}
              cy={startPixel.y}
              r={2.5}
              fill="#FFFFFF"
            />
          </G>
        )}

        {/* Current Vehicle Position Marker (Blue radar dot matching Figma Image 1) */}
        <G>
          {/* Pulsing telemetry beacon */}
          <Circle
            cx={vehiclePixel.x}
            cy={vehiclePixel.y}
            r={16}
            fill="#3B82F6"
            fillOpacity={0.25}
          />
          {/* Solid core vehicle dot */}
          <Circle
            cx={vehiclePixel.x}
            cy={vehiclePixel.y}
            r={7.5}
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
        </G>
      </Svg>

      {/* Workshop / Start Marker with Car Pin & Dealership Name (Figma Image 1) */}
      {!compact && (
        <View
          style={[
            styles.startPinWrap,
            {
              left: Math.max(8, Math.min(containerSize.width - 150, startPixel.x - 70)),
              top: Math.max(8, Math.min(containerSize.height - 55, startPixel.y - 44)),
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.startPinBadge}>
            <Car size={13} color="#FFFFFF" />
          </View>
          <View style={styles.startPinLabel}>
            <Text style={styles.startPinLabelText} numberOfLines={1}>{workshopName}</Text>
          </View>
        </View>
      )}

      {/* Top Right: Floating 3-Metric Stats Overlay (Figma Image 1) */}
      {floatingStats && !compact && (
        <View style={styles.figmaFloatingStats}>
          <View style={styles.figmaStatItem}>
            <MapPin size={13} color="#DC2626" />
            <Text style={styles.figmaStatVal}>{floatingStats.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.figmaStatDivider} />
          <View style={styles.figmaStatItem}>
            <Clock size={13} color="#DC2626" />
            <Text style={styles.figmaStatVal}>{floatingStats.durationMin} min</Text>
          </View>
          <View style={styles.figmaStatDivider} />
          <View style={styles.figmaStatItem}>
            <Gauge size={13} color="#DC2626" />
            <Text style={styles.figmaStatVal}>{floatingStats.speedKph} km/h</Text>
          </View>
        </View>
      )}

      {/* Top Left: OpenStreetMap Provider Badge */}
      {!compact && !floatingStats && (
        <View style={styles.osmBadge}>
          <Text style={styles.osmBadgeText}>🗺️ OpenStreetMap</Text>
        </View>
      )}

      {/* Status Badge Pill (when floatingStats is not active) */}
      {!compact && !floatingStats && (
        <View style={styles.mapBadge}>
          <View
            style={[
              styles.badgeDot,
              isVehicleOutside ? styles.activeDot : isTripReturned ? styles.returnedDot : styles.safeDot,
            ]}
          />
          <Text style={styles.badgeText}>
            {isVehicleOutside
              ? 'TRACKING LIVE'
              : isTripReturned
              ? 'TRIP COMPLETE'
              : 'INSIDE GEOFENCE'}
          </Text>
        </View>
      )}

      {/* Bottom Right: Interactive Map Controls (Zoom In, Zoom Out, Fit Full Track, Recenter) */}
      {!compact && (
        <View style={styles.controlsCol}>
          {/* Fit Full Track Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleFitFullTrack}
            style={[styles.controlBtn, viewMode === 'fullTrack' && styles.controlBtnActive]}
            accessibilityLabel="Show Full Track"
          >
            <Route size={16} color={viewMode === 'fullTrack' ? colors.primary : '#0F172A'} />
          </TouchableOpacity>

          {/* Recenter on Moving Car Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleRecenterCar}
            style={[styles.controlBtn, viewMode === 'follow' && styles.controlBtnActive]}
            accessibilityLabel="Follow Car"
          >
            <Crosshair size={16} color={viewMode === 'follow' ? colors.primary : '#0F172A'} />
          </TouchableOpacity>

          {/* Zoom In */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleZoomIn}
            style={styles.controlBtn}
            accessibilityLabel="Zoom In"
          >
            <Plus size={16} color="#0F172A" />
          </TouchableOpacity>

          {/* Zoom Out */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleZoomOut}
            style={styles.controlBtn}
            accessibilityLabel="Zoom Out"
          >
            <Minus size={16} color="#0F172A" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Left: Dealership Workshop Pill & Tracked Path Summary */}
      <View style={styles.bottomMetaWrap} pointerEvents="none">
        <View style={styles.workshopLabel}>
          <View style={styles.labelIcon}>
            <Wrench size={10} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.labelTitle} numberOfLines={1}>
              {workshopName.toUpperCase()}
            </Text>
            <Text style={styles.labelSub}>
              {fenceRadiusPixels > 0 ? `PERIMETER RADIUS: ${radiusM}M` : 'WORKSHOP CENTRE'}
            </Text>
          </View>
        </View>

        {!compact && (
          <View style={styles.coordsRow}>
            <View style={styles.coordsPill}>
              <MapPin size={9} color="#DC2626" />
              <Text style={styles.coordsText}>
                {normalizedPoints.length} GPS Pings • Track Visible
              </Text>
            </View>
            <Text style={styles.osmAttribution}>© OpenStreetMap contributors</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 255,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  compact: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
  },
  tileImage: {
    position: 'absolute',
    width: 256,
    height: 256,
  },
  vehicleLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  vehicleSpeedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  vehicleSpeedPillActive: {
    backgroundColor: colors.primary,
  },
  vehicleSpeedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  osmBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 15,
  },
  osmBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 15,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
  },
  safeDot: {
    backgroundColor: '#059669',
  },
  returnedDot: {
    backgroundColor: '#2563EB',
  },
  badgeText: {
    color: '#0F172A',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  controlsCol: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    gap: 6,
    zIndex: 20,
  },
  controlBtn: {
    width: 33,
    height: 33,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  controlBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEF2F2',
  },
  bottomMetaWrap: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    gap: 4,
    maxWidth: '68%',
    zIndex: 15,
  },
  workshopLabel: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 9,
    paddingVertical: 4,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  labelIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelTitle: {
    color: '#0F172A',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  labelSub: {
    color: '#64748B',
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  coordsText: {
    color: '#F8FAFC',
    fontSize: 7.5,
    fontWeight: '700',
  },
  osmAttribution: {
    color: '#475569',
    fontSize: 7,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  startPinWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: 140,
  },
  startPinBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  startPinLabel: {
    marginTop: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  startPinLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  figmaFloatingStats: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  figmaStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  figmaStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  figmaStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  miniMapWrap: {
    width: 68,
    height: 42,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export function MiniRoutePreview({ points }: { points?: RoutePoint[] }) {
  const polyPoints = useMemo(() => {
    if (!points || points.length === 0) {
      return '10,32 24,18 38,24 56,12';
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      const px = p.x ?? 18;
      const py = p.y ?? 68;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    const spanX = Math.max(0.1, maxX - minX);
    const spanY = Math.max(0.1, maxY - minY);

    return points
      .map((p) => {
        const nx = 8 + (((p.x ?? 18) - minX) / spanX) * 52;
        const ny = 6 + (((p.y ?? 68) - minY) / spanY) * 28;
        return `${nx.toFixed(1)},${ny.toFixed(1)}`;
      })
      .join(' ');
  }, [points]);

  return (
    <View style={styles.miniMapWrap}>
      <Svg width={68} height={42} viewBox="0 0 68 42">
        <Line x1={0} y1={14} x2={68} y2={18} stroke="#E2E8F0" strokeWidth={3} />
        <Line x1={0} y1={28} x2={68} y2={24} stroke="#E2E8F0" strokeWidth={2.5} />
        <Line x1={22} y1={0} x2={30} y2={42} stroke="#E2E8F0" strokeWidth={3.5} />
        <Line x1={48} y1={0} x2={44} y2={42} stroke="#E2E8F0" strokeWidth={2} />
        <Polyline
          points={polyPoints}
          fill="none"
          stroke="#475569"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={10} cy={30} r={3} fill="#475569" stroke="#FFFFFF" strokeWidth={1} />
        <Circle cx={56} cy={12} r={3} fill="#475569" stroke="#FFFFFF" strokeWidth={1} />
      </Svg>
    </View>
  );
}
