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
  Modal,
  Alert,
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
  Edit3,
  Trash2,
  Plus,
  X,
  ArrowRightLeft,
  Sparkles,
  Filter,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  useRoadTest,
  RoadTestTripRecord,
  RoadTestVehicle,
  INITIAL_DEMO_VEHICLES,
} from '../../context/RoadTestContext';
import { useGeofence } from '../../context/GeofenceContext';
import { RoadTestRouteMap } from '../../components/roadtest/RoadTestRouteMap';
import { Header } from '../../components/common/Header';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import {
  notificationsService,
  AppNotificationPayload,
} from '../../services/notifications.service';
import { mobileGeofenceService } from '../../services/geofence.service';
import { casesApi } from '../../api/cases.api';
import { rooftopVehiclesService } from '../../services/rooftopVehicles.service';

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
  const { user, activeSiteId } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CLERK' || user?.role === 'SERVICE_MANAGER';
  const technicianSiteId = user?.defaultSiteId || activeSiteId || 'site_cranbourne_byd';


  const {
    vehicle,
    setVehicle,
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
    pendingCompletion,
    saveDiagnosisAndComplete,
    cancelPendingCompletion,
    deleteTripRecord,
    updateTripRecord,
    createManualTripRecord,
  } = useRoadTest();

  // Vehicle Picker Modal States & Data
  const [showVehiclePickerModal, setShowVehiclePickerModal] = useState<boolean>(false);
  const [vehiclePickerSearch, setVehiclePickerSearch] = useState<string>('');
  const [vehiclePickerFilter, setVehiclePickerFilter] = useState<'all' | 'tickets' | 'fleet'>('all');
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);
  const [workshopVehicles, setWorkshopVehicles] = useState<RoadTestVehicle[]>(INITIAL_DEMO_VEHICLES);

  const [diagOutcome, setDiagOutcome] = useState<'Passed' | 'Flagged'>('Passed');
  const [diagNotes, setDiagNotes] = useState<string>('');
  const [savingDiag, setSavingDiag] = useState<boolean>(false);

  // Trip CRUD UI States
  const [editingTripItem, setEditingTripItem] = useState<any | null>(null);
  const [editTripOutcome, setEditTripOutcome] = useState<'Passed' | 'Flagged'>('Passed');
  const [editTripNotes, setEditTripNotes] = useState<string>('');
  const [showEditTripModal, setShowEditTripModal] = useState<boolean>(false);
  const [savingTripEdit, setSavingTripEdit] = useState<boolean>(false);

  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [createRoNumber, setCreateRoNumber] = useState<string>('RO-');
  const [createRego, setCreateRego] = useState<string>('');
  const [createVehicle, setCreateVehicle] = useState<string>('');
  const [createTripOutcome, setCreateTripOutcome] = useState<'Passed' | 'Flagged'>('Passed');
  const [createTripNotes, setCreateTripNotes] = useState<string>('');
  const [createTripDist, setCreateTripDist] = useState<string>('5.5');
  const [createTripSpeed, setCreateTripSpeed] = useState<string>('70');
  const [savingCreateTrip, setSavingCreateTrip] = useState<boolean>(false);

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
    customWorkshop,
    anchorWorkshopToLocation,
    resetWorkshopToDealership,
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
    if (!isAdmin) return;
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
  }, [isAdmin, selectedRosterSiteId]);

  useEffect(() => {
    if (isAdmin) {
      loadRoster();
    }
  }, [isAdmin, loadRoster]);

  useEffect(() => {
    if (isAdmin && activeSubTab === 'settings') {
      const interval = setInterval(loadRoster, 4000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, activeSubTab, loadRoster]);

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

  const loadWorkshopVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      const cases = await casesApi.getCases().catch(() => []);
      const targetSiteId = isAdmin ? 'all' : technicianSiteId;
      const fleetVehicles = rooftopVehiclesService.getVehiclesForRooftop(targetSiteId, cases);

      const mappedList: RoadTestVehicle[] = [];
      const seenKeys = new Set<string>();

      // 1. Live warranty cases from backend (scoped by rooftop for technicians)
      const targetCases = isAdmin
        ? cases
        : cases.filter(
          (c) =>
            !c.siteId ||
            c.siteId.toLowerCase() === technicianSiteId.toLowerCase()
        );

      for (const c of targetCases) {
        const key = (c.roNumber || c.vin || c.id || '').trim().toUpperCase();
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);

        const shortVin = c.vin ? c.vin.slice(-3) : 'TST';
        mappedList.push({
          id: c.id || `case-${key}`,
          registration: `VIC · ${shortVin}`,
          repairOrder: (c.roNumber || (c.vin ? `RO-${c.vin.slice(-5)}` : 'RO-LIVE')).toUpperCase(),
          customerName: c.technicianName ? `Assigned: ${c.technicianName}` : 'Customer Vehicle',
          make: c.make || 'OEM',
          model: c.model || 'Vehicle',
          year: c.year || new Date().getFullYear(),
          variant: c.powertrain || 'Standard',
          colour: 'Factory OEM',
          odometerKm: c.odometer || 15000,
          vin: (c.vin || 'VIN-UNKNOWN').toUpperCase(),
          concern: c.concernTitle || 'Warranty Road Test Diagnostic & Telemetry Verification',
          status: c.status || 'Active Claim',
          siteId: c.siteId || technicianSiteId,
          siteName: c.siteName || 'Booran Workshop',
        });
      }

      // 2. Dealership rooftop fleet vehicles (already scoped by targetSiteId above)
      for (const f of fleetVehicles) {
        const key = (f.roNumber || f.vin || f.rego || '').trim().toUpperCase();
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);

        mappedList.push({
          id: f.id,
          registration: f.rego.toUpperCase(),
          repairOrder: (f.roNumber || `RO-${f.id.slice(-5)}`).toUpperCase(),
          customerName: f.latestCase?.technicianName ? `Tech: ${f.latestCase.technicianName}` : 'Dealership Fleet',
          make: f.make,
          model: f.model,
          year: f.year,
          variant: f.powertrain || 'Workshop Fleet',
          colour: f.color || 'Standard',
          odometerKm: f.odometer || 12000,
          vin: f.vin.toUpperCase(),
          concern: f.concernTitle || 'Scheduled workshop assessment & road test',
          status: f.warrantyStatus || 'Under Warranty',
          siteId: f.siteId || technicianSiteId,
          siteName: f.siteName || 'Booran Dealership',
        });
      }

      // 3. Fallback initial demo vehicles (scoped to rooftop for technicians)
      const targetDemo = isAdmin
        ? INITIAL_DEMO_VEHICLES
        : INITIAL_DEMO_VEHICLES.filter(
          (d) =>
            !d.siteId ||
            d.siteId.toLowerCase() === technicianSiteId.toLowerCase()
        );

      for (const d of targetDemo) {
        const key = (d.repairOrder || d.registration).trim().toUpperCase();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          mappedList.push({
            ...d,
            status: 'Ready for Test',
            siteId: d.siteId || technicianSiteId,
            siteName: d.siteName || 'Booran Workshop',
          });
        }
      }

      setWorkshopVehicles(mappedList);

      // Auto-select first matching vehicle if current vehicle does not belong to this rooftop
      if (!isAdmin && mappedList.length > 0) {
        if (!vehicle || (vehicle.siteId && vehicle.siteId.toLowerCase() !== technicianSiteId.toLowerCase())) {
          setVehicle(mappedList[0]);
        }
      }
    } catch (e) {
      console.warn('Error loading workshop vehicles for road test:', e);
    } finally {
      setLoadingVehicles(false);
    }
  }, [isAdmin, technicianSiteId, setVehicle]);

  useEffect(() => {
    loadWorkshopVehicles();
  }, [loadWorkshopVehicles]);

  const filteredWorkshopVehicles = useMemo(() => {
    let list = workshopVehicles;

    if (vehiclePickerFilter === 'tickets') {
      list = list.filter(
        (v) =>
          v.status === 'Active Claim' ||
          v.status === 'Draft' ||
          v.status === 'Awaiting Review' ||
          v.status === 'Flagged' ||
          v.repairOrder.startsWith('RO-') ||
          v.repairOrder.startsWith('CR-')
      );
    } else if (vehiclePickerFilter === 'fleet') {
      list = list.filter(
        (v) =>
          v.status === 'Under Warranty' ||
          v.status === 'Inspection Required' ||
          v.status === 'Ready for Test' ||
          v.customerName.includes('Fleet')
      );
    }

    if (vehiclePickerSearch.trim()) {
      const q = vehiclePickerSearch.trim().toUpperCase();
      list = list.filter(
        (v) =>
          v.registration.toUpperCase().includes(q) ||
          v.repairOrder.toUpperCase().includes(q) ||
          v.make.toUpperCase().includes(q) ||
          v.model.toUpperCase().includes(q) ||
          v.vin.toUpperCase().includes(q) ||
          v.customerName.toUpperCase().includes(q) ||
          v.concern.toUpperCase().includes(q)
      );
    }

    return list;
  }, [workshopVehicles, vehiclePickerFilter, vehiclePickerSearch]);

  const handleSelectVehicle = (selected: RoadTestVehicle) => {
    setVehicle(selected);
    armVehicle();
    setSearchQuery(selected.repairOrder || selected.registration);
    setShowVehiclePickerModal(false);
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;

    const found = workshopVehicles.find(
      (v) =>
        v.repairOrder.toUpperCase().includes(q) ||
        v.registration.toUpperCase().includes(q) ||
        v.vin.toUpperCase().includes(q) ||
        v.customerName.toUpperCase().includes(q) ||
        `${v.make} ${v.model}`.toUpperCase().includes(q)
    );
    if (found) {
      handleSelectVehicle(found);
      return;
    }

    loadVehicleByROOrRego(searchQuery);
  };

  const statusInfo =
    tripState === 'outside'
      ? { label: 'ROAD TEST IN PROGRESS', title: 'Vehicle outside workshop zone', color: colors.primary }
      : tripState === 'returned'
        ? { label: 'ROAD TEST SAVED', title: 'Vehicle returned automatically', color: colors.success }
        : { label: 'VEHICLE ARMED', title: 'Ready inside workshop boundary', color: colors.accentCyan };

  // Rooftop-scoped trips: technicians see only their rooftop's trips; admins see all
  const rooftopFilteredTrips = useMemo(() => {
    if (isAdmin) {
      return tripRecords;
    }
    return tripRecords.filter((t) => {
      if (!t.siteId) return true;
      return t.siteId.toLowerCase() === technicianSiteId.toLowerCase();
    });
  }, [tripRecords, isAdmin, technicianSiteId]);

  const filteredTrips = rooftopFilteredTrips.filter((t) => {
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
          <Navigation size={13} color={activeSubTab === 'live' ? colors.primary : colors.textSecondary} />
          <Text
            numberOfLines={1}
            style={[styles.subTabText, activeSubTab === 'live' && styles.subTabTextActive]}
          >
            Live Drive
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveSubTab('history')}
          style={[styles.subTabItem, activeSubTab === 'history' && styles.subTabItemActive]}
        >
          <Clock size={13} color={activeSubTab === 'history' ? colors.primary : colors.textSecondary} />
          <Text
            numberOfLines={1}
            style={[styles.subTabText, activeSubTab === 'history' && styles.subTabTextActive]}
          >
            Trips ({rooftopFilteredTrips.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveSubTab('settings')}
          style={[styles.subTabItem, activeSubTab === 'settings' && styles.subTabItemActive]}
        >
          <Sliders size={13} color={activeSubTab === 'settings' ? colors.primary : colors.textSecondary} />
          <Text
            numberOfLines={1}
            style={[styles.subTabText, activeSubTab === 'settings' && styles.subTabTextActive]}
          >
            {isAdmin ? 'Staff Roster' : 'Geofence'}
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
            {/* Search Lookup Bar & Select Car Action */}
            <View style={styles.searchCard}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowVehiclePickerModal(true)}
                style={styles.selectCarBarBtn}
              >
                <View style={styles.selectCarIconBadge}>
                  <Car size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectCarBarTitle} numberOfLines={1}>
                    {vehicle
                      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                      : 'Select Car for Road Test'}
                  </Text>
                  <Text style={styles.selectCarBarSub} numberOfLines={1}>
                    {vehicle
                      ? `Plate: ${vehicle.registration} • RO: ${vehicle.repairOrder}`
                      : isAdmin
                        ? `Choose from ${workshopVehicles.length} cars across all dealerships`
                        : `Choose from ${workshopVehicles.length} cars at ${siteName || 'your workshop'}`}
                  </Text>
                </View>
                <View style={styles.selectCarActionPill}>
                  <Text style={styles.selectCarActionPillText}>
                    {vehicle ? 'Change Car' : 'Select Car'}
                  </Text>
                  <ChevronDown size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>

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
                <Text style={styles.chipsLabel}>QUICK SELECT:</Text>
                {workshopVehicles.slice(0, 3).map((vItem) => {
                  const isCur = vehicle?.id === vItem.id || vehicle?.repairOrder === vItem.repairOrder;
                  return (
                    <TouchableOpacity
                      key={vItem.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectVehicle(vItem)}
                      style={[styles.chipBtn, isCur && styles.chipBtnActive]}
                    >
                      <Text style={[styles.chipBtnText, isCur && styles.chipBtnTextActive]}>
                        {vItem.repairOrder || vItem.registration}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowVehiclePickerModal(true)}
                  style={[styles.chipBtn, styles.chipBtnBrowseAll]}
                >
                  <Text style={styles.chipBtnBrowseAllText}>
                    Browse All ({workshopVehicles.length})
                  </Text>
                </TouchableOpacity>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.regoPlate}>
                      <Text style={styles.regoText}>{vehicle.registration}</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setShowVehiclePickerModal(true)}
                      style={styles.switchCarBtn}
                    >
                      <ArrowRightLeft size={13} color={colors.primary} />
                      <Text style={styles.switchCarBtnText}>Change</Text>
                    </TouchableOpacity>
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
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowVehiclePickerModal(true)}
                style={styles.emptyVehicleCard}
              >
                <View style={styles.emptyVehicleIconWrap}>
                  <Car size={30} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyVehicleTitle}>No Vehicle Selected</Text>
                  <Text style={styles.emptyVehicleSub}>
                    Tap here to select an active repair order or workshop car to begin road test
                  </Text>
                </View>
                <View style={styles.emptyVehicleBtn}>
                  <Text style={styles.emptyVehicleBtnText}>Select Car</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Live Real OpenStreetMap Route Map */}
            <View style={styles.mapWrap}>
              <RoadTestRouteMap
                points={routePoints}
                state={tripState}
                siteName={siteName}
                fenceRadius={effectiveRadius}
              />
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
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {activeSubTab === 'history' && (
          <View style={styles.historyContainer}>
            {/* Rooftop Context Indicator */}
            <View style={styles.historyRooftopBanner}>
              <View style={styles.historyRooftopBadge}>
                <MapPin size={13} color={colors.primary} />
                <Text style={styles.historyRooftopText}>
                  {isAdmin
                    ? 'ADMIN NETWORK VIEW • ALL ROOFTOPS'
                    : `ROOFTOP: ${(siteName || 'Booran Workshop').toUpperCase()}`}
                </Text>
              </View>
              <Text style={styles.historyRooftopCount}>
                {rooftopFilteredTrips.length} {rooftopFilteredTrips.length === 1 ? 'Trip' : 'Trips'} Logged
              </Text>
            </View>

            {/* KPI Summary Row */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiNumber}>{rooftopFilteredTrips.length}</Text>
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

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (vehicle) {
                    setCreateRoNumber(vehicle.repairOrder || 'RO-');
                    setCreateRego(vehicle.registration || '');
                    setCreateVehicle(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
                  }
                  setShowCreateTripModal(true);
                }}
                style={[styles.filterPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              >
                <Text style={[styles.filterPillText, { color: colors.primary, fontWeight: '800' }]}>
                  + Log Trip
                </Text>
              </TouchableOpacity>
            </View>

            {filteredTrips.length === 0 && (
              <View style={styles.emptyTripsCard}>
                <Clock size={32} color={colors.textMuted} />
                <Text style={styles.emptyTripsTitle}>No Road Tests Logged</Text>
                <Text style={styles.emptyTripsSub}>
                  {isAdmin
                    ? 'No road test trips found across all dealerships.'
                    : `No test drives logged for ${siteName || 'this rooftop'} yet.`}
                </Text>
              </View>
            )}

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
                      <RoadTestRouteMap
                        points={item.routePoints || routePoints}
                        state="returned"
                        compact
                        siteName={item.siteName}
                      />
                      <View style={styles.technicianNoteBox}>
                        <Text style={styles.technicianNoteLabel}>
                          TECHNICIAN NOTE ({item.technician})
                        </Text>
                        <Text style={styles.technicianNoteText}>{item.note}</Text>
                      </View>

                      {/* Trip Card Action Row: Edit & Delete */}
                      <View style={styles.tripCardActionsRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setEditingTripItem(item);
                            setEditTripOutcome(item.outcome === 'Flagged' ? 'Flagged' : 'Passed');
                            setEditTripNotes(item.note || '');
                            setShowEditTripModal(true);
                          }}
                          style={styles.tripEditBtn}
                        >
                          <Edit3 size={13} color="#2563EB" />
                          <Text style={styles.tripEditBtnText}>Edit Findings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            Alert.alert(
                              'Delete Road Test Record',
                              `Are you sure you want to delete test drive for ${item.repairOrder} (${item.registration})?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteTripRecord(item.id),
                                },
                              ]
                            );
                          }}
                          style={styles.tripDeleteBtn}
                        >
                          <Trash2 size={13} color="#DC2626" />
                          <Text style={styles.tripDeleteBtnText}>Delete Trip</Text>
                        </TouchableOpacity>
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
                <View style={styles.settingsHeaderLeft}>
                  <Text style={styles.settingsKicker}>MY GEOFENCE PRESENCE</Text>
                  <Text
                    style={styles.settingsTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {siteName}
                  </Text>
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

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (liveCoords) {
                    anchorWorkshopToLocation(liveCoords.latitude, liveCoords.longitude, 'Pakistan Test Workshop');
                    Alert.alert(
                      'Workshop Anchored to Pakistan',
                      `Geofence boundary pinned to your exact GPS location (${liveCoords.latitude.toFixed(4)}°N, ${liveCoords.longitude.toFixed(4)}°E) in Pakistan.`
                    );
                  } else {
                    anchorWorkshopToLocation(31.5204, 74.3587, 'Pakistan Workshop (Lahore)');
                    Alert.alert(
                      'Pakistan Preset Active',
                      'Workshop boundary anchored to Lahore (31.5204°N, 74.3587°E) for testing.'
                    );
                  }
                }}
                style={[styles.simToggleBtn, { backgroundColor: '#0284C7', marginTop: 8 }]}
              >
                <Text style={styles.simToggleBtnText}>
                  🇵🇰 ANCHOR WORKSHOP HERE (PAKISTAN TEST)
                </Text>
              </TouchableOpacity>

              {customWorkshop && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    resetWorkshopToDealership();
                    Alert.alert('Reset to Australia', 'Workshop boundary restored to Booran Cranbourne, Australia.');
                  }}
                  style={[styles.simToggleBtn, { backgroundColor: '#64748B', marginTop: 8 }]}
                >
                  <Text style={styles.simToggleBtnText}>
                    🇦🇺 RESET TO CRANBOURNE (AUSTRALIA)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Workshop Boundary Policy Card */}
            <View style={styles.settingsSectionCard}>
              <View style={styles.settingsHeaderRow}>
                <View style={styles.settingsHeaderLeft}>
                  <Text style={styles.settingsKicker}>
                    {isAdmin ? 'ADMIN CONTROL • BOUNDARY POLICY' : 'WORKSHOP BOUNDARY POLICY'}
                  </Text>
                  <Text
                    style={styles.settingsTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Site Geofence Radius
                  </Text>
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

            {/* Live Dealership Rooftop Staff Roster (Visible to Admins Only - Hidden from Technician Portal) */}
            {isAdmin && (
              <View style={styles.settingsSectionCard}>
                <View style={styles.settingsHeaderRow}>
                  <View style={styles.settingsHeaderLeft}>
                    <Text style={styles.settingsKicker}>ALL TECHNICIANS PRESENCE</Text>
                    <Text
                      style={styles.settingsTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Dealership Staff Roster
                    </Text>
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
            )}

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

      {/* Post-Drive Diagnostic Findings & Outcome Modal */}
      <Modal
        visible={pendingCompletion}
        transparent
        animationType="slide"
        onRequestClose={cancelPendingCompletion}
      >
        <View style={styles.diagModalOverlay}>
          <View style={styles.diagModalContent}>
            {/* Header */}
            <View style={styles.diagModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diagModalKicker}>ROAD TEST COMPLETED</Text>
                <Text style={styles.diagModalTitle}>Diagnostic Outcome & Evidence</Text>
              </View>
              <TouchableOpacity onPress={cancelPendingCompletion} style={styles.diagModalCloseBtn}>
                <Text style={styles.diagModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Vehicle & Trip Stats Summary */}
            <View style={styles.diagVehicleSummary}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.diagVehicleTitle}>
                  {vehicle?.year} {vehicle?.make} {vehicle?.model}
                </Text>
                <View style={styles.diagRegoPill}>
                  <Text style={styles.diagRegoText}>{vehicle?.registration}</Text>
                </View>
              </View>
              <Text style={styles.diagVehicleMeta}>
                Repair Order: <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>{vehicle?.repairOrder}</Text>
              </Text>

              <View style={styles.diagStatsRow}>
                <View style={styles.diagStatCol}>
                  <Text style={styles.diagStatLabel}>TIME</Text>
                  <Text style={styles.diagStatVal}>{formatClock(elapsedSec)}</Text>
                </View>
                <View style={styles.diagStatCol}>
                  <Text style={styles.diagStatLabel}>DISTANCE</Text>
                  <Text style={styles.diagStatVal}>{distanceKm.toFixed(1)} km</Text>
                </View>
                <View style={styles.diagStatCol}>
                  <Text style={styles.diagStatLabel}>TOP SPEED</Text>
                  <Text style={styles.diagStatVal}>{maxSpeedKph} km/h</Text>
                </View>
                <View style={styles.diagStatCol}>
                  <Text style={styles.diagStatLabel}>PERIMETER</Text>
                  <Text style={[styles.diagStatVal, { color: colors.success }]}>Auto-Verified</Text>
                </View>
              </View>
            </View>

            {/* Outcome Selection: Passed vs Flagged */}
            <Text style={styles.diagSectionLabel}>DIAGNOSTIC OUTCOME FOR WARRANTY</Text>
            <View style={styles.diagOutcomeRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDiagOutcome('Passed')}
                style={[
                  styles.diagOutcomeBtn,
                  diagOutcome === 'Passed' && styles.diagOutcomeBtnPassedActive,
                ]}
              >
                <CheckCircle2
                  size={16}
                  color={diagOutcome === 'Passed' ? '#059669' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.diagOutcomeBtnText,
                    diagOutcome === 'Passed' && styles.diagOutcomeBtnTextPassedActive,
                  ]}
                >
                  Passed (No Fault)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDiagOutcome('Flagged')}
                style={[
                  styles.diagOutcomeBtn,
                  diagOutcome === 'Flagged' && styles.diagOutcomeBtnFlaggedActive,
                ]}
              >
                <Flag
                  size={16}
                  color={diagOutcome === 'Flagged' ? '#DC2626' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.diagOutcomeBtnText,
                    diagOutcome === 'Flagged' && styles.diagOutcomeBtnTextFlaggedActive,
                  ]}
                >
                  Flagged (Fault Found)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Diagnostic Chips */}
            <Text style={styles.diagSectionLabel}>TECHNICIAN OBSERVATIONS & NOTES</Text>
            <View style={styles.diagQuickChipsRow}>
              {[
                'Lockup clutch shudder confirmed',
                'Suspension rattle duplicated',
                'Road test passed - no noise',
                'DTC cleared - adaptives reset',
              ].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  activeOpacity={0.7}
                  onPress={() => setDiagNotes(chip)}
                  style={styles.diagQuickChip}
                >
                  <Text style={styles.diagQuickChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes TextInput */}
            <TextInput
              value={diagNotes}
              onChangeText={setDiagNotes}
              placeholder="Enter diagnostic findings, road conditions, speed, or observations..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={styles.diagNotesInput}
            />

            {/* Submit Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={savingDiag}
              onPress={async () => {
                setSavingDiag(true);
                try {
                  await saveDiagnosisAndComplete({
                    outcome: diagOutcome,
                    notes: diagNotes,
                  });
                } finally {
                  setSavingDiag(false);
                }
              }}
              style={styles.diagSubmitBtn}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.diagSubmitBtnText}>
                {savingDiag ? 'SAVING TEST DRIVE EVIDENCE...' : 'SAVE & SYNC ROAD TEST EVIDENCE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Trip Findings & Outcome Modal */}
      <Modal
        visible={showEditTripModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditTripModal(false)}
      >
        <View style={styles.diagModalOverlay}>
          <View style={styles.diagModalContent}>
            <View style={styles.diagModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diagModalKicker}>UPDATE EVIDENCE</Text>
                <Text style={styles.diagModalTitle}>
                  Edit Findings • {editingTripItem?.repairOrder}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditTripModal(false)} style={styles.diagModalCloseBtn}>
                <Text style={styles.diagModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.diagSectionLabel}>DIAGNOSTIC OUTCOME</Text>
            <View style={styles.diagOutcomeRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setEditTripOutcome('Passed')}
                style={[
                  styles.diagOutcomeBtn,
                  editTripOutcome === 'Passed' && styles.diagOutcomeBtnPassedActive,
                ]}
              >
                <Check
                  size={16}
                  color={editTripOutcome === 'Passed' ? '#059669' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.diagOutcomeBtnText,
                    editTripOutcome === 'Passed' && styles.diagOutcomeBtnTextPassedActive,
                  ]}
                >
                  Passed (No Fault Found)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setEditTripOutcome('Flagged')}
                style={[
                  styles.diagOutcomeBtn,
                  editTripOutcome === 'Flagged' && styles.diagOutcomeBtnFlaggedActive,
                ]}
              >
                <Flag
                  size={16}
                  color={editTripOutcome === 'Flagged' ? '#DC2626' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.diagOutcomeBtnText,
                    editTripOutcome === 'Flagged' && styles.diagOutcomeBtnTextFlaggedActive,
                  ]}
                >
                  Flagged (Fault Found)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.diagSectionLabel}>OBSERVATIONS & TECHNICIAN FINDINGS</Text>
            <TextInput
              value={editTripNotes}
              onChangeText={setEditTripNotes}
              placeholder="Enter diagnostic findings, speed observations, or repair notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={styles.diagNotesInput}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={savingTripEdit}
              onPress={async () => {
                if (!editingTripItem) return;
                setSavingTripEdit(true);
                try {
                  await updateTripRecord(editingTripItem.id, {
                    outcome: editTripOutcome,
                    note: editTripNotes,
                  });
                  setShowEditTripModal(false);
                } finally {
                  setSavingTripEdit(false);
                }
              }}
              style={styles.diagSubmitBtn}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.diagSubmitBtnText}>
                {savingTripEdit ? 'UPDATING TRIP...' : 'UPDATE TRIP EVIDENCE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Create Trip Modal */}
      <Modal
        visible={showCreateTripModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateTripModal(false)}
      >
        <View style={styles.diagModalOverlay}>
          <View style={styles.diagModalContent}>
            <View style={styles.diagModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diagModalKicker}>MANUAL ENTRY</Text>
                <Text style={styles.diagModalTitle}>Log Road Test Trip</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateTripModal(false)} style={styles.diagModalCloseBtn}>
                <Text style={styles.diagModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginBottom: 3 }}>
                  REPAIR ORDER *
                </Text>
                <TextInput
                  value={createRoNumber}
                  onChangeText={setCreateRoNumber}
                  placeholder="RO-48291"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.diagNotesInput, { minHeight: 40, marginBottom: 0 }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginBottom: 3 }}>
                  REGO PLATE *
                </Text>
                <TextInput
                  value={createRego}
                  onChangeText={setCreateRego}
                  placeholder="SGS 274"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.diagNotesInput, { minHeight: 40, marginBottom: 0 }]}
                />
              </View>
            </View>

            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginBottom: 3 }}>
                VEHICLE (MAKE / MODEL)
              </Text>
              <TextInput
                value={createVehicle}
                onChangeText={setCreateVehicle}
                placeholder="2021 Holden Commodore"
                placeholderTextColor={colors.textMuted}
                style={[styles.diagNotesInput, { minHeight: 40, marginBottom: 0 }]}
              />
            </View>

            <Text style={styles.diagSectionLabel}>DIAGNOSTIC OUTCOME</Text>
            <View style={styles.diagOutcomeRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCreateTripOutcome('Passed')}
                style={[
                  styles.diagOutcomeBtn,
                  createTripOutcome === 'Passed' && styles.diagOutcomeBtnPassedActive,
                ]}
              >
                <Check
                  size={16}
                  color={createTripOutcome === 'Passed' ? '#059669' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.diagOutcomeBtnText,
                    createTripOutcome === 'Passed' && styles.diagOutcomeBtnTextPassedActive,
                  ]}
                >
                  Passed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCreateTripOutcome('Flagged')}
                style={[
                  styles.diagOutcomeBtn,
                  createTripOutcome === 'Flagged' && styles.diagOutcomeBtnFlaggedActive,
                ]}
              >
                <Flag
                  size={16}
                  color={createTripOutcome === 'Flagged' ? '#DC2626' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.diagOutcomeBtnText,
                    createTripOutcome === 'Flagged' && styles.diagOutcomeBtnTextFlaggedActive,
                  ]}
                >
                  Flagged
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, marginBottom: 3 }}>
                FINDINGS & NOTES
              </Text>
              <TextInput
                value={createTripNotes}
                onChangeText={setCreateTripNotes}
                placeholder="Road test observations..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                style={[styles.diagNotesInput, { minHeight: 50, marginBottom: 0 }]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={savingCreateTrip}
              onPress={async () => {
                if (!createRoNumber.trim() || !createRego.trim()) {
                  Alert.alert('Missing Details', 'Please enter Repair Order and Rego Plate.');
                  return;
                }
                setSavingCreateTrip(true);
                try {
                  await createManualTripRecord({
                    repairOrder: createRoNumber.toUpperCase().trim(),
                    registration: createRego.toUpperCase().trim(),
                    vehicleLabel: createVehicle.trim() || `${createRego.toUpperCase().trim()} Vehicle`,
                    outcome: createTripOutcome,
                    note: createTripNotes || 'Manual test drive logged.',
                    distanceKm: parseFloat(createTripDist) || 5.0,
                    maxSpeedKph: parseInt(createTripSpeed, 10) || 65,
                    duration: '10m 00s',
                  });
                  setShowCreateTripModal(false);
                } finally {
                  setSavingCreateTrip(false);
                }
              }}
              style={styles.diagSubmitBtn}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.diagSubmitBtnText}>
                {savingCreateTrip ? 'SAVING RECORD...' : 'SAVE ROAD TEST TRIP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. Select Car / Vehicle Picker Modal */}
      <Modal
        visible={showVehiclePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehiclePickerModal(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            {/* Header */}
            <View style={styles.pickerModalHeader}>
              <View style={styles.pickerModalTitleWrap}>
                <View style={styles.pickerModalIconBadge}>
                  <Car size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.pickerModalTitle}>Select Car for Road Test</Text>
                  <Text style={styles.pickerModalSub}>
                    Choose vehicle to arm GPS & live telemetry
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowVehiclePickerModal(false)}
                style={styles.diagModalCloseBtn}
              >
                <Text style={styles.diagModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input Bar inside Modal */}
            <View style={styles.pickerSearchWrap}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                value={vehiclePickerSearch}
                onChangeText={setVehiclePickerSearch}
                placeholder="Search RO, plate, make, model, VIN..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                style={styles.pickerSearchInput}
              />
              {vehiclePickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setVehiclePickerSearch('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills: All, Active ROs, Workshop Fleet */}
            <View style={styles.pickerFilterRow}>
              <TouchableOpacity
                onPress={() => setVehiclePickerFilter('all')}
                style={[
                  styles.pickerFilterPill,
                  vehiclePickerFilter === 'all' && styles.pickerFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.pickerFilterPillText,
                    vehiclePickerFilter === 'all' && styles.pickerFilterPillTextActive,
                  ]}
                >
                  All Cars ({workshopVehicles.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setVehiclePickerFilter('tickets')}
                style={[
                  styles.pickerFilterPill,
                  vehiclePickerFilter === 'tickets' && styles.pickerFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.pickerFilterPillText,
                    vehiclePickerFilter === 'tickets' && styles.pickerFilterPillTextActive,
                  ]}
                >
                  Active ROs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setVehiclePickerFilter('fleet')}
                style={[
                  styles.pickerFilterPill,
                  vehiclePickerFilter === 'fleet' && styles.pickerFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.pickerFilterPillText,
                    vehiclePickerFilter === 'fleet' && styles.pickerFilterPillTextActive,
                  ]}
                >
                  Fleet
                </Text>
              </TouchableOpacity>
            </View>

            {/* Car List */}
            <FlatList
              data={filteredWorkshopVehicles}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected =
                  vehicle?.id === item.id ||
                  vehicle?.repairOrder === item.repairOrder ||
                  (Boolean(vehicle?.registration) && vehicle?.registration === item.registration);
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleSelectVehicle(item)}
                    style={[
                      styles.carItemCard,
                      isSelected && styles.carItemCardActive,
                    ]}
                  >
                    <View style={styles.carItemHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={styles.carItemTitle}>
                            {item.year} {item.make} {item.model}
                          </Text>
                          {isSelected && (
                            <View style={styles.activeCarBadge}>
                              <Check size={11} color="#059669" />
                              <Text style={styles.activeCarBadgeText}>Selected</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.carItemSub}>
                          {item.variant} • {item.colour}
                        </Text>
                      </View>
                      <View style={styles.carItemPlate}>
                        <Text style={styles.carItemPlateText}>{item.registration}</Text>
                      </View>
                    </View>

                    <View style={styles.carItemMetaRow}>
                      <View style={styles.carItemRoBadge}>
                        <Text style={styles.carItemRoText}>RO: {item.repairOrder}</Text>
                      </View>
                      {item.status ? (
                        <View
                          style={[
                            styles.carItemStatusBadge,
                            item.status === 'Active Claim' && styles.carItemStatusActiveClaim,
                            item.status === 'Inspection Required' && styles.carItemStatusInspection,
                          ]}
                        >
                          <Text
                            style={[
                              styles.carItemStatusText,
                              item.status === 'Active Claim' && styles.carItemStatusTextActiveClaim,
                              item.status === 'Inspection Required' && styles.carItemStatusTextInspection,
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      ) : null}
                      {item.odometerKm ? (
                        <Text style={styles.carItemOdo}>
                          {item.odometerKm.toLocaleString()} km
                        </Text>
                      ) : null}
                    </View>

                    {item.concern ? (
                      <View style={styles.carItemConcernWrap}>
                        <Text style={styles.carItemConcernText} numberOfLines={2}>
                          {item.concern}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.carItemFooter}>
                      <Text style={styles.carItemSite} numberOfLines={1}>
                        📍 {item.siteName || 'Booran Workshop'}
                      </Text>
                      <View
                        style={[
                          styles.carItemActionBtn,
                          isSelected && styles.carItemActionBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.carItemActionBtnText,
                            isSelected && styles.carItemActionBtnTextActive,
                          ]}
                        >
                          {isSelected ? 'ARMED' : 'SELECT CAR'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.pickerEmptyState}>
                  <Car size={36} color={colors.textMuted} />
                  <Text style={styles.pickerEmptyTitle}>No Vehicles Found</Text>
                  <Text style={styles.pickerEmptySub}>
                    Try searching with another RO number, Rego plate, or make.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  subTabItemActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.25)',
  },
  subTabText: {
    fontSize: 10.5,
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
  historyRooftopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyRooftopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyRooftopText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyRooftopCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyTripsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginVertical: 12,
  },
  emptyTripsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  emptyTripsSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
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
    gap: 8,
  },
  settingsHeaderLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  settingsKicker: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
    lineHeight: 18,
  },
  radiusPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.2)',
    flexShrink: 0,
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
    flexShrink: 0,
    gap: 5,
    paddingHorizontal: 9,
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
    fontSize: 10,
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
    minWidth: 0,
    marginRight: 6,
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
  diagModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  diagModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  diagModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  diagModalKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  diagModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  diagModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagModalCloseText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  diagVehicleSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  diagVehicleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  diagRegoPill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diagRegoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  diagVehicleMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  diagStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  diagStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  diagStatLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  diagStatVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  diagSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  diagOutcomeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  diagOutcomeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  diagOutcomeBtnPassedActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  diagOutcomeBtnFlaggedActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  diagOutcomeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  diagOutcomeBtnTextPassedActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  diagOutcomeBtnTextFlaggedActive: {
    color: '#991B1B',
    fontWeight: '800',
  },
  diagQuickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  diagQuickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  diagQuickChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  diagNotesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 65,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  diagSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  diagSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tripCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tripEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tripEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  tripDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  tripDeleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  selectCarBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  selectCarIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCarBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectCarBarSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  selectCarActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectCarActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  chipBtnActive: {
    backgroundColor: 'rgba(29, 78, 216, 0.12)',
    borderColor: colors.primary,
  },
  chipBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  chipBtnBrowseAll: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  chipBtnBrowseAllText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  switchCarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  switchCarBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyVehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyVehicleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyVehicleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyVehicleSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 16,
  },
  emptyVehicleBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyVehicleBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 25,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pickerModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerModalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  pickerModalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  pickerFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pickerFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerFilterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  pickerFilterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pickerFilterPillTextActive: {
    color: '#FFFFFF',
  },
  carItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  carItemCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAFCFF',
    borderWidth: 1.8,
  },
  carItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  carItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeCarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#A7F3D0',
  },
  activeCarBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  carItemSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  carItemPlate: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  carItemPlateText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  carItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  carItemRoBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  carItemRoText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  carItemStatusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  carItemStatusActiveClaim: {
    backgroundColor: '#FEF2F2',
  },
  carItemStatusInspection: {
    backgroundColor: '#FFFBEB',
  },
  carItemStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  carItemStatusTextActiveClaim: {
    color: '#DC2626',
  },
  carItemStatusTextInspection: {
    color: '#D97706',
  },
  carItemOdo: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  carItemConcernWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  carItemConcernText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  carItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  carItemSite: {
    fontSize: 10.5,
    color: colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  carItemActionBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  carItemActionBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  carItemActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },
  carItemActionBtnTextActive: {
    color: '#059669',
  },
  pickerEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  pickerEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerEmptySub: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
});
