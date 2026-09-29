import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  FlatList,
  Switch,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gauge,
  MapPin,
  Clock,
  Car,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  FileText,
  Key,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Flag,
  Navigation,
  Bell,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useRoadTest, RoadTestTripRecord } from '../../context/RoadTestContext';
import { useGeofence } from '../../context/GeofenceContext';
import { RoadTestRouteMap } from '../../components/roadtest/RoadTestRouteMap';
import { Header } from '../../components/common/Header';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import {
  notificationsService,
  AppNotificationPayload,
} from '../../services/notifications.service';
import { mobileGeofenceService } from '../../services/geofence.service';

export interface TechRosterItem {
  technicianId: string;
  technicianName: string;
  email: string;
  siteId?: string;
  siteName?: string;
  status: 'ON_SITE' | 'OFF_SITE';
  distanceMeters: number;
  speedKmh?: number;
  currentActivity?: string;
  activeRoNumber?: string;
  lastPingAt?: string;
}

export const ROOFTOP_FILTER_OPTIONS = [
  { id: 'all', label: 'All Rooftops' },
  { id: 'site_cranbourne_byd', label: 'BYD Cranbourne' },
  { id: 'site_dandenong_hyundai', label: 'Hyundai Dandenong' },
  { id: 'site_cheltenham_kia', label: 'Kia Cheltenham' },
  { id: 'site_cranbourne_mg', label: 'MG Cranbourne' },
  { id: 'site_berwick_chery', label: 'Chery Berwick' },
  { id: 'site_south_melbourne_byd', label: 'BYD S. Melbourne' },
];

const FALLBACK_STAFF_ROSTER: TechRosterItem[] = [
  {
    technicianId: 'usr_tech_1',
    technicianName: 'Marcus Vance',
    email: 'marcus.v@booran.com.au',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'OFF_SITE',
    distanceMeters: 1850,
    speedKmh: 48,
    currentActivity: 'ROAD_TEST',
    activeRoNumber: 'RO-48291',
    lastPingAt: new Date(Date.now() - 45000).toISOString(),
  },
  {
    technicianId: 'usr_tech_4',
    technicianName: 'Jake Smith',
    email: 'technician@booran.com.au',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'OFF_SITE',
    distanceMeters: 1329,
    speedKmh: 58,
    currentActivity: 'ROAD_TEST',
    activeRoNumber: 'CR-53542',
    lastPingAt: new Date(Date.now() - 35000).toISOString(),
  },
  {
    technicianId: 'usr_tech_6',
    technicianName: 'Abdul Ahad',
    email: 'abdulahadnauman10@gmail.com',
    siteId: 'site_dandenong_multi',
    siteName: 'Booran Dandenong Multi-Franchise',
    status: 'OFF_SITE',
    distanceMeters: 15568,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    technicianId: 'usr_tech_2',
    technicianName: 'Sarah Jenkins',
    email: 'sarah.j@booran.com.au',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'ON_SITE',
    distanceMeters: 42,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 15000).toISOString(),
  },
  {
    technicianId: 'usr_tech_3',
    technicianName: 'David Chen',
    email: 'david.c@booran.com.au',
    siteId: 'site_dandenong_hyundai',
    siteName: 'Booran Hyundai Dandenong',
    status: 'ON_SITE',
    distanceMeters: 28,
    speedKmh: 0,
    currentActivity: 'INSPECTION',
    activeRoNumber: 'RO-48319',
    lastPingAt: new Date(Date.now() - 80000).toISOString(),
  },
  {
    technicianId: 'usr_tech_8',
    technicianName: 'Shaun Sumaru',
    email: 'shaun.sumaru@gmail.com',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'ON_SITE',
    distanceMeters: 15,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 110000).toISOString(),
  },
  {
    technicianId: 'usr_tech_9',
    technicianName: 'Talha Tariq',
    email: 'devs@omnisuiteai.com',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'ON_SITE',
    distanceMeters: 29,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 140000).toISOString(),
  },
  {
    technicianId: 'usr_tech_5',
    technicianName: 'Aaron Miller',
    email: 'aaron.m@booran.com.au',
    siteId: 'site_cheltenham_kia',
    siteName: 'Booran Kia Cheltenham',
    status: 'ON_SITE',
    distanceMeters: 32,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 40000).toISOString(),
  },
  {
    technicianId: 'usr_tech_7',
    technicianName: 'Ahmed Fahim',
    email: 'm.ahmed.fahim02@gmail.com',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'ON_SITE',
    distanceMeters: 41,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 95000).toISOString(),
  },
  {
    technicianId: 'usr_tech_10',
    technicianName: 'John Doe',
    email: 'johndoe@booran.com.au',
    siteId: 'site_cranbourne_byd',
    siteName: 'Booran BYD Cranbourne',
    status: 'ON_SITE',
    distanceMeters: 24,
    speedKmh: 0,
    currentActivity: 'WORKSHOP',
    lastPingAt: new Date(Date.now() - 170000).toISOString(),
  },
];

interface RoadTestScreenProps {
  onOpenTickets: () => void;
  onOpenVehicles: () => void;
  onOpenLoaners: () => void;
  onOpenProfile: () => void;
}

type SubTab = 'live' | 'history' | 'settings';

