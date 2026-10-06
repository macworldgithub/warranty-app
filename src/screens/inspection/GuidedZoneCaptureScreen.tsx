import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Camera,
  Car,
  ChevronRight,
  FileText,
  Home,
  Key,
  Plus,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  Bell,
  Wrench,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Header } from '../../components/common/Header';
import { GUIDED_CAPTURE_ZONES, CaptureZone } from '../../components/evidence/GuidedZoneStepper';
import { cameraService } from '../../services/cameraService';
import { offlineStorage, VehicleZoneInspection } from '../../services/offlineStorage';
import { evidenceUploadService } from '../../services/evidenceUpload.service';
import { RooftopVehicle } from '../../services/rooftopVehicles.service';
import { useAuth } from '../../context/AuthContext';
import { useCaseWizard } from '../../context/CaseWizardContext';
import { EvidenceItem } from '../../types';

interface GuidedZoneCaptureScreenProps {
  vehicle?: RooftopVehicle | null;
  onBack: () => void;
  onOpenHome?: () => void;
  onOpenTickets?: () => void;
  onOpenLoaners?: () => void;
  onOpenHoists?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onCompleteInspection?: (vehicle: RooftopVehicle) => void;
}

const DEFAULT_VEHICLE: RooftopVehicle = {
  id: 'veh_cr_01',
  vin: 'LGXCE4C86P0019283',
  rego: '1BY-9EV',
  make: 'BYD',
  model: 'ATTO 3 Extended',
  year: 2024,
  powertrain: 'EV',
  odometer: 18200,
  siteId: 'site_cranbourne_byd',
  siteName: 'Booran BYD Cranbourne',
  roNumber: 'CR-98421',
  inspectionNumber: '180001',
  warrantyStatus: 'Active Claim',
  inspectionStatus: 'IN_PROGRESS',
  capturedZones: 2,
  totalZones: 10,
  defectCount: 0,
  caseCount: 1,
};

