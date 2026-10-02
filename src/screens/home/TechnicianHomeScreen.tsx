import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  Building2,
  Lock,
  ShieldCheck,
  Key,
  Bell,
  Home,
  Car,
  Plus,
  ChevronRight,
  LogOut,
  Camera,
  Wrench,
} from 'lucide-react-native';

import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useGeofence } from '../../context/GeofenceContext';
import { useRoadTest, RoadTestTripRecord } from '../../context/RoadTestContext';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { offlineStorage } from '../../services/offlineStorage';
import { casesApi } from '../../api/cases.api';
import { loanAgreementsApi } from '../../api/loanAgreements.api';
import { hoistApi } from '../../api/hoist.api';
import { roadTestService } from '../../services/roadtest.service';
import { rooftopVehiclesService } from '../../services/rooftopVehicles.service';
import { notificationsService, AppNotificationPayload } from '../../services/notifications.service';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import { WarrantyCase, LoanAgreement } from '../../types';

const booranLogo = require('../../assets/images/booran-motors-transparent.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TechnicianHomeScreenProps {
  onOpenVehicles: () => void;
  onOpenRoadTest: () => void;
  onOpenTickets: (tab?: string) => void;
  onOpenLoaners: () => void;
  onOpenHoists?: () => void;
  onOpenProfile: () => void;
  onStartNewInspection: () => void;
  onOpenZoneCapture?: (vehicle?: any) => void;
  onOpenCase?: (caseItem: WarrantyCase) => void;
  onResolveFlag?: (caseItem: WarrantyCase) => void;
  onLogout?: () => void;
}

// Custom crisp SVG steering wheel icon matching Figma / Screenshot
const SteeringWheelIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#DC2626',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill={color} />
    <Line x1="2.5" y1="12" x2="9" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="15" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="12" y1="15" x2="12" y2="21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Custom Vehicle Inspection Icon with car + inspection camera badge
const VehicleInspectionIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#DC2626',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 16h2.5c.8 0 1.5-.7 1.5-1.5v-2.5c0-.8-.5-1.5-1.3-1.8L18 9l-2-2.5c-.4-.5-1-.8-1.7-.8H5.5C4.7 5.7 4 6.4 4 7.2v7.3c0 .8.7 1.5 1.5 1.5H8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="8" cy="16.5" r="2" stroke={color} strokeWidth="2" />
    {/* Camera Badge in top right */}
    <Path
      d="M13.5 5.5h1.2l.8.8h2.5c.6 0 1 .4 1 1v3.2c0 .6-.4 1-1 1h-4.5c-.6 0-1-.4-1-1v-4c0-.6.4-1 1-1z"
      fill={color}
    />
    <Circle cx="16.5" cy="8.2" r="1.1" fill="#FFFFFF" />
  </Svg>
);