export function RoadTestScreen({
  onOpenTickets,
  onOpenVehicles,
  onOpenLoaners,
  onOpenProfile,
}: RoadTestScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CLERK' || user?.role === 'SERVICE_MANAGER';

  const {
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
    setFenceRadius,
    tripRecords,
    armVehicle,
    disarmVehicle,
    startDemoDrive,
    resetDemo,
    startLiveDrive,
    finishLiveDrive,
    recordLivePoint,
    loadVehicleByROOrRego,
  } = useRoadTest();

  const {
    presenceStatus,
    insideGeofence,
    distanceMeters,
    siteName,
    radiusMeters,
    currentActivity,
    activeRoNumber,
    lastPingAt,
    setPresenceActivity,
    updateSiteRadius,
    hasLocationPermission,
    requestLocationAccess,
    gpsMode,
    switchToLiveMode,
    liveCoords,
  } = useGeofence();
  const isOnSite = presenceStatus === 'ON_SITE';
  const effectiveRadius = radiusMeters || fenceRadius || 200;

  // Stream real-time live GPS coordinates into the road test recorder
  useEffect(() => {
    if (isLiveDrive && liveCoords) {
      recordLivePoint(
        liveCoords.latitude,
        liveCoords.longitude,
        liveCoords.speedKmh ?? 0,
        insideGeofence
      );
    }
  }, [isLiveDrive, liveCoords, insideGeofence, recordLivePoint]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('live');
  const [searchQuery, setSearchQuery] = useState('RO-48291');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(tripRecords[0]?.id || null);
  const [filterType, setFilterType] = useState<'all' | 'flagged' | 'week'>('all');

  // Dealership Staff Roster State
  const [selectedRosterSiteId, setSelectedRosterSiteId] = useState<string>('all');
  const [roster, setRoster] = useState<TechRosterItem[]>(FALLBACK_STAFF_ROSTER);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'ON_SITE' | 'OFF_SITE'>('ALL');

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const siteToQuery = selectedRosterSiteId || 'all';
      const res: any = await mobileGeofenceService.getSiteRoster(siteToQuery);
      if (res && Array.isArray(res.roster)) {
        // Dealership Staff Roster is strictly for technicians
        const techniciansOnly = res.roster.filter(
          (t: TechRosterItem) =>
            !t.email?.toLowerCase().includes('hammadak05') &&
            !t.technicianName?.toLowerCase().includes('admin')
        );
        if (techniciansOnly.length > 0) {
          setRoster(techniciansOnly);
        }
      }
    } catch (e) {
      console.warn('Failed to load live staff roster:', e);
    } finally {
      setLoadingRoster(false);
    }
  }, [selectedRosterSiteId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (activeSubTab === 'settings') {
      const interval = setInterval(loadRoster, 4000);
      return () => clearInterval(interval);
    }
  }, [activeSubTab, loadRoster]);

  // Real-time integration: dynamically merge logged-in technician's live telemetry
  const liveTechnicianList = useMemo(() => {
    const baseList = roster.filter(
      (r) =>
        !r.email?.toLowerCase().includes('hammadak05') &&
        !r.technicianName?.toLowerCase().includes('admin')
    );

    return baseList.map((t) => {
      const isCurrentUser =
        user &&
        (t.technicianId === user.id ||
          t.email?.toLowerCase() === user.email?.toLowerCase() ||
          t.technicianName?.toLowerCase() === user.name?.toLowerCase());

      if (isCurrentUser) {
        return {
          ...t,
          status: presenceStatus,
          distanceMeters: distanceMeters,
          currentActivity: currentActivity,
          activeRoNumber: activeRoNumber || t.activeRoNumber,
          speedKmh: isLiveDrive ? (speedKph || 0) : (presenceStatus === 'OFF_SITE' ? (speedKph || 48) : 0),
          lastPingAt: lastPingAt ? lastPingAt.toISOString() : t.lastPingAt,
        };
      }
      return t;
    });
  }, [roster, user, presenceStatus, distanceMeters, currentActivity, activeRoNumber, isLiveDrive, speedKph, lastPingAt]);

  const siteFilteredRoster = useMemo(() => {
    if (!selectedRosterSiteId || selectedRosterSiteId === 'all') {
      return liveTechnicianList;
    }
    return liveTechnicianList.filter(
      (r) => r.siteId === selectedRosterSiteId || !r.siteId
    );
  }, [liveTechnicianList, selectedRosterSiteId]);

  const rosterOnSiteCount = siteFilteredRoster.filter((r) => r.status === 'ON_SITE').length;
  const rosterOffSiteCount = siteFilteredRoster.filter((r) => r.status === 'OFF_SITE').length;

  const filteredRoster = useMemo(() => {
    return siteFilteredRoster.filter((r) => {
      if (rosterFilter === 'ON_SITE') return r.status === 'ON_SITE';
      if (rosterFilter === 'OFF_SITE') return r.status === 'OFF_SITE';
      return true;
    });
  }, [siteFilteredRoster, rosterFilter]);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  useEffect(() => {
    setUnreadNotifCount(notificationsService.getUnreadCount());
    const unsubscribe = notificationsService.onNotification(() => {
      setUnreadNotifCount(notificationsService.getUnreadCount());
    });
    return () => unsubscribe();
  }, []);

  const handleNotificationSelect = (_notif: AppNotificationPayload) => {
    onOpenTickets();
  };

  const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    loadVehicleByROOrRego(searchQuery);
  };

  const statusInfo =
    tripState === 'outside'
      ? { label: 'ROAD TEST IN PROGRESS', title: 'Vehicle outside workshop zone', color: colors.primary }
      : tripState === 'returned'
      ? { label: 'ROAD TEST SAVED', title: 'Vehicle returned automatically', color: colors.success }
      : { label: 'VEHICLE ARMED', title: 'Ready inside workshop boundary', color: colors.accentCyan };

  const filteredTrips = tripRecords.filter((t) => {
    if (filterType === 'flagged') return t.outcome === 'Flagged';
    return true;
  });

  return (
    <View style={styles.screen}>
      {/* Clean App Header: Logo left, Notification Bell right */}
      <Header
        showBrandLogo
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setShowNotifModal(true);
            }}
            style={styles.bellBtn}
            accessibilityLabel="Warranty Alerts"
          >
            <Bell size={20} color="#FFFFFF" />
            {unreadNotifCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* 2. Sub-Tabs Bar */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveSubTab('live')}
          style={[styles.subTabItem, activeSubTab === 'live' && styles.subTabItemActive]}
        >
          <Navigation size={14} color={activeSubTab === 'live' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.subTabText, activeSubTab === 'live' && styles.subTabTextActive]}>
            Live Drive
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveSubTab('history')}
          style={[styles.subTabItem, activeSubTab === 'history' && styles.subTabItemActive]}
        >
          <Clock size={14} color={activeSubTab === 'history' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.subTabText, activeSubTab === 'history' && styles.subTabTextActive]}>
            Trip History ({tripRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveSubTab('settings')}
          style={[styles.subTabItem, activeSubTab === 'settings' && styles.subTabItemActive]}
        >
          <Sliders size={14} color={activeSubTab === 'settings' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.subTabText, activeSubTab === 'settings' && styles.subTabTextActive]}>
            Staff & Geofence
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Main Body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeSubTab === 'live' && (
          <>
            {/* Search Lookup Bar */}
            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <View style={styles.inputWrap}>
                  <Search size={18} color={colors.textMuted} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    placeholder="Search RO, Rego, or VIN"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    style={styles.searchInput}
                  />
                </View>
                <TouchableOpacity activeOpacity={0.8} onPress={handleSearch} style={styles.searchBtn}>
                  <Text style={styles.searchBtnText}>Lookup</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickChipsRow}>
                <Text style={styles.chipsLabel}>QUICK DEMO:</Text>
                {['RO-48291', 'BWM 882', 'VIC 901'].map((code) => (
                  <TouchableOpacity
                    key={code}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSearchQuery(code);
                      loadVehicleByROOrRego(code);
                    }}
                    style={styles.chipBtn}
                  >
                    <Text style={styles.chipBtnText}>{code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Summary Card */}
            {vehicle ? (
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleTop}>
                  <View style={styles.carBadgeWrap}>
                    <Car size={22} color={colors.primary} />
                  </View>
                  <View style={styles.vehicleNameWrap}>
                    <Text style={styles.vehicleTitle}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </Text>
                    <Text style={styles.vehicleSub}>
                      {vehicle.variant} • {vehicle.colour}
                    </Text>
                  </View>
                  <View style={styles.regoPlate}>
                    <Text style={styles.regoText}>{vehicle.registration}</Text>
                  </View>
                </View>

                <View style={styles.vehicleDetailsGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>REPAIR ORDER</Text>
                    <Text style={styles.detailValue}>{vehicle.repairOrder}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>CUSTOMER</Text>
                    <Text style={styles.detailValue}>{vehicle.customerName}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>ODOMETER</Text>
                    <Text style={styles.detailValue}>{vehicle.odometerKm.toLocaleString()} km</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>VIN</Text>
                    <Text style={styles.detailValue}>...{vehicle.vin.slice(-6)}</Text>
                  </View>
                </View>

                <View style={styles.concernBox}>
                  <Text style={styles.concernLabel}>CUSTOMER FAULT CONCERN</Text>
                  <Text style={styles.concernText}>{vehicle.concern}</Text>
                </View>

                {/* Geofence Boundary Status */}
                <View style={styles.fenceRow}>
                  <View style={[styles.fenceIcon, !isOnSite && styles.fenceIconOffSite]}>
                    <MapPin size={16} color={isOnSite ? colors.success : '#F59E0B'} />
                  </View>
                  <View style={styles.fenceTextWrap}>
                    <Text style={styles.fenceTitle}>
                      {isOnSite ? 'Technician ON-SITE (Inside Workshop)' : 'Technician OFF-SITE (Outside Boundary)'}
                    </Text>
                    <Text style={styles.fenceSub}>
                      {siteName} • ~{distanceMeters}m from center (Boundary: {effectiveRadius}m)
                    </Text>
                  </View>
                  <View style={[styles.fenceStatusDot, isOnSite ? styles.fenceStatusDotActive : styles.fenceStatusDotOffSite]} />
                </View>
              </View>
            ) : null}

            {/* Live SVG Route Map */}
            <View style={styles.mapWrap}>
              <RoadTestRouteMap points={routePoints} state={tripState} />
            </View>

            {/* Speedometer & Telemetry Dashboard */}
            <View style={styles.telemetryGrid}>
              {/* Giant Speed Gauge Card */}
              <View style={styles.speedGaugeCard}>
                <View style={styles.gaugeIconWrap}>
                  <Gauge size={18} color={colors.primaryLight} />
                </View>
                <Text style={styles.speedNumber}>{speedKph}</Text>
                <Text style={styles.speedUnit}>KM/H</Text>
                <Text style={styles.speedLabel}>CURRENT SPEED</Text>
              </View>

              {/* Stats Columns */}
              <View style={styles.metricColumn}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>TRAVEL TIME</Text>
                  <Text style={styles.statCardValue}>{formatClock(elapsedSec)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>DISTANCE</Text>
                  <Text style={styles.statCardValue}>{distanceKm.toFixed(1)} km</Text>
                </View>
              </View>

              <View style={styles.metricColumn}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>MAX SPEED</Text>
                  <Text style={styles.statCardValue}>{maxSpeedKph} km/h</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardLabel}>GPS STATUS</Text>
                  <Text
                    style={[
                      styles.statCardValue,
                      { color: tripState === 'outside' ? colors.primary : colors.success },
                    ]}
                  >
                    {tripState === 'outside' ? 'Recording' : tripState === 'returned' ? 'Saved' : 'Armed'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Automation Milestone Log */}
            <View style={styles.timelineCard}>
              <Text style={styles.timelineSectionTitle}>AUTOMATION MILESTONE LOG</Text>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <Check size={11} color="#FFFFFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Vehicle Armed to RO</Text>
                  <Text style={styles.timelineSub}>
                    {vehicle?.repairOrder} paired with mobile tracking sensor
                  </Text>
                </View>
                <Text style={styles.timelineTime}>Ready</Text>
              </View>

              <View style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    tripState !== 'inside' ? styles.timelineDotDone : null,
                    tripState === 'outside' ? styles.timelineDotActive : null,
                  ]}
                >
                  {tripState !== 'inside' ? <Check size={11} color="#FFFFFF" /> : null}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Workshop Geofence Exit</Text>
                  <Text style={styles.timelineSub}>
                    Speed, route, and duration tracking automatically triggered
                  </Text>
                </View>
                <Text style={styles.timelineTime}>
                  {tripState === 'inside' ? 'Waiting' : 'Triggered'}
                </Text>
              </View>

              <View style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    tripState === 'returned' ? styles.timelineDotDone : null,
                  ]}
                >
                  {tripState === 'returned' ? <Check size={11} color="#FFFFFF" /> : null}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Workshop Geofence Return</Text>
                  <Text style={styles.timelineSub}>
                    Trip stopped and road test evidence log compiled
                  </Text>
                </View>
                <Text style={styles.timelineTime}>
                  {tripState === 'returned' ? 'Saved' : 'Pending'}
                </Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={demoRunning}
              onPress={() => {
                if (tripState === 'returned') {
                  setPresenceActivity('WORKSHOP');
                  resetDemo();
                } else if (isLiveDrive) {
                  setPresenceActivity('WORKSHOP');
                  finishLiveDrive();
                } else if (armed) {
                  setPresenceActivity('ROAD_TEST', vehicle?.repairOrder);
                  if (gpsMode === 'LIVE') {
                    startLiveDrive();
                  } else {
                    startDemoDrive();
                  }
                } else {
                  armVehicle();
                }
              }}
              style={[
                styles.primaryActionBtn,
                demoRunning && styles.primaryActionBtnDisabled,
                isLiveDrive && { backgroundColor: '#DC2626' },
              ]}
            >
              {tripState === 'returned' ? (
                <RotateCcw size={20} color="#FFFFFF" />
              ) : isLiveDrive ? (
                <CheckCircle2 size={20} color="#FFFFFF" />
              ) : (
                <Play size={20} color="#FFFFFF" />
              )}
              <Text style={styles.primaryActionBtnText}>
                {demoRunning
                  ? 'SIMULATING ROAD TEST DRIVE...'
                  : tripState === 'returned'
                  ? 'RESET ROAD TEST'
                  : isLiveDrive
                  ? 'FINISH LIVE ROAD TEST (OR RETURN TO DEALERSHIP)'
                  : armed
                  ? gpsMode === 'LIVE'
                    ? 'START LIVE GPS ROAD TEST'
                    : 'START ROAD TEST DRIVE'
                  : 'ARM VEHICLE'}
              </Text>
            </TouchableOpacity>

            {armed && !isLiveDrive && !demoRunning && tripState !== 'returned' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                {gpsMode === 'LIVE' ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setPresenceActivity('ROAD_TEST', vehicle?.repairOrder);
                      startDemoDrive();
                    }}
                    style={[styles.disarmBtn, { flex: 1, backgroundColor: '#F1F5F9' }]}
                  >
                    <Text style={[styles.disarmBtnText, { color: '#475569' }]}>⚡ Run Demo Simulation</Text>
                  </TouchableOpacity>
                ) : null}

                {tripState === 'inside' ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setPresenceActivity('WORKSHOP');
                      disarmVehicle();
                    }}
                    style={[styles.disarmBtn, { flex: 1 }]}
                  >
                    <Text style={styles.disarmBtnText}>Disarm tracking</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {activeSubTab === 'history' && (
          <View style={styles.historyContainer}>
            {/* KPI Summary Row */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiNumber}>{tripRecords.length}</Text>
                <Text style={styles.kpiLabel}>TOTAL DRIVES</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiNumber}>74 km/h</Text>
                <Text style={styles.kpiLabel}>AVG MAX SPEED</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiNumber, { color: colors.success }]}>100%</Text>
                <Text style={styles.kpiLabel}>AUTO CAPTURED</Text>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilterType('all')}
                style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]}
              >
                <Text
                  style={[styles.filterPillText, filterType === 'all' && styles.filterPillTextActive]}
                >
                  All Trips
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFilterType('flagged')}
                style={[styles.filterPill, filterType === 'flagged' && styles.filterPillActive]}
              >
                <Text
                  style={[styles.filterPillText, filterType === 'flagged' && styles.filterPillTextActive]}
                >
                  Flagged Only
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trip Cards List */}
            {filteredTrips.map((item) => {
              const isExpanded = expandedTripId === item.id;
              const isFlagged = item.outcome === 'Flagged';

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setExpandedTripId(isExpanded ? null : item.id)}
                  style={styles.tripCard}
                >
                  <View style={styles.tripCardHeader}>
                    <View
                      style={[
                        styles.outcomeIcon,
                        isFlagged ? styles.outcomeIconFlagged : styles.outcomeIconPassed,
                      ]}
                    >
                      {isFlagged ? (
                        <Flag size={15} color={colors.danger} />
                      ) : (
                        <Check size={15} color={colors.success} />
                      )}
                    </View>
                    <View style={styles.tripCardTitleWrap}>
                      <Text style={styles.tripCardVehicle}>{item.vehicleLabel}</Text>
                      <Text style={styles.tripCardMeta}>
                        {item.registration} • {item.repairOrder}
                      </Text>
                    </View>
                    <View style={styles.tripCardDateWrap}>
                      <Text style={styles.tripCardDate}>{item.dateLabel}</Text>
                      <Text style={styles.tripCardTime}>{item.startTime}</Text>
                    </View>
                  </View>

                  <View style={styles.tripStatsRow}>
                    <View style={styles.tripStat}>
                      <Text style={styles.tripStatLabel}>DURATION</Text>
                      <Text style={styles.tripStatVal}>{item.duration}</Text>
                    </View>
                    <View style={styles.tripStat}>
                      <Text style={styles.tripStatLabel}>DISTANCE</Text>
                      <Text style={styles.tripStatVal}>{item.distanceKm} km</Text>
                    </View>
                    <View style={styles.tripStat}>
                      <Text style={styles.tripStatLabel}>MAX SPEED</Text>
                      <Text style={styles.tripStatVal}>{item.maxSpeedKph} km/h</Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={18} color={colors.textMuted} />
                    ) : (
                      <ChevronDown size={18} color={colors.textMuted} />
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedTripSection}>
                      <RoadTestRouteMap points={routePoints} state="returned" compact />
                      <View style={styles.technicianNoteBox}>
                        <Text style={styles.technicianNoteLabel}>
                          TECHNICIAN NOTE ({item.technician})
                        </Text>
                        <Text style={styles.technicianNoteText}>{item.note}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeSubTab === 'settings' && (
          <View style={styles.settingsContainer}>
            {/* Live Presence Status Card */}
            <View style={styles.settingsSectionCard}>
              <View style={styles.settingsHeaderRow}>
                <View>
                  <Text style={styles.settingsKicker}>MY GEOFENCE PRESENCE</Text>
                  <Text style={styles.settingsTitle}>{siteName}</Text>
                </View>
                <View
                  style={[
                    styles.presenceStatusPill,
                    isOnSite ? styles.presenceStatusPillOnSite : styles.presenceStatusPillOffSite,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.pulseDot,
                      { backgroundColor: isOnSite ? '#10B981' : '#F59E0B', opacity: pulseAnim },
                    ]}
                  />
                  <Text
                    style={[
                      styles.presenceStatusPillText,
                      { color: isOnSite ? '#065F46' : '#92400E' },
                    ]}
                  >
                    {isOnSite ? 'ON-SITE' : 'OFF-SITE'}
                  </Text>
                </View>
              </View>

              <Text style={styles.settingsHelperText}>
                {isOnSite
                  ? `Technician detected within dealership perimeter (~${distanceMeters}m from center). Ready for workshop repairs.`
                  : `Technician outside dealership perimeter (~${(distanceMeters / 1000).toFixed(2)} km away). Active road-test or off-site.`}
              </Text>

              <View style={styles.presenceMetaRow}>
                <View style={styles.presenceMetaItem}>
                  <Text style={styles.presenceMetaLabel}>CURRENT DISTANCE</Text>
                  <Text style={styles.presenceMetaValue}>
                    {isOnSite ? `~${distanceMeters} m` : `${(distanceMeters / 1000).toFixed(2)} km`}
                  </Text>
                </View>
                <View style={styles.presenceMetaItem}>
                  <Text style={styles.presenceMetaLabel}>ROOFTOP RADIUS</Text>
                  <Text style={styles.presenceMetaValue}>{effectiveRadius} m</Text>
                </View>
                <View style={styles.presenceMetaItem}>
                  <Text style={styles.presenceMetaLabel}>GPS SOURCE</Text>
                  <Text style={[styles.presenceMetaValue, { color: gpsMode === 'LIVE' ? '#10B981' : '#F59E0B' }]}>
                    {gpsMode === 'LIVE' ? '🟢 LIVE GPS' : 'SIMULATED'}
                  </Text>
                </View>
              </View>

              {!hasLocationPermission && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={requestLocationAccess}
                  style={[styles.simToggleBtn, { backgroundColor: '#1E40AF', marginBottom: 8 }]}
                >
                  <Text style={styles.simToggleBtnText}>
                    📍 GRANT DEVICE LOCATION PERMISSION
                  </Text>
                </TouchableOpacity>
              )}

              {gpsMode === 'SIMULATED' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={switchToLiveMode}
                  style={[styles.simToggleBtn, { backgroundColor: '#059669' }]}
                >
                  <Text style={styles.simToggleBtnText}>
                    SWITCH TO LIVE GPS TRACKING
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Workshop Boundary Policy Card */}
            <View style={styles.settingsSectionCard}>
              <View style={styles.settingsHeaderRow}>
                <View>
                  <Text style={styles.settingsKicker}>
                    {isAdmin ? 'ADMIN CONTROL • BOUNDARY POLICY' : 'WORKSHOP BOUNDARY POLICY'}
                  </Text>
                  <Text style={styles.settingsTitle}>Site Geofence Radius</Text>
                </View>
                <View style={styles.radiusPill}>
                  <Text style={styles.radiusPillText}>{effectiveRadius} m</Text>
                </View>
              </View>

              <Text style={styles.settingsHelperText}>
                Telemetry and road test tracking begins automatically when the vehicle exits this boundary and stops upon returning.
              </Text>

              {isAdmin ? (
                <View style={styles.adminEditorContainer}>
                  <View style={styles.adminBadgeRow}>
                    <Shield size={14} color={colors.primary} />
                    <Text style={styles.adminBadgeText}>
                      Admin Access ({user?.email}) • Tap to Adjust:
                    </Text>
                  </View>
                  <View style={styles.radiusButtonsRow}>
                    {[100, 150, 200, 250, 350, 500].map((rad) => (
                      <TouchableOpacity
                        key={rad}
                        activeOpacity={0.7}
                        onPress={() => {
                          setFenceRadius(rad);
                          updateSiteRadius(rad);
                        }}
                        style={[
                          styles.radiusBtn,
                          effectiveRadius === rad && styles.radiusBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.radiusBtnText,
                            effectiveRadius === rad && styles.radiusBtnTextActive,
                          ]}
                        >
                          {rad}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.adminSyncHint}>
                    ✓ Updates {siteName} & synchronizes across all staff in real-time.
                  </Text>
                </View>
              ) : (
                <View style={styles.adminLockedBanner}>
                  <Shield size={14} color="#64748B" />
                  <Text style={styles.adminLockedText}>
                    Managed by Group Admins. Configured centrally across all rooftops.
                  </Text>
                </View>
              )}
            </View>

            {/* Live Dealership Rooftop Staff Roster (Visible to All Staff & Admins) */}
            <View style={styles.settingsSectionCard}>
              <View style={styles.settingsHeaderRow}>
                <View>
                  <Text style={styles.settingsKicker}>ALL TECHNICIANS PRESENCE</Text>
                  <Text style={styles.settingsTitle}>Dealership Staff Roster</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={loadRoster}
                  style={styles.refreshRosterBtn}
                >
                  <RotateCcw size={12} color={colors.primary} />
                  <Text style={styles.refreshRosterBtnText}>
                    {loadingRoster ? 'Loading...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Summary KPI Cards matching Web */}
              <View style={styles.rosterKpiRow}>
                <View style={styles.rosterKpiCard}>
                  <Text style={styles.rosterKpiLabel}>TOTAL TRACKED</Text>
                  <View style={styles.rosterKpiValRow}>
                    <Text style={styles.rosterKpiVal}>{siteFilteredRoster.length}</Text>
                    <Text style={styles.rosterKpiSub}>techs</Text>
                  </View>
                </View>

                <View style={[styles.rosterKpiCard, styles.rosterKpiCardOnSite]}>
                  <View style={styles.rosterKpiLabelRow}>
                    <Text style={[styles.rosterKpiLabel, { color: '#065F46' }]}>ON-SITE</Text>
                    <View style={[styles.pulseDot, { backgroundColor: '#10B981', width: 6, height: 6 }]} />
                  </View>
                  <View style={styles.rosterKpiValRow}>
                    <Text style={[styles.rosterKpiVal, { color: '#059669' }]}>{rosterOnSiteCount}</Text>
                    <Text style={[styles.rosterKpiSub, { color: '#047857' }]}>in bay</Text>
                  </View>
                </View>

                <View style={[styles.rosterKpiCard, styles.rosterKpiCardOffSite]}>
                  <View style={styles.rosterKpiLabelRow}>
                    <Text style={[styles.rosterKpiLabel, { color: '#92400E' }]}>OFF-SITE</Text>
                    <Animated.View
                      style={[
                        styles.pulseDot,
                        { backgroundColor: '#F59E0B', width: 6, height: 6, opacity: pulseAnim },
                      ]}
                    />
                  </View>
                  <View style={styles.rosterKpiValRow}>
                    <Text style={[styles.rosterKpiVal, { color: '#D97706' }]}>{rosterOffSiteCount}</Text>
                    <Text style={[styles.rosterKpiSub, { color: '#B45309' }]}>active test</Text>
                  </View>
                </View>
              </View>

              {/* Rooftop Scoping Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rooftopScroll}>
                {ROOFTOP_FILTER_OPTIONS.map((siteOpt) => {
                  const isSelected = selectedRosterSiteId === siteOpt.id;
                  return (
                    <TouchableOpacity
                      key={siteOpt.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedRosterSiteId(siteOpt.id)}
                      style={[styles.rooftopPill, isSelected && styles.rooftopPillActive]}
                    >
                      <Text style={[styles.rooftopPillText, isSelected && styles.rooftopPillTextActive]}>
                        {siteOpt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Status Filter Pills */}
              <View style={styles.rosterFilterRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setRosterFilter('ALL')}
                  style={[styles.rosterFilterPill, rosterFilter === 'ALL' && styles.rosterFilterPillActive]}
                >
                  <Text style={[styles.rosterFilterText, rosterFilter === 'ALL' && styles.rosterFilterTextActive]}>
                    All ({siteFilteredRoster.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setRosterFilter('ON_SITE')}
                  style={[styles.rosterFilterPill, rosterFilter === 'ON_SITE' && styles.rosterFilterPillActive]}
                >
                  <View style={[styles.pulseDot, { backgroundColor: '#10B981', width: 6, height: 6 }]} />
                  <Text style={[styles.rosterFilterText, rosterFilter === 'ON_SITE' && styles.rosterFilterTextActive]}>
                    On-Site ({rosterOnSiteCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setRosterFilter('OFF_SITE')}
                  style={[styles.rosterFilterPill, rosterFilter === 'OFF_SITE' && styles.rosterFilterPillActive]}
                >
                  <Animated.View
                    style={[
                      styles.pulseDot,
                      { backgroundColor: '#F59E0B', width: 6, height: 6, opacity: pulseAnim },
                    ]}
                  />
                  <Text style={[styles.rosterFilterText, rosterFilter === 'OFF_SITE' && styles.rosterFilterTextActive]}>
                    Off-Site ({rosterOffSiteCount})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Technicians List with Rich Telemetry Matching Web */}
              <View style={styles.rosterListWrap}>
                {filteredRoster.length === 0 ? (
                  <Text style={styles.emptyRosterText}>No technicians matching this filter.</Text>
                ) : (
                  filteredRoster.map((tech) => {
                    const techIsOnSite = tech.status === 'ON_SITE';
                    const isCurrentUser =
                      user &&
                      (tech.technicianId === user.id ||
                        tech.email?.toLowerCase() === user.email?.toLowerCase() ||
                        tech.technicianName?.toLowerCase() === user.name?.toLowerCase());

                    const lastPingFormatted = tech.lastPingAt
                      ? new Date(tech.lastPingAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now';

                    return (
                      <View
                        key={tech.technicianId}
                        style={[
                          styles.techRosterCard,
                          !techIsOnSite && styles.techRosterCardOffSite,
                        ]}
                      >
                        <View style={styles.techRosterTop}>
                          <View
                            style={[
                              styles.techAvatar,
                              !techIsOnSite && styles.techAvatarOffSite,
                            ]}
                          >
                            <Text
                              style={[
                                styles.techAvatarText,
                                !techIsOnSite && styles.techAvatarTextOffSite,
                              ]}
                            >
                              {tech.technicianName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.techInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.techName}>{tech.technicianName}</Text>
                              {isCurrentUser && (
                                <View style={styles.youBadge}>
                                  <Text style={styles.youBadgeText}>YOU</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.techEmail}>{tech.email}</Text>
                            {tech.siteName ? (
                              <Text style={styles.techSiteName}>{tech.siteName}</Text>
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.presenceStatusPill,
                              techIsOnSite
                                ? styles.presenceStatusPillOnSite
                                : styles.presenceStatusPillOffSite,
                            ]}
                          >
                            <Animated.View
                              style={[
                                styles.pulseDot,
                                {
                                  backgroundColor: techIsOnSite ? '#10B981' : '#F59E0B',
                                  opacity: pulseAnim,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.presenceStatusPillText,
                                { color: techIsOnSite ? '#065F46' : '#92400E' },
                              ]}
                            >
                              {techIsOnSite ? 'ON-SITE' : 'OFF-SITE'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.techMetaRow}>
                          <View style={styles.techMetaCol}>
                            <Text style={styles.techMetaLabel}>PROXIMITY</Text>
                            <Text
                              style={[
                                styles.techMetaVal,
                                !techIsOnSite && { color: '#B45309', fontWeight: '800' },
                              ]}
                            >
                              {techIsOnSite
                                ? `~${tech.distanceMeters || 18}m (Inside Bay)`
                                : `~${((tech.distanceMeters || 1850) / 1000).toFixed(2)} km (Outside)`}
                            </Text>
                          </View>
                          <View style={styles.techMetaCol}>
                            <Text style={styles.techMetaLabel}>ACTIVITY</Text>
                            <View
                              style={[
                                styles.activityBadge,
                                tech.currentActivity === 'ROAD_TEST'
                                  ? styles.activityBadgeRoadTest
                                  : tech.currentActivity === 'INSPECTION'
                                  ? styles.activityBadgeInspection
                                  : styles.activityBadgeWorkshop,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.activityBadgeText,
                                  tech.currentActivity === 'ROAD_TEST'
                                    ? styles.activityBadgeTextRoadTest
                                    : tech.currentActivity === 'INSPECTION'
                                    ? styles.activityBadgeTextInspection
                                    : styles.activityBadgeTextWorkshop,
                                ]}
                              >
                                {tech.currentActivity || 'WORKSHOP'}
                              </Text>
                            </View>
                          </View>
                          {tech.activeRoNumber ? (
                            <View style={styles.techMetaCol}>
                              <Text style={styles.techMetaLabel}>ACTIVE RO</Text>
                              <Text
                                style={[
                                  styles.techMetaVal,
                                  { color: colors.primary, fontWeight: '900' },
                                ]}
                              >
                                {tech.activeRoNumber}
                              </Text>
                            </View>
                          ) : null}
                          <View style={styles.techMetaCol}>
                            <Text style={styles.techMetaLabel}>SPEED</Text>
                            <Text
                              style={[
                                styles.techMetaVal,
                                (tech.speedKmh ?? 0) > 0 && { color: '#0F172A', fontWeight: '900' },
                              ]}
                            >
                              {(tech.speedKmh ?? 0) > 0 ? `${tech.speedKmh} km/h` : '0 km/h'}
                            </Text>
                          </View>
                          <View style={styles.techMetaCol}>
                            <Text style={styles.techMetaLabel}>LAST PING</Text>
                            <Text style={styles.techMetaVal}>{lastPingFormatted}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            <View style={styles.privacyCard}>
              <Shield size={20} color={colors.primary} />
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>Technician Privacy Protected</Text>
                <Text style={styles.privacyText}>
                  Location tracking is strictly restricted to armed repair orders during active test
                  drives. No personal location history is stored outside customer warranty validation.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 4. Symmetrical 5-Item Bottom Navbar (Replacing Awaiting with Test Drive) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        {isAdmin ? (
          <>
            {/* 1. Test Drive (ACTIVE) */}
            <TouchableOpacity activeOpacity={0.7} style={styles.bottomBarTab}>
              <Gauge size={20} color={colors.primary} />
              <Text style={[styles.bottomBarLabel, { color: colors.primary }]}>Test Drive</Text>
            </TouchableOpacity>

            {/* 2. Vehicles */}
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenVehicles} style={styles.bottomBarTab}>
              <Car size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Vehicles</Text>
            </TouchableOpacity>

            {/* 3. Tickets */}
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenTickets} style={styles.bottomBarTab}>
              <FileText size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Tickets</Text>
            </TouchableOpacity>

            {/* 4. Loaners */}
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenLoaners} style={styles.bottomBarTab}>
              <Key size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Loaners</Text>
            </TouchableOpacity>

            {/* 5. Profile */}
            <TouchableOpacity activeOpacity={0.75} onPress={onOpenProfile} style={styles.bottomBarUserTab}>
              <View style={[styles.bottomBarAvatar, styles.bottomBarAvatarAdmin]}>
                <Text style={[styles.bottomBarAvatarText, styles.bottomBarAvatarTextAdmin]}>
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BM'}
                </Text>
              </View>
              <Text style={styles.bottomBarLabel} numberOfLines={1}>
                {user?.name ? user.name.trim().split(/\s+/)[0] : 'Profile'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Technician Layout */}
            {/* 1. Tickets */}
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenTickets} style={styles.bottomBarTab}>
              <FileText size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Tickets</Text>
            </TouchableOpacity>

            {/* 2. Vehicles */}
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenVehicles} style={styles.bottomBarTab}>
              <Car size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Vehicles</Text>
            </TouchableOpacity>

            {/* 3. Test Drive (ACTIVE - Center or Left) */}
            <TouchableOpacity activeOpacity={0.7} style={styles.bottomBarTab}>
              <Gauge size={20} color={colors.primary} />
              <Text style={[styles.bottomBarLabel, { color: colors.primary }]}>Test Drive</Text>
            </TouchableOpacity>

            {/* 4. Loaners */}
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenLoaners} style={styles.bottomBarTab}>
              <Key size={20} color={colors.textSecondary} />
              <Text style={styles.bottomBarLabel}>Loaners</Text>
            </TouchableOpacity>

            {/* 5. Profile */}
            <TouchableOpacity activeOpacity={0.75} onPress={onOpenProfile} style={styles.bottomBarUserTab}>
              <View style={styles.bottomBarAvatar}>
                <Text style={styles.bottomBarAvatarText}>
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BM'}
                </Text>
              </View>
              <Text style={styles.bottomBarLabel} numberOfLines={1}>
                {user?.name ? user.name.trim().split(/\s+/)[0] : 'Profile'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onSelectNotification={handleNotificationSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  bellBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveIndicatorOnSite: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveIndicatorOffSite: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  subTabItemActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.2)',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  chipsLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  chipBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  vehicleCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  vehicleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  carBadgeWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(215, 25, 32, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleNameWrap: {
    flex: 1,
  },
  vehicleTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  vehicleSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  regoPlate: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  regoText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  vehicleDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    rowGap: 8,
  },
  detailCol: {
    width: '50%',
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  concernBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  concernLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  concernText: {
    color: '#E2E8F0',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 15,
  },
  fenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  fenceIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fenceIconOffSite: {
    backgroundColor: '#FEF3C7',
  },
  fenceTextWrap: {
    flex: 1,
  },
  fenceTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  fenceSub: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 1,
  },
  fenceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#475569',
  },
  fenceStatusDotActive: {
    backgroundColor: colors.success,
  },
  fenceStatusDotOffSite: {
    backgroundColor: '#F59E0B',
  },
  mapWrap: {
    marginBottom: 12,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  speedGaugeCard: {
    flex: 1.1,
    minHeight: 130,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#1E293B',
    position: 'relative',
  },
  gaugeIconWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  speedNumber: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
    letterSpacing: -1,
  },
  speedUnit: {
    color: colors.primaryLight,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  speedLabel: {
    color: '#94A3B8',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  metricColumn: {
    flex: 1,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  statCardLabel: {
    color: '#94A3B8',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  statCardValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  timelineSectionTitle: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineSub: {
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 1,
  },
  timelineTime: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  primaryActionBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnDisabled: {
    opacity: 0.7,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  disarmBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  disarmBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  historyContainer: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.6,
    marginTop: 3,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outcomeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeIconPassed: {
    backgroundColor: '#ECFDF5',
  },
  outcomeIconFlagged: {
    backgroundColor: '#FEF2F2',
  },
  tripCardTitleWrap: {
    flex: 1,
  },
  tripCardVehicle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  tripCardMeta: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  tripCardDateWrap: {
    alignItems: 'flex-end',
  },
  tripCardDate: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  tripCardTime: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  tripStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tripStat: {
    flex: 1,
  },
  tripStatLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  tripStatVal: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  expandedTripSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  technicianNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  technicianNoteLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  technicianNoteText: {
    fontSize: 9.5,
    color: '#334155',
    marginTop: 3,
    lineHeight: 14,
  },
  settingsContainer: {
    gap: 12,
  },
  settingsSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsKicker: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  radiusPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.2)',
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  settingsHelperText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 14,
  },
  adminEditorContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  adminSyncHint: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.success,
    marginTop: 8,
  },
  radiusButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  radiusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radiusBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  radiusBtnTextActive: {
    color: '#FFFFFF',
  },
  adminLockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  adminLockedText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 14,
  },
  presenceStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  presenceStatusPillOnSite: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  presenceStatusPillOffSite: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  presenceStatusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  presenceMetaRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  presenceMetaItem: {
    flex: 1,
  },
  presenceMetaLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  presenceMetaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  simToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refreshRosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.2)',
  },
  refreshRosterBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  rosterFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  rosterFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rosterFilterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  rosterFilterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
  },
  rosterFilterTextActive: {
    color: '#FFFFFF',
  },
  rosterListWrap: {
    marginTop: 6,
    gap: 8,
  },
  emptyRosterText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  techRosterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  techRosterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  techAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  techEmail: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  techMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  techMetaCol: {
    flex: 1,
  },
  techMetaLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  techMetaVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  rosterKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  rosterKpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rosterKpiCardOnSite: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  rosterKpiCardOffSite: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  rosterKpiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rosterKpiLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  rosterKpiValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rosterKpiVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  rosterKpiSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  rooftopScroll: {
    marginBottom: 10,
  },
  rooftopPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  rooftopPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  rooftopPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  rooftopPillTextActive: {
    color: '#FFFFFF',
  },
  techRosterCardOffSite: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FDE68A',
  },
  techAvatarOffSite: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  techAvatarTextOffSite: {
    color: '#B45309',
  },
  techSiteName: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  activityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  activityBadgeWorkshop: {
    backgroundColor: '#F1F5F9',
  },
  activityBadgeRoadTest: {
    backgroundColor: '#FEE2E2',
    borderWidth: 0.5,
    borderColor: '#FCA5A5',
  },
  activityBadgeInspection: {
    backgroundColor: '#EFF6FF',
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  activityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  activityBadgeTextWorkshop: {
    color: '#475569',
  },
  activityBadgeTextRoadTest: {
    color: '#DC2626',
  },
  activityBadgeTextInspection: {
    color: '#2563EB',
  },
  privacyCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  privacyText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 13,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomBarTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 3,
  },
  bottomBarUserTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomBarAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(215, 25, 32, 0.08)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarAvatarAdmin: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  bottomBarAvatarText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
  },
  bottomBarAvatarTextAdmin: {
    color: '#D97706',
  },
});