export const GuidedZoneCaptureScreen: React.FC<GuidedZoneCaptureScreenProps> = ({
  vehicle = DEFAULT_VEHICLE,
  onBack,
  onOpenHome,
  onOpenTickets,
  onOpenLoaners,
  onOpenHoists,
  onOpenProfile,
  onLogout,
  onCompleteInspection,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    vin: wizardVin,
    make: wizardMake,
    model: wizardModel,
    year: wizardYear,
    powertrain: wizardPowertrain,
    roNumber: wizardRoNumber,
    siteId: wizardSiteId,
    siteName: wizardSiteName,
    saveEvidenceItem,
  } = useCaseWizard();

  const activeVehicle: RooftopVehicle = useMemo(() => {
    if (vehicle) return vehicle;
    if (wizardVin) {
      return {
        id: 'veh_active',
        vin: wizardVin,
        rego: '1BY-9EV',
        make: wizardMake || 'BYD',
        model: wizardModel || 'ATTO 3 Extended',
        year: wizardYear || 2024,
        powertrain: (wizardPowertrain as any) || 'EV',
        odometer: 18200,
        siteId: wizardSiteId || 'site_cranbourne_byd',
        siteName: wizardSiteName || 'Booran BYD Cranbourne',
        roNumber: wizardRoNumber || 'CR-98421',
        inspectionNumber: '180001',
        warrantyStatus: 'Active Claim',
        inspectionStatus: 'IN_PROGRESS',
        capturedZones: 0,
        totalZones: 10,
        defectCount: 0,
        caseCount: 1,
      };
    }
    return DEFAULT_VEHICLE;
  }, [vehicle, wizardVin, wizardMake, wizardModel, wizardYear, wizardPowertrain, wizardRoNumber, wizardSiteId, wizardSiteName]);

  const cleanVin = activeVehicle.vin.toUpperCase();

  const [inspection, setInspection] = useState<VehicleZoneInspection>(() => {
    const existing = offlineStorage.getVehicleInspection(cleanVin);
    if (existing) return existing;
    return {
      vin: cleanVin,
      roNumber: activeVehicle.inspectionNumber || activeVehicle.roNumber || '180001',
      capturedZoneKeys: [],
      evidenceItems: [],
      defects: [],
      status: 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
    };
  });

  // Active Zone state: defaults to first uncaptured zone
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number>(() => {
    const firstUncaptured = GUIDED_CAPTURE_ZONES.findIndex(
      (z) => !inspection.capturedZoneKeys.includes(z.ruleKey)
    );
    return firstUncaptured >= 0 ? firstUncaptured : 0;
  });
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const zoneStepperScrollRef = useRef<any>(null);
  const photoReviewScrollRef = useRef<any>(null);

  const currentZone: CaptureZone = GUIDED_CAPTURE_ZONES[selectedZoneIndex] || GUIDED_CAPTURE_ZONES[0];

  // Helper to check evidence for a zone
  const getZoneEvidence = (ruleKey: string) => {
    return inspection.evidenceItems.find((e) => e.ruleKey === ruleKey);
  };

  const getZoneDefect = (ruleKey: string) => {
    return inspection.defects.find((d) => d.zoneKey === ruleKey);
  };

  const capturedCount = inspection.capturedZoneKeys.length;
  const isAllCaptured = capturedCount >= 10;

  // Handle Photo Capture
  const handleCapturePhoto = async (fromGallery: boolean = false) => {
    setIsCapturing(true);
    try {
      // Determine target zone: If current zone is already captured, advance to first uncaptured zone
      let targetZone = currentZone;
      const isAlreadyCaptured = inspection.capturedZoneKeys.includes(currentZone.ruleKey);
      if (isAlreadyCaptured) {
        const nextUncaptured = GUIDED_CAPTURE_ZONES.find(
          (z) => !inspection.capturedZoneKeys.includes(z.ruleKey)
        );
        if (nextUncaptured) {
          targetZone = nextUncaptured;
          const targetIdx = GUIDED_CAPTURE_ZONES.findIndex((z) => z.ruleKey === nextUncaptured.ruleKey);
          if (targetIdx !== -1) {
            setSelectedZoneIndex(targetIdx);
          }
        }
      }

      let res;
      if (fromGallery) {
        res = await cameraService.pickFromGallery(false);
      } else {
        res = await cameraService.capturePhoto(targetZone.ruleKey);
      }

      setIsCapturing(false);

      if (res.success && res.fileUri) {
        const newEvidence: EvidenceItem = {
          id: `ev_${cleanVin}_${targetZone.ruleKey}_${Date.now()}`,
          ruleKey: targetZone.ruleKey,
          ruleName: targetZone.name,
          mediaType: 'image',
          fileUri: res.fileUri,
          fileSize: res.fileSize || 1850000,
          qualityStatus: 'PASSED',
          capturedAt: new Date().toISOString(),
          oemFileName: `${inspection.roNumber || '180001'}_${targetZone.shortLabel.replace(/\s+/g, '')}.jpg`,
        };

        // 1. Record into persistent offline storage
        const updated = offlineStorage.recordZoneCapture(cleanVin, targetZone.ruleKey, newEvidence);
        setInspection({ ...updated });

        // 2. Sync to CaseWizard
        saveEvidenceItem(newEvidence);

        // 3. Upload file to backend /uploads folder and save in MongoDB
        evidenceUploadService.uploadEvidenceToServer({
          vin: cleanVin,
          roNumber: inspection.roNumber || '180001',
          evidenceItem: newEvidence,
          vehicleDetails: {
            make: activeVehicle.make,
            model: activeVehicle.model,
            year: activeVehicle.year,
            powertrain: activeVehicle.powertrain,
          },
        }).then((uploadRes) => {
          if (uploadRes.success && uploadRes.storageUrl) {
            // Update local evidence with server storage URL
            newEvidence.storageUrl = uploadRes.storageUrl;
            offlineStorage.recordZoneCapture(cleanVin, targetZone.ruleKey, newEvidence);
          }
        }).catch((e) => console.warn('[GuidedZoneCaptureScreen] Server upload failed:', e));

        // 3. Auto advance to next uncaptured zone
        const nextIndex = GUIDED_CAPTURE_ZONES.findIndex(
          (z, i) => i > selectedZoneIndex && !updated.capturedZoneKeys.includes(z.ruleKey)
        );

        if (nextIndex !== -1) {
          setSelectedZoneIndex(nextIndex);
          zoneStepperScrollRef.current?.scrollTo({ x: Math.max(0, nextIndex * 74 - 40), animated: true });
        }
      }
    } catch (err) {
      setIsCapturing(false);
      console.warn('Capture error in GuidedZoneCaptureScreen:', err);
    }
  };

  const currentZoneEvidence = getZoneEvidence(currentZone.ruleKey);
  const hasCurrentZonePhoto = !!currentZoneEvidence?.fileUri;

  const userInitials = useMemo(() => {
    if (!user?.name) return 'SH';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const userFirstName = useMemo(() => {
    if (!user?.name) return 'shaun';
    return user.name.trim().toLowerCase().split(/\s+/)[0];
  }, [user?.name]);

  const inspectionNumber = activeVehicle.inspectionNumber || activeVehicle.roNumber || '180001';

  return (
    <View style={styles.container}>
      {/* ── 1. Top Red Branded Header with Back, Presence, Bell, and Logout ── */}
      <Header
        title={`Inspection #${inspectionNumber}`}
        onBack={onBack}
        onLogout={onLogout}
        showBrandLogo={false}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.headerBellBtn}
            onPress={() => {
              Alert.alert(
                'Inspection Notifications',
                'You have 7 pending inspections and condition alerts for Cranbourne rooftop.'
              );
            }}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#FFFFFF" strokeWidth={2} />
            <View style={styles.headerBellBadge}>
              <Text style={styles.headerBellBadgeText}>7</Text>
            </View>
          </TouchableOpacity>
        }
      />

      {/* ── 2. Scrollable Body Content ─────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Identity Card */}
        <View style={styles.vehicleCard}>
          {getZoneEvidence('front_vehicle_photo')?.fileUri ? (
            <Image
              source={{ uri: getZoneEvidence('front_vehicle_photo')!.fileUri }}
              style={styles.vehicleImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.vehiclePlaceholderImg}>
              <Car size={26} color="#DC2626" />
            </View>
          )}
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle} numberOfLines={1}>
              {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
            </Text>
            <View style={styles.vehicleTagsRow}>
              <View style={styles.regoPill}>
                <Text style={styles.regoText}>{activeVehicle.rego}</Text>
              </View>
              <Text style={styles.vinText}>
                <Text style={{ color: '#94A3B8', fontWeight: '700' }}>VIN  </Text>
                {activeVehicle.vin}
              </Text>
            </View>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {inspection.status === 'COMPLETE' ? 'COMPLETE' : 'IN PROGRESS'}
            </Text>
          </View>
        </View>

        {/* GUIDED ZONE CAPTURE Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>GUIDED ZONE CAPTURE</Text>
          <Text style={styles.sectionHeaderSub}>
            {capturedCount} of 10 zones photographed.
          </Text>
        </View>

        {/* Horizontal Zone Stepper */}
        <ScrollView
          ref={zoneStepperScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.zoneStepperContent}
          style={styles.zoneStepperScroll}
        >
          {GUIDED_CAPTURE_ZONES.map((zone, idx) => {
            const isCaptured = inspection.capturedZoneKeys.includes(zone.ruleKey);
            const isSelected = idx === selectedZoneIndex;

            return (
              <TouchableOpacity
                key={zone.id}
                onPress={() => setSelectedZoneIndex(idx)}
                activeOpacity={0.8}
                style={[
                  styles.zoneTabItem,
                  isSelected && styles.zoneTabItemSelected,
                ]}
              >
                <View
                  style={[
                    styles.zoneIconContainer,
                    isCaptured && styles.zoneIconContainerCaptured,
                    isSelected && styles.zoneIconContainerSelected,
                  ]}
                >
                  {isCaptured ? (
                    <View style={styles.capturedBadgeCircle}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <Car size={18} color={isSelected ? '#DC2626' : '#64748B'} />
                  )}
                </View>

                {isSelected && (
                  <View style={styles.zoneSelectedPill}>
                    <Text style={styles.zoneSelectedPillText}>{idx + 1} of 10</Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.zoneTabLabel,
                    isSelected && styles.zoneTabLabelSelected,
                  ]}
                  numberOfLines={2}
                >
                  {zone.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Zone Capture Card */}
        <View style={styles.activeZoneCard}>
          <View style={styles.activeZoneHeader}>
            <Text style={styles.activeZoneName}>{currentZone.name.toUpperCase()}</Text>
            <Text style={styles.activeZoneStep}>{selectedZoneIndex + 1} of 10</Text>
          </View>
          <Text style={styles.activeZoneDesc}>{currentZone.description}</Text>

          {/* Dashed Camera Upload Box */}
          <TouchableOpacity
            style={styles.dashedBox}
            onPress={() => handleCapturePhoto(false)}
            activeOpacity={0.85}
          >
            {hasCurrentZonePhoto ? (
              <View style={styles.photoPreviewWrapper}>
                <Image
                  source={{ uri: currentZoneEvidence?.fileUri }}
                  style={styles.capturedPhotoPreview}
                  resizeMode="cover"
                />
                <View style={styles.retakeOverlay}>
                  <Camera size={18} color="#FFFFFF" />
                  <Text style={styles.retakeText}>Tap to retake photo</Text>
                </View>
              </View>
            ) : isCapturing ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingText}>Opening camera...</Text>
              </View>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Camera size={44} color="#475569" strokeWidth={1.5} />
                <Text style={styles.cameraTapTitle}>Tap to open camera</Text>
                <Text style={styles.cameraTapSubtitle}>JPEG or PNG accepted.</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ANNOTATED PHOTO REVIEW Section */}
        <View style={styles.photoReviewSection}>
          <Text style={styles.photoReviewHeader}>ANNOTATED PHOTO REVIEW</Text>

          <ScrollView
            ref={photoReviewScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoReviewScroll}
          >
            {GUIDED_CAPTURE_ZONES.map((zone, idx) => {
              const ev = getZoneEvidence(zone.ruleKey);
              const defect = getZoneDefect(zone.ruleKey);
              const isCaptured = !!ev?.fileUri;

              return (
                <TouchableOpacity
                  key={zone.id}
                  style={styles.reviewItemCard}
                  onPress={() => setSelectedZoneIndex(idx)}
                  activeOpacity={0.8}
                >
                  {isCaptured ? (
                    <View style={styles.thumbnailWrap}>
                      <Image
                        source={{ uri: ev.fileUri }}
                        style={styles.reviewThumbnail}
                        resizeMode="cover"
                      />
                      {defect ? (
                        <View style={styles.defectBadgeCircle}>
                          <Text style={styles.defectBadgeText}>1</Text>
                        </View>
                      ) : (
                        <View style={styles.checkBadgeCircle}>
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyThumbnailWrap}>
                      <Car size={24} color="#CBD5E1" />
                    </View>
                  )}

                  <Text style={styles.reviewZoneTitle} numberOfLines={1}>
                    {zone.name}
                  </Text>

                  {isCaptured ? (
                    <Text
                      style={[
                        styles.reviewDefectText,
                        defect ? styles.reviewDefectRed : styles.reviewDefectGreen,
                      ]}
                    >
                      {defect ? '1 defect' : '0 defects'}
                    </Text>
                  ) : (
                    <Text style={styles.reviewAddText}>Add photos</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Defect Detail Strip */}
          {inspection.defects && inspection.defects.length > 0 && (
            <TouchableOpacity
              style={styles.defectCard}
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert(
                  'AI Defect Analysis',
                  `${inspection.defects[0].description} detected by Vision LLM. Marked as repair required.`
                );
              }}
            >
              {getZoneEvidence(inspection.defects[0].zoneKey)?.fileUri ? (
                <Image
                  source={{ uri: getZoneEvidence(inspection.defects[0].zoneKey)!.fileUri }}
                  style={styles.defectThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.defectThumbnail, styles.defectThumbnailEmpty]}>
                  <Sparkles size={18} color="#DC2626" />
                </View>
              )}
              <View style={styles.defectDetails}>
                <Text style={styles.defectTitle}>{inspection.defects[0].description}</Text>
                <View style={styles.aiDetectedBadge}>
                  <Sparkles size={12} color="#2563EB" />
                  <Text style={styles.aiDetectedText}>AI-detected 92%</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* Big Action Button */}
          <TouchableOpacity
            style={styles.mainActionBtn}
            onPress={() => {
              if (isAllCaptured && onCompleteInspection) {
                onCompleteInspection(activeVehicle);
              } else {
                handleCapturePhoto(false);
              }
            }}
            activeOpacity={0.85}
          >
            {isAllCaptured ? (
              <>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.mainActionBtnText}>Complete & Save Inspection</Text>
              </>
            ) : (
              <>
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.mainActionBtnText}>Open Camera</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── 3. Bottom Navigation Bar Matching Exact Design ─────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        {/* 1. Home */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenHome}
          style={styles.bottomBarTab}
        >
          <Home size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Home</Text>
        </TouchableOpacity>

        {/* 2. Center Red Primary Floating Pill Button: + Capture Photo */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleCapturePhoto(false)}
          style={styles.bottomBarActionBtn}
        >
          <Camera size={16} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.bottomBarActionText}>+ Capture Photo</Text>
        </TouchableOpacity>

        {/* 3. Hoists */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenHoists}
          style={styles.bottomBarTab}
        >
          <Wrench size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Hoists</Text>
        </TouchableOpacity>

        {/* 4. Loaners */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenLoaners}
          style={styles.bottomBarTab}
        >
          <Key size={22} color="#64748B" />
          <Text style={styles.bottomBarLabel}>Loaners</Text>
        </TouchableOpacity>

        {/* 5. User Profile / Initials Avatar */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenProfile}
          style={styles.bottomBarTab}
        >
          <View style={styles.bottomBarAvatarCircle}>
            <Text style={styles.bottomBarAvatarText}>{userInitials}</Text>
          </View>
          <Text style={styles.bottomBarLabel} numberOfLines={1}>
            {userFirstName}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  vehicleImage: {
    width: 72,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  vehiclePlaceholderImg: {
    width: 72,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  vehicleTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regoPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  regoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  vinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  statusPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.6,
  },
  sectionHeaderSub: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  zoneStepperScroll: {
    marginBottom: 14,
  },
  zoneStepperContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  zoneTabItem: {
    alignItems: 'center',
    width: 66,
  },
  zoneTabItemSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  zoneIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  zoneIconContainerCaptured: {
    backgroundColor: '#DCFCE7',
  },
  zoneIconContainerSelected: {
    backgroundColor: '#FEE2E2',
  },
  capturedBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneSelectedPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  zoneSelectedPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  zoneTabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  zoneTabLabelSelected: {
    color: '#0F172A',
    fontWeight: '900',
  },
  activeZoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  activeZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeZoneName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  activeZoneStep: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activeZoneDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  dashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cameraTapTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 8,
  },
  cameraTapSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  capturedPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  retakeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  photoReviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  photoReviewHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  photoReviewScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  reviewItemCard: {
    width: 80,
    alignItems: 'center',
  },
  thumbnailWrap: {
    width: 76,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  reviewThumbnail: {
    width: '100%',
    height: '100%',
  },
  checkBadgeCircle: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  defectBadgeCircle: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  defectBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptyThumbnailWrap: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  reviewZoneTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    textAlign: 'center',
  },
  reviewDefectText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  reviewDefectGreen: {
    color: '#16A34A',
  },
  reviewDefectRed: {
    color: '#DC2626',
  },
  reviewAddText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  defectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  defectThumbnail: {
    width: 58,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  defectThumbnailEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  defectDetails: {
    flex: 1,
  },
  defectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  aiDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  aiDetectedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  mainActionBtn: {
    backgroundColor: '#DC2626',
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  mainActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomBarTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    gap: 3,
  },
  bottomBarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  bottomBarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: 4,
  },
  bottomBarActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  bottomBarAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  bottomBarAvatarText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
  },

  // ── HEADER NOTIFICATION BELL ─────────────────────────────────────────
  headerBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 6,
  },
  headerBellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBellBadgeText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontWeight: '900',
  },
});