function formatLastDriveStatus(
  timestamp?: string | number | Date | null,
  tripRecord?: RoadTestTripRecord | null
): string {
  const now = new Date();
  let date: Date | null = null;
  let textFallback: string | null = null;

  // 1. Try parsing from timestamp
  if (timestamp) {
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) date = d;
    } else if (typeof timestamp === 'string') {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        date = d;
      } else {
        textFallback = timestamp;
      }
    }
  }

  // 2. If no valid date yet, check tripRecord
  if (!date && tripRecord) {
    const candidates = [
      (tripRecord as any).completedAt,
      (tripRecord as any).endedAt,
      (tripRecord as any).createdAt,
      (tripRecord as any).timestamp,
    ];

    for (const c of candidates) {
      if (c) {
        const d = new Date(c);
        if (!isNaN(d.getTime())) {
          date = d;
          break;
        }
      }
    }

    if (!date) {
      if (tripRecord.dateLabel) {
        const d = new Date(tripRecord.dateLabel);
        if (!isNaN(d.getTime())) {
          date = d;
        } else {
          textFallback = tripRecord.dateLabel;
        }
      } else if (tripRecord.startTime) {
        const d = new Date(tripRecord.startTime);
        if (!isNaN(d.getTime())) {
          date = d;
        } else {
          textFallback = tripRecord.startTime;
        }
      }
    }
  }

  // 3. If a valid Date object was found
  if (date && !isNaN(date.getTime())) {
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    const timeFormatted = date
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase();

    if (isToday) {
      const diffMs = Math.max(0, now.getTime() - date.getTime());
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Last drive just now';
      if (diffMins < 60) return `Last drive ${diffMins} min ago`;
      return `Last drive ${timeFormatted}`;
    }

    if (isYesterday) {
      return 'Last drive yesterday';
    }

    // Old drive: show formatted date instead of "Ready to start"
    const dateFormatted = date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    return `Last drive ${dateFormatted}`;
  }

  // 4. Textual fallback (e.g. from local demo trip records like "Today 4:42 pm" or "24 Sep")
  if (textFallback) {
    const trimmed = textFallback.trim();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith('today')) {
      const timePart = trimmed.replace(/^today\s*/i, '').trim();
      return timePart ? `Last drive ${timePart.toLowerCase()}` : `Last drive today`;
    }

    if (lower.startsWith('yesterday')) {
      return 'Last drive yesterday';
    }

    // Time only like "4:42 pm" -> It's today's time
    if (/^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(trimmed)) {
      return `Last drive ${trimmed.toLowerCase()}`;
    }

    // Date like "24 Sep 2:10 pm" or "18 Sep" -> extract date
    const dateMatch = trimmed.match(/^(\d{1,2}\s+[A-Za-z]+)/);
    if (dateMatch) {
      return `Last drive ${dateMatch[1]}`;
    }

    return `Last drive ${trimmed}`;
  }

  return 'Ready to start';
}

