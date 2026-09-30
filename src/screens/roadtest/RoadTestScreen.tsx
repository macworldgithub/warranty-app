import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  FlatList,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Car,
  Plus,
  Square,
  Home,
  Key,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Gauge,
  Lock,
  Building2,
  ChevronRight,
  ChevronLeft,
  X,
  XCircle,
  Bell,
  Play,
  RotateCcw,
  Navigation,
  Info,
  Calendar,
  User,
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
import { RoadTestRouteMap, MiniRoutePreview } from '../../components/roadtest/RoadTestRouteMap';
import { Header } from '../../components/common/Header';
import { NotificationModal } from '../../components/notifications/NotificationModal';
import { notificationsService } from '../../services/notifications.service';
import { casesApi } from '../../api/cases.api';
import { rooftopVehiclesService } from '../../services/rooftopVehicles.service';

interface RoadTestScreenProps {
  onOpenTickets: () => void;
  onOpenVehicles: () => void;
  onOpenLoaners: () => void;
  onOpenProfile: () => void;
  onOpenHome?: () => void;
  onLogout?: () => void;
}

function getUserInitials(name?: string): string {
  if (!name) return 'SH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RoadTestScreen({
  onOpenTickets,
  onOpenVehicles,
  onOpenLoaners,
  onOpenProfile,
  onOpenHome,
  onLogout,
}: RoadTestScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, activeSiteId } = useAuth();
  const technicianSiteId = user?.defaultSiteId || activeSiteId || 'site_cranbourne_byd';

  const {
    vehicle,
    setVehicle,
    tripState,
    demoRunning,
    isLiveDrive,
    speedKph,
    elapsedSec,
    distanceKm,
    routePoints,
    tripRecords,
    startDemoDrive,
    resetDemo,
    startLiveDrive,
    stopAndSaveDrive,
    recordLivePoint,
  } = useRoadTest();

  const {
    presenceStatus,
    insideGeofence,
    siteName,
    radiusMeters,
    liveCoords,
    customWorkshop,
  } = useGeofence();

  // State
  const [regoInput, setRegoInput] = useState<string>('1BY-9EV');
  const [selectedTripDetail, setSelectedTripDetail] = useState<RoadTestTripRecord | null>(null);
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(7);
  const [workshopVehicles, setWorkshopVehicles] = useState<RoadTestVehicle[]>(INITIAL_DEMO_VEHICLES);

  const isDriving = isLiveDrive || demoRunning;

  // Pulse animation for live tracking badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isDriving) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isDriving, pulseAnim]);

  // Notifications listener
  useEffect(() => {
    setUnreadNotifCount(notificationsService.getUnreadCount() || 7);
    const unsub = notificationsService.onNotification(() => {
      setUnreadNotifCount(notificationsService.getUnreadCount());
    });
    return () => unsub();
  }, []);

  // Stream live GPS into RoadTestContext when driving in live mode
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

  // Load live workshop vehicles from backend
  useEffect(() => {
    casesApi
      .getCases()
      .then((cases) => {
        const fleet = rooftopVehiclesService.getVehiclesForRooftop(technicianSiteId, cases);
        if (fleet && fleet.length > 0) {
          const mapped: RoadTestVehicle[] = fleet.map((f: any, idx: number) => ({
            id: f.id || `fleet-${idx}`,
            registration: f.registration || '1BY-9EV',
            repairOrder: f.repairOrder || `RO-${48900 + idx}`,
            customerName: f.customerName || 'Booran Fleet',
            make: f.make || 'BYD',
            model: f.model || 'ATTO 3',
            year: f.year || 2024,
            variant: f.variant || 'Extended',
            colour: f.colour || 'Surf Blue',
            odometerKm: f.odometerKm || 3400,
            vin: f.vin || 'LGXCE43C8P0192831',
            concern: f.concern || 'Internal test drive',
            siteId: technicianSiteId,
            siteName: siteName || 'Booran BYD Cranbourne',
          }));
          setWorkshopVehicles([...INITIAL_DEMO_VEHICLES, ...mapped]);
        }
      })
      .catch(() => {});
  }, [technicianSiteId, siteName]);

  // Handle Starting the Drive
  const handleStartDrive = () => {
    Keyboard.dismiss();
    const cleanRego = regoInput.trim().toUpperCase() || '1BY-9EV';
    const found = workshopVehicles.find(
      (v) => v.registration.toUpperCase() === cleanRego || v.repairOrder.toUpperCase() === cleanRego
    );

    const vehicleToDrive: RoadTestVehicle = found || {
      id: `veh-${Date.now()}`,
      registration: cleanRego,
      repairOrder: `RO-${Math.floor(48800 + Math.random() * 900)}`,
      customerName: 'Internal Fleet Test',
      make: 'BYD',
      model: cleanRego.includes('4EV') ? 'SEAL' : cleanRego.includes('CRN') ? 'Dolphin' : 'ATTO 3',
      year: 2024,
      variant: cleanRego.includes('4EV') ? 'Performance AWD' : cleanRego.includes('CRN') ? 'Premium' : 'Extended',
      colour: 'Surf Blue',
      odometerKm: 3410,
      vin: `LGXCE43C8P01${Math.floor(100000 + Math.random() * 899999)}`,
      concern: 'Diagnostic pre-delivery verification & telemetry test.',
      siteId: technicianSiteId,
      siteName: siteName || 'Booran BYD Cranbourne',
    };

    setVehicle(vehicleToDrive);
    startLiveDrive(vehicleToDrive);
  };

  // Handle Starting a Simulated Drive for instant demonstration
  const handleStartSimulatedDrive = () => {
    Keyboard.dismiss();
    const cleanRego = regoInput.trim().toUpperCase() || '1BY-9EV';
    const vehicleToDrive: RoadTestVehicle = {
      id: `veh-${Date.now()}`,
      registration: cleanRego,
      repairOrder: 'RO-48901',
      customerName: 'Internal Fleet Test',
      make: 'BYD',
      model: cleanRego.includes('4EV') ? 'SEAL' : cleanRego.includes('CRN') ? 'Dolphin' : 'ATTO 3',
      year: 2024,
      variant: 'Extended',
      colour: 'Surf Blue',
      odometerKm: 3410,
      vin: 'LGXCE43C8P0192831',
      concern: 'Simulated road test demonstration.',
      siteId: technicianSiteId,
      siteName: siteName || 'Booran BYD Cranbourne',
    };
    setVehicle(vehicleToDrive);
    startDemoDrive();
  };

  // Handle Stopping the Drive (Auto-saves to Previous drives)
  const handleStopDrive = async () => {
    await stopAndSaveDrive('Internal test drive completed.');
  };

  const currentVehicleRego = vehicle?.registration || regoInput || '1BY-9EV';
  const currentVehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}`.trim()
    : '2024 BYD ATTO 3 Extended';

  const userFirstName = user?.name ? user.name.trim().split(/\s+/)[0].toLowerCase() : 'shaun';
  const userInitials = getUserInitials(user?.name);

  const getDisplayMaxSpeed = (trip: RoadTestTripRecord | null) => {
    if (!trip) return 0;
    if (typeof trip.maxSpeedKph === 'number' && trip.maxSpeedKph > 0) return trip.maxSpeedKph;
    if (trip.routePoints && trip.routePoints.length > 0) {
      const peak = Math.max(...trip.routePoints.map((p) => p.speed || 0));
      if (peak > 0) return peak;
    }
    return trip.maxSpeedKph ?? 0;
  };

  // -----------------------------------------------------------------------------------
  // RENDER: LIVE DRIVE VIEW (Figma Image 1)
  // -----------------------------------------------------------------------------------
  if (isDriving) {
    return (
      <View style={styles.screen}>
        {/* 1. Red Header Bar */}
        <View style={[styles.liveHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.liveHeaderRow}>
            {/* Left: Back Chevron */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                // If technician wants to return to overview or stop
                handleStopDrive();
              }}
              style={styles.backBtn}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Center: Live Drive Title */}
            <Text style={styles.liveHeaderTitle}>Live Drive</Text>

            {/* Right: Presence Pill + Notification Bell */}
            <View style={styles.liveHeaderRight}>
              <View style={styles.presencePill}>
                <View
                  style={[
                    styles.presenceDot,
                    { backgroundColor: presenceStatus === 'ON_SITE' ? '#22C55E' : '#F59E0B' },
                  ]}
                />
                <Text style={styles.presenceText}>{presenceStatus === 'ON_SITE' ? 'ON-SITE' : 'OFF-SITE'}</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowNotifModal(true)}
                style={styles.bellBtn}
              >
                <Bell size={20} color="#FFFFFF" />
                {unreadNotifCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. Top Floating Vehicle Info & Live Tracking Bar */}
        <View style={styles.liveVehicleBarWrap}>
          <View style={styles.liveVehicleBar}>
            {/* Left: REGO Box */}
            <View style={styles.regoBoxWrap}>
              <Text style={styles.regoBoxLabel}>REGO</Text>
              <View style={styles.regoBox}>
                <Text style={styles.regoBoxText}>{currentVehicleRego}</Text>
              </View>
            </View>

            {/* Middle: Vehicle Title */}
            <View style={styles.vehicleTitleWrap}>
              <Text style={styles.vehicleTitleText} numberOfLines={1}>
                {currentVehicleLabel}
              </Text>
            </View>

            {/* Right: Live Tracking Pill with Pulsing Red Dot */}
            <View style={styles.liveTrackingPill}>
              <Animated.View style={[styles.liveTrackingDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveTrackingText}>LIVE TRACKING</Text>
            </View>
          </View>
        </View>

        {/* 3. Interactive Route Map (OSM Slippy Tiles with Live Route) */}
        <View style={styles.mapArea}>
          <RoadTestRouteMap
            points={routePoints}
            state={tripState}
            floatingStats={{
              distanceKm: distanceKm,
              durationMin: Math.max(1, Math.round(elapsedSec / 60)),
              speedKph: speedKph,
            }}
          />
        </View>

        {/* 4. Bottom Sheet Card with Metrics & Stop Drive Button */}
        <View style={styles.bottomCard}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Heading */}
          <Text style={styles.bottomCardTitle}>Driving {currentVehicleRego}</Text>
          <Text style={styles.bottomCardSub}>Route is being tracked and mapped.</Text>

          {/* 3 Metric Columns */}
          <View style={styles.metricsRow}>
            {/* Duration */}
            <View style={styles.metricCol}>
              <View style={styles.metricIconWrap}>
                <Clock size={20} color="#DC2626" />
              </View>
              <Text style={styles.metricVal}>{formatClock(elapsedSec)}</Text>
              <Text style={styles.metricLabel}>DURATION</Text>
            </View>

            <View style={styles.metricDivider} />

            {/* Distance */}
            <View style={styles.metricCol}>
              <View style={styles.metricIconWrap}>
                <MapPin size={20} color="#DC2626" />
              </View>
              <Text style={styles.metricVal}>{distanceKm.toFixed(1)} km</Text>
              <Text style={styles.metricLabel}>DISTANCE</Text>
            </View>

            <View style={styles.metricDivider} />

            {/* Speed */}
            <View style={styles.metricCol}>
              <View style={styles.metricIconWrap}>
                <Gauge size={20} color="#DC2626" />
              </View>
              <Text style={styles.metricVal}>{speedKph} km/h</Text>
              <Text style={styles.metricLabel}>SPEED</Text>
            </View>
          </View>

          {/* Auto-save helper notice */}
          <Text style={styles.autoSaveNotice}>
            Auto-saves to Previous drives when you stop.
          </Text>

          {/* Large Stop Drive Red Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleStopDrive}
            style={styles.stopDriveBtn}
          >
            <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.stopDriveBtnText}>Stop Drive</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Website-Style Bottom Navigation Bar (Figma Image 1) */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 10, 24) }]}>
          {/* 1. Home */}
          <TouchableOpacity activeOpacity={0.7} onPress={onOpenHome || onOpenTickets} style={styles.bottomBarTab}>
            <Home size={22} color={colors.textSecondary} />
            <Text style={styles.bottomBarLabel}>Home</Text>
          </TouchableOpacity>

          {/* 2. Drive (ACTIVE) */}
          <TouchableOpacity activeOpacity={0.7} style={styles.bottomBarTab}>
            <Car size={22} color="#DC2626" />
            <Text style={[styles.bottomBarLabel, { color: '#DC2626', fontWeight: '700' }]}>Drive</Text>
          </TouchableOpacity>

          {/* 3. Center Red Primary Action: Stop Drive */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleStopDrive}
            style={styles.bottomBarActionBtn}
          >
            <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.bottomBarActionText}>Stop Drive</Text>
          </TouchableOpacity>

          {/* 4. Loaners */}
          <TouchableOpacity activeOpacity={0.7} onPress={onOpenLoaners} style={styles.bottomBarTab}>
            <Key size={22} color={colors.textSecondary} />
            <Text style={styles.bottomBarLabel}>Loaners</Text>
          </TouchableOpacity>

          {/* 5. Profile */}
          <TouchableOpacity activeOpacity={0.75} onPress={onOpenProfile} style={styles.bottomBarUserTab}>
            <View style={styles.bottomBarAvatar}>
              <Text style={styles.bottomBarAvatarText}>{userInitials}</Text>
            </View>
            <Text style={styles.bottomBarLabel} numberOfLines={1}>{userFirstName}</Text>
          </TouchableOpacity>
        </View>

        <NotificationModal
          visible={showNotifModal}
          onClose={() => setShowNotifModal(false)}
          onSelectNotification={() => {
            setShowNotifModal(false);
            onOpenTickets();
          }}
        />
      </View>
    );
  }

  // -----------------------------------------------------------------------------------
  // RENDER: START A DRIVE VIEW (Figma Image 2)
  // -----------------------------------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* 1. Header with Booran Motors Logo, Presence, and Notifications */}
      <Header
        showBrandLogo
        onLogout={onLogout}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowNotifModal(true)}
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

      {/* 2. Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Card A: YOUR ASSIGNED ROOFTOP */}
        <View style={styles.rooftopCard}>
          <View style={styles.rooftopIconWrap}>
            <Building2 size={20} color="#DC2626" />
          </View>
          <View style={styles.rooftopTextWrap}>
            <Text style={styles.rooftopKicker}>YOUR ASSIGNED ROOFTOP</Text>
            <Text style={styles.rooftopName} numberOfLines={1}>
              {siteName || 'Booran BYD Cranbourne'}
            </Text>
          </View>
          <View style={styles.assignedBadge}>
            <Lock size={12} color="#64748B" />
            <Text style={styles.assignedBadgeText}>Assigned</Text>
          </View>
        </View>

        {/* Card B: INTERNAL TEST DRIVE - Start a drive. */}
        <View style={styles.startDriveCard}>
          <Text style={styles.testDriveKicker}>INTERNAL TEST DRIVE</Text>
          <Text style={styles.startDriveTitle}>Start a drive.</Text>
          <Text style={styles.startDriveDesc}>
            Enter the vehicle rego, tap Start Drive, and we will track and map the route until you stop.
          </Text>

          {/* REGO Input */}
          <Text style={styles.regoLabel}>REGO</Text>
          <View style={styles.regoInputContainer}>
            <Car size={22} color="#0F172A" />
            <TextInput
              value={regoInput}
              onChangeText={setRegoInput}
              placeholder="1BY-9EV"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              style={styles.regoInput}
            />
            {regoInput.length > 0 && (
              <TouchableOpacity
                onPress={() => setRegoInput('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <XCircle size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.regoHelperText}>
            Registration plate of the vehicle you are driving.
          </Text>

          {/* Big Red Button: + Start Drive */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleStartDrive}
            style={styles.startDriveBtn}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.8} />
            <Text style={styles.startDriveBtnText}>Start Drive</Text>
          </TouchableOpacity>

          {/* Instant Desk Testing Simulator Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleStartSimulatedDrive}
            style={styles.simulationLink}
          >
            <Play size={12} color="#64748B" />
            <Text style={styles.simulationLinkText}>
              Simulate route demonstration (desk test)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card C: Previous drives Section */}
        <View style={styles.previousSectionHeader}>
          <Text style={styles.previousTitle}>Previous drives</Text>
          <Text style={styles.previousCount}>{tripRecords.length} drives</Text>
        </View>

        {tripRecords.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => setSelectedTripDetail(item)}
            style={styles.driveCard}
          >
            {/* Left: Rego & Model */}
            <View style={styles.driveCardLeft}>
              <Text style={styles.driveRego}>{item.registration}</Text>
              <Text style={styles.driveModel} numberOfLines={1}>
                {item.vehicleLabel}
              </Text>
            </View>

            {/* Middle: Badge & Stats */}
            <View style={styles.driveCardMiddle}>
              <View style={styles.completeBadge}>
                <Check size={11} color="#15803D" strokeWidth={3} />
                <Text style={styles.completeBadgeText}>COMPLETE</Text>
              </View>
              <Text style={styles.driveMetrics}>
                {item.duration} • {item.distanceKm} km
              </Text>
              <Text style={styles.driveTime}>
                {item.dateLabel || item.startTime}
              </Text>
            </View>

            {/* Right: Mini Map Route Thumbnail & Chevron */}
            <View style={styles.driveCardRight}>
              <MiniRoutePreview points={item.routePoints} />
              <ChevronRight size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 3. Website-Style Bottom Navigation Bar (Figma Image 2) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 10, 24) }]}>
        {/* 1. Home */}
        <TouchableOpacity activeOpacity={0.7} onPress={onOpenHome || onOpenTickets} style={styles.bottomBarTab}>
          <Home size={22} color={colors.textSecondary} />
          <Text style={styles.bottomBarLabel}>Home</Text>
        </TouchableOpacity>

        {/* 2. Drive (ACTIVE) */}
        <TouchableOpacity activeOpacity={0.7} style={styles.bottomBarTab}>
          <Car size={22} color="#DC2626" />
          <Text style={[styles.bottomBarLabel, { color: '#DC2626', fontWeight: '700' }]}>Drive</Text>
        </TouchableOpacity>

        {/* 3. Center Red Primary Action: + Start Drive */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleStartDrive}
          style={styles.bottomBarActionBtn}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.bottomBarActionText}>Start Drive</Text>
        </TouchableOpacity>

        {/* 4. Loaners */}
        <TouchableOpacity activeOpacity={0.7} onPress={onOpenLoaners} style={styles.bottomBarTab}>
          <Key size={22} color={colors.textSecondary} />
          <Text style={styles.bottomBarLabel}>Loaners</Text>
        </TouchableOpacity>

        {/* 5. Profile */}
        <TouchableOpacity activeOpacity={0.75} onPress={onOpenProfile} style={styles.bottomBarUserTab}>
          <View style={styles.bottomBarAvatar}>
            <Text style={styles.bottomBarAvatarText}>{userInitials}</Text>
          </View>
          <Text style={styles.bottomBarLabel} numberOfLines={1}>{userFirstName}</Text>
        </TouchableOpacity>
      </View>

      {/* Trip Details Inspection Modal */}
      <Modal
        visible={selectedTripDetail !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTripDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{selectedTripDetail?.registration}</Text>
                <Text style={styles.modalSub}>{selectedTripDetail?.vehicleLabel}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedTripDetail(null)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Route Map Preview */}
            <View style={styles.modalMapWrap}>
              <RoadTestRouteMap
                points={selectedTripDetail?.routePoints || []}
                state="returned"
                compact
              />
            </View>

            {/* Stats Summary */}
            <View style={styles.modalStatsGrid}>
              <View style={styles.modalStatCard}>
                <Clock size={16} color="#DC2626" />
                <Text style={styles.modalStatVal}>{selectedTripDetail?.duration}</Text>
                <Text style={styles.modalStatLabel}>DURATION</Text>
              </View>

              <View style={styles.modalStatCard}>
                <MapPin size={16} color="#DC2626" />
                <Text style={styles.modalStatVal}>{selectedTripDetail?.distanceKm} km</Text>
                <Text style={styles.modalStatLabel}>DISTANCE</Text>
              </View>

              <View style={styles.modalStatCard}>
                <Gauge size={16} color="#DC2626" />
                <Text style={styles.modalStatVal}>{getDisplayMaxSpeed(selectedTripDetail)} km/h</Text>
                <Text style={styles.modalStatLabel}>MAX SPEED</Text>
              </View>
            </View>

            {/* Diagnostic Note */}
            <View style={styles.modalNoteWrap}>
              <Text style={styles.modalNoteLabel}>DIAGNOSTIC VERIFICATION</Text>
              <Text style={styles.modalNoteText}>
                {selectedTripDetail?.note || 'Road test completed. Telemetry automatically saved.'}
              </Text>
              <Text style={styles.modalNoteMeta}>
                Logged by {selectedTripDetail?.technician || 'Technician'} • {selectedTripDetail?.dateLabel}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedTripDetail(null)}
              style={styles.modalDoneBtn}
            >
              <Text style={styles.modalDoneBtnText}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onSelectNotification={() => {
          setShowNotifModal(false);
          onOpenTickets();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // -----------------------------------------------------------------------------------
  // LIVE DRIVE HEADER & BARS (Figma Image 1)
  // -----------------------------------------------------------------------------------
  liveHeader: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  liveHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  liveHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 5,
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  presenceText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#D32F2F',
    fontSize: 9.5,
    fontWeight: '800',
  },

  // Floating Top Vehicle Bar
  liveVehicleBarWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  liveVehicleBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  regoBoxWrap: {
    alignItems: 'center',
  },
  regoBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 2,
  },
  regoBox: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  regoBoxText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  vehicleTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  vehicleTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveTrackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  liveTrackingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },
  liveTrackingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },

  // Map Area
  mapArea: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },

  // Bottom Sheet Card (Live Drive)
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomCardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconWrap: {
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  autoSaveNotice: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  stopDriveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  stopDriveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // -----------------------------------------------------------------------------------
  // START A DRIVE CARDS (Figma Image 2)
  // -----------------------------------------------------------------------------------
  rooftopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rooftopIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rooftopTextWrap: {
    flex: 1,
  },
  rooftopKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  rooftopName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  assignedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  // Start Drive Card
  startDriveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  testDriveKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  startDriveTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  startDriveDesc: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 18,
  },
  regoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  regoInputContainer: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  regoInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginLeft: 10,
    letterSpacing: 1.2,
  },
  regoHelperText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 16,
  },
  startDriveBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  startDriveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  simulationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 5,
    paddingVertical: 4,
  },
  simulationLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },

  // Previous drives Section
  previousSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previousTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  previousCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  driveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  driveCardLeft: {
    flex: 1.1,
  },
  driveRego: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  driveModel: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
  },
  driveCardMiddle: {
    flex: 1.2,
    paddingHorizontal: 8,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  completeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  driveMetrics: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  driveTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  driveCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // -----------------------------------------------------------------------------------
  // BOTTOM NAVIGATION BAR (Standard 5 Tabs Across App)
  // -----------------------------------------------------------------------------------
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
    backgroundColor: '#D32F2F',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#D32F2F',
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
    borderColor: '#D32F2F',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarAvatarText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D32F2F',
  },

  // -----------------------------------------------------------------------------------
  // TRIP DETAIL MODAL
  // -----------------------------------------------------------------------------------
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMapWrap: {
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalStatVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 3,
  },
  modalStatLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  modalNoteWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  modalNoteLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modalNoteText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  modalNoteMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  modalDoneBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
