import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Activity,
  Car,
  Clock,
  Settings,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Gauge,
  Compass,
  Radio,
  Search,
  Check,
  Shield,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useRoadTest } from '../../context/RoadTestContext';
import { RouteMapSvg } from '../../components/roadtest/RouteMapSvg';
import { DEMO_ROUTE, formatClock, lookupVehicleInList } from '../../services/roadtest/roadTestData';
import { LookupMode, TripRecord } from '../../types/roadTest';

type TabKey = 'LIVE' | 'VEHICLE' | 'TRIPS' | 'SETTINGS';

interface RoadTestScreenProps {
  onBack: () => void;
  initialVehicleData?: {
    rego?: string;
    vin?: string;
    roNumber?: string;
    make?: string;
    model?: string;
    year?: number;
    customerName?: string;
  };
}

export function RoadTestScreen({ onBack, initialVehicleData }: RoadTestScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('LIVE');

  const {
    vehicle,
    armed,
    tripState,
    demoRunning,
    routePoints,
    speedKph,
    maxSpeedKph,
    elapsedSec,
    distanceKm,
    fenceRadius,
    setFenceRadius,
    startDemoDrive,
    resetDemo,
    armVehicle,
    disarmVehicle,
    armCustomVehicle,
    tripRecords,
    allVehicles,
  } = useRoadTest();

  // Search & lookup state for Vehicle tab
  const [searchMode, setSearchMode] = useState<LookupMode>('repairOrder');
  const [searchQuery, setSearchQuery] = useState(initialVehicleData?.roNumber || initialVehicleData?.rego || 'RO-48291');
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  // Expanded trip in Trips tab
  const [expandedTripId, setExpandedTripId] = useState<string | null>(tripRecords[0]?.id ?? null);

  // Settings tab switches
  const [notifications, setNotifications] = useState(true);
  const [keepHistory, setKeepHistory] = useState(true);
  const [speedAlerts, setSpeedAlerts] = useState(false);

  // Status computation for Live tab
  const statusConfig = tripState === 'outside'
    ? { label: 'ROAD TEST IN PROGRESS', title: 'Vehicle is outside the geofence', color: colors.primary }
    : tripState === 'returned'
    ? { label: 'ROAD TEST SAVED', title: 'Vehicle returned automatically', color: colors.success }
    : { label: 'VEHICLE ARMED', title: 'Waiting inside workshop boundary', color: colors.accentCyan };

  const handleLookup = () => {
    const result = lookupVehicleInList(allVehicles, searchMode, searchQuery);
    if (!result) {
      setLookupMessage('No matching record. Try RO-48291, SGS 274, or C-10482.');
      return;
    }
    armCustomVehicle(result);
    setLookupMessage('Vehicle and repair order linked & armed.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.navTitleGroup}>
          <Text style={styles.navTitle}>Road Test Telemetry</Text>
          <Text style={styles.navSubtitle}>Booran Automated Warranty GPS</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={styles.liveIndicatorText}>
            {tripState === 'outside' ? 'LIVE' : tripState === 'returned' ? 'SAVED' : 'ARMED'}
          </Text>
        </View>
      </View>

      {/* Segmented Top Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'LIVE' && styles.tabItemActive]}
          onPress={() => setActiveTab('LIVE')}
          activeOpacity={0.7}
        >
          <Activity size={16} color={activeTab === 'LIVE' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'LIVE' && styles.tabLabelActive]}>Live Drive</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'VEHICLE' && styles.tabItemActive]}
          onPress={() => setActiveTab('VEHICLE')}
          activeOpacity={0.7}
        >
          <Car size={16} color={activeTab === 'VEHICLE' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'VEHICLE' && styles.tabLabelActive]}>Vehicle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'TRIPS' && styles.tabItemActive]}
          onPress={() => setActiveTab('TRIPS')}
          activeOpacity={0.7}
        >
          <Clock size={16} color={activeTab === 'TRIPS' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'TRIPS' && styles.tabLabelActive]}>Trips ({tripRecords.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SETTINGS' && styles.tabItemActive]}
          onPress={() => setActiveTab('SETTINGS')}
          activeOpacity={0.7}
        >
          <Settings size={16} color={activeTab === 'SETTINGS' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'SETTINGS' && styles.tabLabelActive]}>Geofence</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* ==================== TAB 1: LIVE DRIVE ==================== */}
        {activeTab === 'LIVE' && (
          <View>
            {/* Status Card */}
            <View style={styles.darkStatusCard}>
              <View style={styles.statusHeaderRow}>
                <View style={[styles.statusBadgeDot, { backgroundColor: statusConfig.color }]} />
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>
              <Text style={styles.statusMainTitle}>{statusConfig.title}</Text>
              {vehicle ? (
                <View style={styles.vehicleStrip}>
                  <Text style={styles.vehicleStripName}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
                  <Text style={styles.vehicleStripMeta}>{vehicle.registration} • {vehicle.repairOrder}</Text>
                </View>
              ) : null}
            </View>

            {/* Live Interactive Route Map */}
            <RouteMapSvg points={routePoints} state={tripState} />

            {/* Telemetry Metric Cards */}
            <View style={styles.metricsRow}>
              {/* Big Speed Card */}
              <View style={styles.speedCard}>
                <View style={styles.speedIconCircle}>
                  <Gauge size={18} color="#EF4444" />
                </View>
                <Text style={styles.speedValueText}>{speedKph}</Text>
                <Text style={styles.speedUnitText}>KM/H</Text>
                <Text style={styles.speedLabelText}>CURRENT SPEED</Text>
              </View>

              {/* Sub Metrics Column 1 */}
              <View style={styles.metricColumn}>
                <View style={styles.metricTile}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.tileLabel}>DURATION</Text>
                  <Text style={styles.tileValue}>{formatClock(elapsedSec)}</Text>
                </View>
                <View style={styles.metricTile}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={styles.tileLabel}>DISTANCE</Text>
                  <Text style={styles.tileValue}>{distanceKm.toFixed(1)} km</Text>
                </View>
              </View>

              {/* Sub Metrics Column 2 */}
              <View style={styles.metricColumn}>
                <View style={styles.metricTile}>
                  <Activity size={16} color={colors.textSecondary} />
                  <Text style={styles.tileLabel}>MAX SPEED</Text>
                  <Text style={styles.tileValue}>{maxSpeedKph} km/h</Text>
                </View>
                <View style={styles.metricTile}>
                  <Radio size={16} color={colors.success} />
                  <Text style={styles.tileLabel}>STATUS</Text>
                  <Text style={[styles.tileValue, { color: colors.success }]}>
                    {tripState === 'outside' ? 'Logging' : tripState === 'returned' ? 'Complete' : 'Armed'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Automation Audit Timeline */}
            <View style={styles.timelineCard}>
              <Text style={styles.sectionHeader}>AUTOMATED GEOFENCE LOG</Text>
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineNode, styles.timelineNodeDone]}>
                  <Check size={12} color="#059669" />
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineItemTitle}>Vehicle Armed & Synced</Text>
                  <Text style={styles.timelineItemSub}>Linked to {vehicle?.repairOrder || 'RO'}</Text>
                </View>
                <Text style={styles.timelineTime}>Active</Text>
              </View>

              <View style={styles.timelineItem}>
                <View style={[styles.timelineNode, tripState !== 'inside' && styles.timelineNodeActive]}>
                  {tripState !== 'inside' ? <Check size={12} color="#FFFFFF" /> : null}
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineItemTitle}>Geofence Exit Detected</Text>
                  <Text style={styles.timelineItemSub}>Automatic route & speed recording trigger</Text>
                </View>
                <Text style={styles.timelineTime}>{tripState === 'inside' ? 'Pending' : 'Recorded'}</Text>
              </View>

              <View style={[styles.timelineItem, { borderBottomWidth: 0 }]}>
                <View style={[styles.timelineNode, tripState === 'returned' && styles.timelineNodeDone]}>
                  {tripState === 'returned' ? <Check size={12} color="#059669" /> : null}
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineItemTitle}>Geofence Re-entry</Text>
                  <Text style={styles.timelineItemSub}>Drive completed & stored to warranty audit</Text>
                </View>
                <Text style={styles.timelineTime}>{tripState === 'returned' ? 'Saved' : 'Waiting'}</Text>
              </View>
            </View>

            {/* Drive Simulation Controls */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, demoRunning && styles.disabledBtn]}
                onPress={tripState === 'returned' ? resetDemo : startDemoDrive}
                disabled={demoRunning}
                activeOpacity={0.8}
              >
                {tripState === 'returned' ? (
                  <>
                    <RotateCcw size={18} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>RESET ROAD TEST DEMO</Text>
                  </>
                ) : (
                  <>
                    <Play size={18} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>
                      {demoRunning ? 'SIMULATING ROAD TEST DRIVE...' : 'START ROAD TEST TRACKING'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== TAB 2: VEHICLE & WORK ==================== */}
        {activeTab === 'VEHICLE' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.kicker}>VEHICLE LOOKUP</Text>
              <Text style={styles.cardTitle}>Find & Arm Vehicle</Text>

              {/* Mode Selector */}
              <View style={styles.modePillRow}>
                {(['repairOrder', 'registration', 'vin', 'customer'] as LookupMode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modePill, searchMode === m && styles.modePillActive]}
                    onPress={() => setSearchMode(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modePillText, searchMode === m && styles.modePillTextActive]}>
                      {m === 'repairOrder' ? 'RO' : m === 'registration' ? 'Rego' : m === 'vin' ? 'VIN' : 'Customer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Search Input & Button */}
              <View style={styles.searchRow}>
                <View style={styles.inputContainer}>
                  <Search size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Enter RO, Rego, or VIN"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleLookup} activeOpacity={0.8}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>

              {lookupMessage ? (
                <Text style={[styles.messageText, lookupMessage.startsWith('No') ? styles.errorMsg : styles.successMsg]}>
                  {lookupMessage}
                </Text>
              ) : null}
            </View>

            {/* Currently Armed Vehicle Card */}
            {vehicle ? (
              <View style={styles.darkVehicleCard}>
                <View style={styles.darkVehicleHeader}>
                  <View style={styles.carIconBox}>
                    <Car size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.darkVehicleTitle}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
                    <Text style={styles.darkVehicleVariant}>{vehicle.variant} • {vehicle.colour}</Text>
                  </View>
                  <View style={styles.regoPill}>
                    <Text style={styles.regoPillText}>{vehicle.registration}</Text>
                  </View>
                </View>

                <View style={styles.darkDivider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.gridLabel}>REPAIR ORDER</Text>
                    <Text style={styles.gridValue}>{vehicle.repairOrder}</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.gridLabel}>CUSTOMER</Text>
                    <Text style={styles.gridValue}>{vehicle.customerName}</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.gridLabel}>ODOMETER</Text>
                    <Text style={styles.gridValue}>{vehicle.odometerKm.toLocaleString()} km</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.gridLabel}>VIN</Text>
                    <Text style={styles.gridValue}>•••••• {vehicle.vin.slice(-6)}</Text>
                  </View>
                </View>

                <View style={styles.concernContainer}>
                  <FileText size={16} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.concernTitle}>DIAGNOSTIC CONCERN</Text>
                    <Text style={styles.concernBody}>{vehicle.concern}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.armButton, armed ? styles.armButtonActive : styles.armButtonInactive]}
                  onPress={armed ? disarmVehicle : armVehicle}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.armButtonText}>
                    {armed ? 'VEHICLE IS ARMED FOR ROAD TEST' : 'ARM THIS VEHICLE'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* ==================== TAB 3: TRIPS HISTORY ==================== */}
        {activeTab === 'TRIPS' && (
          <View>
            <View style={styles.tripsSummaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{tripRecords.length}</Text>
                <Text style={styles.summaryLabel}>TOTAL DRIVES</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>72</Text>
                <Text style={styles.summaryLabel}>AVG KM/H</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>100%</Text>
                <Text style={styles.summaryLabel}>LOGGED</Text>
              </View>
            </View>

            {tripRecords.map((item) => {
              const isExpanded = expandedTripId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.tripCard}
                  onPress={() => setExpandedTripId(isExpanded ? null : item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.tripCardHeader}>
                    <View style={[styles.tripOutcomeBadge, item.outcome === 'Flagged' ? styles.badgeFlagged : styles.badgePass]}>
                      <Check size={14} color={item.outcome === 'Flagged' ? colors.danger : colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripVehicleText}>{item.vehicleLabel}</Text>
                      <Text style={styles.tripMetaText}>{item.registration} • {item.repairOrder}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.tripDateText}>{item.dateLabel}</Text>
                      <Text style={styles.tripTimeText}>{item.startTime}</Text>
                    </View>
                  </View>

                  <View style={styles.tripStatsRow}>
                    <View style={styles.tripStatItem}>
                      <Text style={styles.tripStatLabel}>TIME</Text>
                      <Text style={styles.tripStatVal}>{item.duration}</Text>
                    </View>
                    <View style={styles.tripStatItem}>
                      <Text style={styles.tripStatLabel}>DISTANCE</Text>
                      <Text style={styles.tripStatVal}>{item.distanceKm.toFixed(1)} km</Text>
                    </View>
                    <View style={styles.tripStatItem}>
                      <Text style={styles.tripStatLabel}>MAX SPEED</Text>
                      <Text style={styles.tripStatVal}>{item.maxSpeedKph} km/h</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <RouteMapSvg points={DEMO_ROUTE} state="returned" compact />
                      <View style={styles.tripNoteBox}>
                        <Text style={styles.tripNoteLabel}>TECHNICIAN AUDIT NOTE</Text>
                        <Text style={styles.tripNoteBody}>{item.note}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ==================== TAB 4: GEOFENCE & SETTINGS ==================== */}
        {activeTab === 'SETTINGS' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.kicker}>DEALERSHIP BOUNDARY</Text>
              <Text style={styles.cardTitle}>Geofence Radius</Text>
              <Text style={styles.cardSubtitle}>
                Vehicle departure triggers automated speed & telemetry recording. Re-entry finalises the warranty audit record.
              </Text>

              {/* Radius Chips */}
              <View style={styles.radiusRow}>
                {[120, 180, 250, 400].map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={[styles.radiusChip, fenceRadius === radius && styles.radiusChipActive]}
                    onPress={() => setFenceRadius(radius)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.radiusChipText, fenceRadius === radius && styles.radiusChipTextActive]}>
                      {radius} m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Automation Options Card */}
            <View style={styles.card}>
              <Text style={styles.kicker}>AUTOMATION PREFERENCES</Text>
              <Text style={styles.cardTitle}>Record Behaviour</Text>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Departure & Return Alerts</Text>
                  <Text style={styles.settingSub}>Notify technician on geofence transition</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={notifications ? colors.primary : '#FFFFFF'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Attach Route to Warranty Case</Text>
                  <Text style={styles.settingSub}>Save telemetry directly to warranty ticket</Text>
                </View>
                <Switch
                  value={keepHistory}
                  onValueChange={setKeepHistory}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={keepHistory ? colors.primary : '#FFFFFF'}
                />
              </View>

              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Speed Compliance Warnings</Text>
                  <Text style={styles.settingSub}>Flag speeds exceeding road test protocol</Text>
                </View>
                <Switch
                  value={speedAlerts}
                  onValueChange={setSpeedAlerts}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={speedAlerts ? colors.primary : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Privacy Card */}
            <View style={styles.privacyCard}>
              <Shield size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Privacy by Design</Text>
                <Text style={styles.privacySub}>
                  GPS telemetry is locked strictly to the active repair order and road test duration.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleGroup: {
    flex: 1,
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  navSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveIndicatorText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  darkStatusCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusMainTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  vehicleStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  vehicleStripName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
  },
  vehicleStripMeta: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  speedCard: {
    flex: 1.1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 140,
  },
  speedIconCircle: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedValueText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  speedUnitText: {
    color: '#EF4444',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  speedLabelText: {
    color: '#94A3B8',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  metricColumn: {
    flex: 1,
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  tileValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  timelineNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineNodeDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  timelineNodeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineItemTitle: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  timelineItemSub: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },
  timelineTime: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: spacing.md,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  kicker: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  modePillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  modePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.25)',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modePillTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  messageText: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 8,
  },
  successMsg: {
    color: colors.success,
  },
  errorMsg: {
    color: colors.danger,
  },
  darkVehicleCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: spacing.sm,
  },
  darkVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  carIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkVehicleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  darkVehicleVariant: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  regoPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  regoPillText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  darkDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  detailGridItem: {
    width: '50%',
  },
  gridLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gridValue: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  concernContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  concernTitle: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  concernBody: {
    color: '#E2E8F0',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  armButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  armButtonActive: {
    backgroundColor: colors.success,
  },
  armButtonInactive: {
    backgroundColor: colors.primary,
  },
  armButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tripsSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tripOutcomeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePass: {
    backgroundColor: '#ECFDF5',
  },
  badgeFlagged: {
    backgroundColor: '#FEF2F2',
  },
  tripVehicleText: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '900',
  },
  tripMetaText: {
    color: colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  tripDateText: {
    color: colors.textPrimary,
    fontSize: 9.5,
    fontWeight: '800',
  },
  tripTimeText: {
    color: colors.textMuted,
    fontSize: 8.5,
  },
  tripStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tripStatItem: {
    flex: 1,
  },
  tripStatLabel: {
    color: colors.textMuted,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tripStatVal: {
    color: colors.textPrimary,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 1,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tripNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripNoteLabel: {
    color: colors.textMuted,
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tripNoteBody: {
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  radiusChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  settingSub: {
    color: colors.textSecondary,
    fontSize: 9.5,
    marginTop: 2,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyTitle: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
  },
  privacySub: {
    color: colors.textSecondary,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 1,
  },
});