function getUserInitials(name?: string): string {
  if (!name) return 'SH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TechnicianHomeScreen: React.FC<TechnicianHomeScreenProps> = ({
  onOpenVehicles,
  onOpenRoadTest,
  onOpenTickets,
  onOpenLoaners,
  onOpenHoists,
  onOpenProfile,
  onStartNewInspection,
  onOpenZoneCapture,
  onOpenCase,
  onResolveFlag,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId, logout } = useAuth();
  const { presenceStatus, siteName, toggleSimulatedPresence } = useGeofence();
  const { isLiveDrive, demoRunning, tripRecords } = useRoadTest();
  const wizard = useCaseWizard();
  const isDriveActive = isLiveDrive || demoRunning;
  const isClerk = user?.role === 'CLERK';

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Booran Motors Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            onLogout ? onLogout() : logout();
          },
        },
      ]
    );
  };

  const [refreshing, setRefreshing] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Real Data States
  const [myCases, setMyCases] = useState<WarrantyCase[]>([]);
  const [lastDriveTimestamp, setLastDriveTimestamp] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<LoanAgreement[]>([]);
  const [hoistSummary, setHoistSummary] = useState<any>(null);

  // Calculate greeting by time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userFirstName = useMemo(() => {
    if (!user?.name) return 'Shaun';
    return user.name.trim().split(/\s+/)[0];
  }, [user?.name]);

  const userInitials = useMemo(() => getUserInitials(user?.name), [user?.name]);

  // Fetch real data from all backend endpoints
  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Notifications count
      const count = notificationsService.getUnreadCount();
      setUnreadNotifCount(count);

      // 2. Fetch Warranty Cases for this technician
      try {
        const filters: any = { limit: 100 };
        if (isClerk) {
          filters.siteId = activeSiteId;
        } else if (user?.id) {
          filters.technicianId = user.id;
        }
        if (!isClerk && user?.name) {
          filters.technicianName = user.name;
        }
        const data = await casesApi.getCases(filters);
        const list: WarrantyCase[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
        setMyCases(list);
      } catch (caseErr) {
        console.warn('[TechnicianHomeScreen] Error fetching cases:', caseErr);
      }

      // 3. Fetch latest historical road test drive
      try {
        const drivesData = await roadTestService.getHistoricalDrives({
          technicianId: isClerk ? undefined : user?.id,
          siteId: activeSiteId,
          limit: 1,
        });
        const drivesList = Array.isArray(drivesData)
          ? drivesData
          : (drivesData as any)?.data ?? [];
        if (drivesList.length > 0) {
          const latest = drivesList[0];
          const time =
            latest.completedAt || latest.endedAt || latest.startedAt || latest.createdAt;
          setLastDriveTimestamp(time || null);
        }
      } catch (driveErr) {
        console.warn('[TechnicianHomeScreen] Error fetching drives:', driveErr);
      }

      // 4. Fetch Loan Agreements for pool status
      try {
        const loanData = await loanAgreementsApi.findAll(
          activeSiteId !== 'all' ? activeSiteId : undefined
        );
        if (Array.isArray(loanData)) {
          setAgreements(loanData);
        }
      } catch (loanErr) {
        console.warn('[TechnicianHomeScreen] Error fetching loan agreements:', loanErr);
      }

      // 5. Fetch Hoist Summary
      try {
        const hSummary = await hoistApi.getSummary(user?.workshopFacility);
        setHoistSummary(hSummary);
      } catch (hErr) {
        console.warn('[TechnicianHomeScreen] Error fetching hoists:', hErr);
      }
    } finally {
      setRefreshing(false);
    }
  }, [isClerk, user?.id, user?.name, user?.workshopFacility, activeSiteId]);

  useEffect(() => {
    loadDashboardData();

    const unsubNotif = notificationsService.onNotification(() => {
      setUnreadNotifCount(notificationsService.getUnreadCount());
    });
    return () => unsubNotif();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Real Calculated Metrics
  const openCasesCount = useMemo(
    () => myCases.filter((c) => c.status !== 'Submitted').length,
    [myCases]
  );

  const inProgressCasesCount = useMemo(
    () => myCases.filter((c) => c.status === 'Draft' || c.status === 'Uploading').length,
    [myCases]
  );

  const activeWarrantyCount = useMemo(
    () => myCases.filter((c) => c.status !== 'Submitted').length,
    [myCases]
  );

  // Dynamic In-Progress Inspection Data (Real zones from offlineStorage and CaseWizard)
  const activeInspection = useMemo(() => {
    const cleanVin = (wizard.vin || 'LGXCE4C86P0019283').toUpperCase();
    const stored = offlineStorage.getVehicleInspection(cleanVin);
    const allStored = offlineStorage.getAllVehicleInspections();
    const activeStored =
      stored || allStored.find((i) => i.status === 'IN_PROGRESS') || allStored[0];

    const wizardEvidenceKeys = wizard.evidenceItems
      ? wizard.evidenceItems.map((e) => e.ruleKey)
      : [];
    const storageKeys = activeStored?.capturedZoneKeys || [];
    const mergedCapturedKeys = Array.from(new Set([...storageKeys, ...wizardEvidenceKeys]));

    const wizardCaptured = wizard.completedMandatoryCount || wizard.evidenceItems?.length || 0;

    // Total vehicle zones is always 10 (Front, Rear, Driver Side, Passenger Side, Roof, Bonnet, Boot, Interior, Engine Bay, Cargo Tray)
    const total = 10;
    let captured = Math.max(mergedCapturedKeys.length, wizardCaptured);

    if (captured === 0) {
      captured = 6;
    }

    const roNum = wizard.roNumber || activeStored?.roNumber || '180001';
    const vehicleTitle = wizard.model
      ? `${wizard.year || 2024} ${wizard.make || 'BYD'} ${wizard.model}`
      : '2024 BYD ATTO 3 Extended';
    const rego = '1BY-9EV';
    const vin = cleanVin;

    return {
      vin,
      rego,
      roNum,
      vehicleTitle,
      captured,
      total,
    };
  }, [
    wizard.vin,
    wizard.roNumber,
    wizard.make,
    wizard.model,
    wizard.year,
    wizard.evidenceItems,
    wizard.completedMandatoryCount,
    wizard.mandatoryCount,
    wizard.resolvedRules,
  ]);

  const activeLoanersCount = useMemo(
    () => agreements.filter((a) => a.status === 'ACTIVE').length,
    [agreements]
  );

  const latestTrip = useMemo(() => {
    return tripRecords && tripRecords.length > 0 ? tripRecords[0] : null;
  }, [tripRecords]);

  const driveStatusText = useMemo(() => {
    if (isDriveActive) return 'Drive in progress';
    return formatLastDriveStatus(lastDriveTimestamp, latestTrip);
  }, [isDriveActive, lastDriveTimestamp, latestTrip]);

  const isOnSite = presenceStatus === 'ON_SITE';

  const handleSelectNotification = (notif: AppNotificationPayload) => {
    setShowNotifModal(false);
    const targetCase = notif.caseItem || myCases.find((c) => c.id === notif.caseId);
    if (targetCase) {
      if (notif.type === 'FLAGGED' || targetCase.status === 'Flagged') {
        onResolveFlag ? onResolveFlag(targetCase) : onOpenTickets('flagged');
      } else {
        onOpenCase ? onOpenCase(targetCase) : onOpenTickets('all');
      }
    } else {
      onOpenTickets('all');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Top Red Brand Header Bar (Exact match to screenshot) ──────── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12) }]}>
        <View style={styles.headerContent}>
          {/* Logo on Left */}
          <View style={styles.logoWrap}>
            <Image source={booranLogo} style={styles.logoImage} resizeMode="contain" />
          </View>

          {/* Right Action Items: Off-site pill + Bell Button */}
          <View style={styles.headerRight}>
            {/* Geofence Pill Badge */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleSimulatedPresence}
              style={[
                styles.presencePill,
                isOnSite ? styles.presencePillOnSite : styles.presencePillOffSite,
              ]}
              accessibilityLabel="Presence Status"
            >
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: isOnSite ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text style={styles.presencePillText}>
                {isOnSite ? 'ON-SITE' : 'OFF-SITE'}
              </Text>
            </TouchableOpacity>

            {/* Notification Bell Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowNotifModal(true)}
              style={styles.bellButton}
              accessibilityLabel="Notifications"
            >
              <Bell size={22} color="#FFFFFF" strokeWidth={2} />
              {unreadNotifCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Logout Button on Extreme Right */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogout}
              style={styles.logoutButton}
              accessibilityLabel="Log Out"
            >
              <LogOut size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── 2. Scrollable Body Content ──────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Your Assigned Rooftop */}
        <View style={styles.rooftopCard}>
          <View style={styles.rooftopLeft}>
            <View style={styles.rooftopIconCircle}>
              <Building2 size={20} color="#DC2626" />
            </View>
            <View style={styles.rooftopTextCol}>
              <Text style={styles.rooftopEyebrow}>YOUR ASSIGNED ROOFTOP</Text>
              <Text style={styles.rooftopName} numberOfLines={1}>
                {siteName || 'Booran BYD Cranbourne'}
              </Text>
            </View>
          </View>
          <View style={styles.assignedBadge}>
            <Lock size={12} color="#475569" strokeWidth={2.2} />
            <Text style={styles.assignedBadgeText}>Assigned</Text>
          </View>
        </View>

        {/* Card 2: Greeting & Subtitle */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingEyebrow}>HOME</Text>
          <Text style={styles.greetingHeadline}>
            {greeting}, {userFirstName}.
          </Text>
          <Text style={styles.greetingSubhead}>
            Choose a tool to get started. You can switch anytime from the tab bar.
          </Text>
        </View>

        {/* ── Active In-Progress Inspection Card: Dynamic Zone Counts ── */}

        {/* Section Header: APP MENU */}
        <Text style={styles.sectionTitle}>APP MENU</Text>

        {/* 2x2 Tool Grid */}
        <View style={styles.gridContainer}>
          {/* Item 1: Vehicle Inspection */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenVehicles}
            style={styles.gridCard}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <VehicleInspectionIcon size={24} color="#DC2626" />
              </View>
              <Text style={styles.gridTitle}>Vehicle Inspection</Text>
              <Text style={styles.gridSubtitle}>Condition reports.</Text>
            </View>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridFooterText} numberOfLines={1}>
                {openCasesCount} open · {inProgressCasesCount} in progress
              </Text>
              <ChevronRight size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Item 2: Internal Test Drive */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenRoadTest}
            style={styles.gridCard}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <SteeringWheelIcon size={24} color="#DC2626" />
              </View>
              <Text style={styles.gridTitle}>Internal Test Drive</Text>
              <Text style={styles.gridSubtitle}>Log a rego and go.</Text>
            </View>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridFooterText} numberOfLines={1}>
                {driveStatusText}
              </Text>
              <ChevronRight size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Item 3: Warranty Capture */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onOpenTickets('all')}
            style={styles.gridCard}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <ShieldCheck size={24} color="#D97706" />
              </View>
              <Text style={styles.gridTitle}>Warranty Capture</Text>
              <Text style={styles.gridSubtitle}>Raise and track claims.</Text>
            </View>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridFooterText} numberOfLines={1}>
                {activeWarrantyCount} active
              </Text>
              <ChevronRight size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Item 4: Loaners */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenLoaners}
            style={styles.gridCard}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Key size={23} color="#059669" />
              </View>
              <Text style={styles.gridTitle}>Loaners</Text>
              <Text style={styles.gridSubtitle}>Courtesy vehicles.</Text>
            </View>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridFooterText} numberOfLines={1}>
                {activeLoanersCount > 0 ? `Pool status · ${activeLoanersCount} out` : 'Pool status'}
              </Text>
              <ChevronRight size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Item 5: Daily Hoist Inspection */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenHoists}
            style={styles.gridCard}
          >
            <View style={styles.gridCardTop}>
              <View style={[styles.gridIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Wrench size={22} color="#2563EB" />
              </View>
              <Text style={styles.gridTitle}>Hoist Inspections</Text>
              <Text style={styles.gridSubtitle}>Daily pre-shift checks.</Text>
            </View>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridFooterText} numberOfLines={1}>
                {hoistSummary
                  ? `${hoistSummary.inspectedToday}/${hoistSummary.totalHoists} bays checked`
                  : 'Daily pre-shift checklist'}
              </Text>
              <ChevronRight size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Full-Width Row 1: Notifications */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowNotifModal(true)}
          style={styles.fullWidthCard}
        >
          <View style={styles.fullWidthLeft}>
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Bell size={22} color="#DC2626" />
            </View>
            <View style={styles.fullWidthTextCol}>
              <Text style={styles.fullWidthTitle}>Notifications</Text>
              <Text style={styles.fullWidthSubtitle}>{unreadNotifCount} unread</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Full-Width Row 2: Profile & settings */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenProfile}
          style={styles.fullWidthCard}
        >
          <View style={styles.fullWidthLeft}>
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.initialsAvatarText}>{userInitials}</Text>
            </View>
            <View style={styles.fullWidthTextCol}>
              <Text style={styles.fullWidthTitle}>Profile & settings</Text>
              <Text style={styles.fullWidthSubtitle}>
                {user?.name ? user.name.trim().toLowerCase() : 'shaun'}{'\n'}
                {siteName || 'Booran BYD Cranbourne'}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Footnote matching screenshot */}
        <Text style={styles.footnote}>
          Tap a tool to open it. Use the tab bar to switch without returning home.
        </Text>
      </ScrollView>

      {/* ── 3. Bottom Navigation Bar (Drive and Loaners style) ──────────── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 10, 24) }]}>
        {/* 1. Home (ACTIVE) */}
        <TouchableOpacity activeOpacity={0.7} style={styles.bottomBarTab}>
          <Home size={22} color="#DC2626" />
          <Text style={[styles.bottomBarLabel, { color: '#DC2626', fontWeight: '700' }]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Drive */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenRoadTest}
          style={styles.bottomBarTab}
        >
          <Car size={22} color={colors.textSecondary} />
          <Text style={styles.bottomBarLabel}>Drive</Text>
        </TouchableOpacity>

        {/* 3. Center Red Primary Action Pill Button: New Inspection */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => (onStartNewInspection ? onStartNewInspection() : onOpenZoneCapture ? onOpenZoneCapture() : undefined)}
          style={styles.bottomBarActionBtn}
        >
          <Camera size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.bottomBarActionText}>New Inspection</Text>
        </TouchableOpacity>

        {/* 4. Loaners */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenLoaners}
          style={styles.bottomBarTab}
        >
          <Key size={22} color={colors.textSecondary} />
          <Text style={styles.bottomBarLabel}>Loaners</Text>
        </TouchableOpacity>

        {/* 5. User Profile */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenProfile}
          style={styles.bottomBarUserTab}
        >
          <View style={styles.bottomBarAvatar}>
            <Text style={styles.bottomBarAvatarText}>{userInitials}</Text>
          </View>
          <Text style={styles.bottomBarLabel} numberOfLines={1}>
            {userFirstName.toLowerCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onSelectNotification={handleSelectNotification}
      />
    </View>
  );
};

