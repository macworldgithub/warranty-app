import React, { useState } from 'react';
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
  Radio,
  FileText,
  Key,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Flag,
  Navigation,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useRoadTest, RoadTestTripRecord } from '../../context/RoadTestContext';
import { RoadTestRouteMap } from '../../components/roadtest/RoadTestRouteMap';

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
    speedKph,
    maxSpeedKph,
    elapsedSec,
    distanceKm,
    routePoints,
    fenceRadius,
    tripRecords,
    setFenceRadius,
    armVehicle,
    disarmVehicle,
    startDemoDrive,
    resetDemo,
    loadVehicleByROOrRego,
  } = useRoadTest();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('live');
  const [searchQuery, setSearchQuery] = useState('RO-48291');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(tripRecords[0]?.id || null);
  const [filterType, setFilterType] = useState<'all' | 'flagged' | 'week'>('all');

  // Automation Settings
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [speedAlertsEnabled, setSpeedAlertsEnabled] = useState(false);

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
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <View style={styles.brandIconWrap}>
            <Gauge size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandName}>BOORAN MOTORS</Text>
            <Text style={styles.brandSub}>WARRANTY ROAD TEST</Text>
          </View>
        </View>

        <View style={styles.liveIndicator}>
          <View style={[styles.pulseDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.liveIndicatorText, { color: statusInfo.color }]}>
            {tripState === 'outside' ? 'LIVE TRACKING' : 'STANDBY'}
          </Text>
        </View>
      </View>

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
            Geofence
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
                  <View style={styles.fenceIcon}>
                    <MapPin size={16} color={colors.success} />
                  </View>
                  <View style={styles.fenceTextWrap}>
                    <Text style={styles.fenceTitle}>
                      {armed ? 'Automatic Road-Test Geofence Armed' : 'Geofence Standby'}
                    </Text>
                    <Text style={styles.fenceSub}>
                      Booran Motors Service • {fenceRadius}m departure boundary
                    </Text>
                  </View>
                  <View style={[styles.fenceStatusDot, armed && styles.fenceStatusDotActive]} />
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
              onPress={tripState === 'returned' ? resetDemo : startDemoDrive}
              style={[styles.primaryActionBtn, demoRunning && styles.primaryActionBtnDisabled]}
            >
              {tripState === 'returned' ? (
                <RotateCcw size={20} color="#FFFFFF" />
              ) : (
                <Play size={20} color="#FFFFFF" />
              )}
              <Text style={styles.primaryActionBtnText}>
                {demoRunning
                  ? 'SIMULATING ROAD TEST DRIVE...'
                  : tripState === 'returned'
                  ? 'RESET ROAD TEST'
                  : armed
                  ? 'START ROAD TEST DRIVE'
                  : 'ARM VEHICLE'}
              </Text>
            </TouchableOpacity>

            {armed && !demoRunning && tripState === 'inside' ? (
              <TouchableOpacity activeOpacity={0.7} onPress={disarmVehicle} style={styles.disarmBtn}>
                <Text style={styles.disarmBtnText}>Disarm tracking</Text>
              </TouchableOpacity>
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
            <View style={styles.settingsSectionCard}>
              <View style={styles.settingsHeaderRow}>
                <View>
                  <Text style={styles.settingsKicker}>WORKSHOP BOUNDARY</Text>
                  <Text style={styles.settingsTitle}>Geofence Radius</Text>
                </View>
                <View style={styles.radiusPill}>
                  <Text style={styles.radiusPillText}>{fenceRadius} m</Text>
                </View>
              </View>

              <Text style={styles.settingsHelperText}>
                Telemetry tracking begins immediately when the vehicle leaves this radius and stops
                upon returning. Recommended standard is 180 m.
              </Text>

              <View style={styles.radiusButtonsRow}>
                {[120, 180, 250, 400].map((rad) => (
                  <TouchableOpacity
                    key={rad}
                    activeOpacity={0.7}
                    onPress={() => setFenceRadius(rad)}
                    style={[
                      styles.radiusBtn,
                      fenceRadius === rad && styles.radiusBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusBtnText,
                        fenceRadius === rad && styles.radiusBtnTextActive,
                      ]}
                    >
                      {rad}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingsSectionCard}>
              <Text style={styles.settingsKicker}>AUTOMATION PREFERENCES</Text>
              <Text style={styles.settingsTitle}>Recording Rules</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchTitle}>Return Notifications</Text>
                  <Text style={styles.switchSub}>Alert when a road-test record is saved</Text>
                </View>
                <Switch
                  value={notifEnabled}
                  onValueChange={setNotifEnabled}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={notifEnabled ? colors.primary : '#FFFFFF'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchTitle}>Auto-Attach to Repair Order</Text>
                  <Text style={styles.switchSub}>Store route & telemetry directly with warranty evidence</Text>
                </View>
                <Switch
                  value={historyEnabled}
                  onValueChange={setHistoryEnabled}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={historyEnabled ? colors.primary : '#FFFFFF'}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchTitle}>Speed Threshold Flagging</Text>
                  <Text style={styles.switchSub}>Flag test drives that exceed statutory limits</Text>
                </View>
                <Switch
                  value={speedAlertsEnabled}
                  onValueChange={setSpeedAlertsEnabled}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={speedAlertsEnabled ? colors.primary : '#FFFFFF'}
                />
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  radiusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  radiusBtn: {
    flex: 1,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchLabelWrap: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
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
