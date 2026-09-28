import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { Wrench } from 'lucide-react-native';
import { RoutePoint, TripState } from '../../types/roadTest';
import { DEMO_ROUTE } from '../../services/roadtest/roadTestData';
import { colors } from '../../theme/colors';

type RouteMapSvgProps = {
  points: RoutePoint[];
  state: TripState;
  compact?: boolean;
};

const plannedPoints = DEMO_ROUTE.map((point) => `${point.x},${point.y}`).join(' ');

export function RouteMapSvg({ points, state, compact = false }: RouteMapSvgProps) {
  const travelledPoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const current = points[points.length - 1] ?? DEMO_ROUTE[0];

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Svg viewBox="0 0 100 100" style={styles.svg} preserveAspectRatio="none">
        <Path d="M-10 25 C18 20 27 32 45 27 S77 16 110 23" stroke="#FFFFFF" strokeWidth="8" fill="none" />
        <Path d="M-10 25 C18 20 27 32 45 27 S77 16 110 23" stroke="#CBD5E1" strokeWidth="0.8" fill="none" />
        <Path d="M8 92 C17 71 39 62 50 41 S70 8 89 -8" stroke="#FFFFFF" strokeWidth="10" fill="none" />
        <Path d="M8 92 C17 71 39 62 50 41 S70 8 89 -8" stroke="#CBD5E1" strokeWidth="0.8" fill="none" />
        <Path d="M-8 58 C18 52 29 54 48 67 S84 88 110 80" stroke="#FFFFFF" strokeWidth="7" fill="none" />
        <Path d="M-8 58 C18 52 29 54 48 67 S84 88 110 80" stroke="#CBD5E1" strokeWidth="0.8" fill="none" />
        <Line x1="23" y1="-5" x2="31" y2="105" stroke="#FFFFFF" strokeWidth="5" />
        <Line x1="74" y1="-5" x2="68" y2="105" stroke="#FFFFFF" strokeWidth="6" />

        {/* Geofence Circle & Workshop Center */}
        <Circle cx="18" cy="68" r="13" fill="#D71920" fillOpacity="0.12" stroke="#D71920" strokeWidth="1.3" strokeDasharray="3 2" />
        <Circle cx="18" cy="68" r="3.8" fill="#D71920" stroke="#FFFFFF" strokeWidth="1.4" />

        {/* Planned Route (Dashed grey) */}
        <Polyline points={plannedPoints} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="2 2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Travelled Route (Bold Booran Red) */}
        {travelledPoints ? (
          <Polyline points={travelledPoints} fill="none" stroke="#D71920" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* Current Vehicle Position Dot */}
        <Circle cx={current.x} cy={current.y} r="4.5" fill={state === 'returned' ? '#059669' : '#D71920'} stroke="#FFFFFF" strokeWidth="2" />
      </Svg>

      {/* Workshop Label Overlay */}
      <View style={styles.workshopLabel}>
        <View style={styles.labelIcon}>
          <Wrench size={11} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.labelTitle}>BOORAN MOTORS</Text>
          <Text style={styles.labelSub}>SERVICE WORKSHOP</Text>
        </View>
      </View>

      {/* Live Badge Overlay */}
      {!compact ? (
        <View style={styles.mapBadge}>
          <View style={[styles.badgeDot, state === 'outside' ? styles.activeDot : styles.safeDot]} />
          <Text style={styles.badgeText}>
            {state === 'outside' ? 'TRACKING LIVE' : state === 'returned' ? 'TRIP COMPLETE' : 'INSIDE GEOFENCE'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compact: {
    height: 120,
    borderRadius: 16,
  },
  svg: {
    ...StyleSheet.absoluteFill,
  },
  workshopLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelTitle: {
    color: colors.textPrimary,
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  labelSub: {
    color: colors.textSecondary,
    fontSize: 6,
    lineHeight: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  mapBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: colors.success,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