const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── HEADER ──────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#D71920',
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 140,
    height: 38,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  presencePillOnSite: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  presencePillOffSite: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presencePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  // ── BODY SCROLL ──────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },

  // ── ROOFTOP CARD ─────────────────────────────────────────────────────
  rooftopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rooftopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  rooftopIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rooftopTextCol: {
    flex: 1,
  },
  rooftopEyebrow: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rooftopName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  assignedBadgeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── GREETING CARD ────────────────────────────────────────────────────
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  greetingEyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.0,
  },
  greetingHeadline: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  greetingSubhead: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  // ── SECTION TITLE ────────────────────────────────────────────────────
  sectionTitle: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 10,
  },

  // ── 2X2 GRID ─────────────────────────────────────────────────────────
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: CARD_WIDTH,
    minHeight: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  gridCardTop: {
    alignItems: 'flex-start',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  gridSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gridFooterText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },

  // ── FULL WIDTH ROWS ──────────────────────────────────────────────────
  fullWidthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  fullWidthTextCol: {
    flex: 1,
  },
  fullWidthTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  fullWidthSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  initialsAvatarText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '900',
  },

  // ── FOOTNOTE ─────────────────────────────────────────────────────────
  footnote: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 8,
    lineHeight: 16,
  },

  // ── BOTTOM BAR (Exact style from Drive & Loaners) ────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  bottomBarTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 3,
  },
  bottomBarActionBtn: {
    backgroundColor: '#D71920',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBarActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
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
    borderWidth: 1.5,
    borderColor: '#D71920',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarAvatarText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D71920',
  },

  // ── ACTIVE INSPECTION CARD ───────────────────────────────────────────
  activeInspectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  activeInspectionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeInspectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  activeInspectionTagText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeInspectionNum: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  activeVehicleTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  activeVehicleSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  activeSegmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  activeSegmentLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  activeSegmentCount: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  activeSegmentsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  activeMiniSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  activeMiniSegmentFilled: {
    backgroundColor: '#DC2626',
  },
  activeMiniSegmentUnfilled: {
    backgroundColor: '#E2E8F0',
  },
  activeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D71920',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  activeActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
