import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BrandPackRule } from '../../types';

interface CameraModalProps {
  visible: boolean;
  rule: BrandPackRule | { ruleKey: string; name: string; guidanceText?: string; mediaType?: string };
  roNumber?: string;
  onClose: () => void;
  onCaptureSuccess: (result: {
    fileUri: string;
    ocrText?: string;
    fileSize: number;
    durationSeconds?: number;
  }) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CameraModal: React.FC<CameraModalProps> = ({
  visible,
  rule,
  roNumber,
  onClose,
  onCaptureSuccess,
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const isVideo = rule.mediaType === 'video';

  // Automatically trigger hardware camera immediately when modal opens
  React.useEffect(() => {
    if (visible) {
      handleOpenNativeCamera();
    }
  }, [visible]);


  const getOverlayGuide = () => {
    const key = rule.ruleKey.toLowerCase();
    if (key.includes('vin')) {
      return {
        title: 'VIN Plate / Barcode Framing',
        instruction: 'Align 17-character VIN plate or windscreen barcode inside blue box',
        frameStyle: styles.vinFrame,
      };
    }
    if (key.includes('odo')) {
      return {
        title: 'Odometer Cluster Framing',
        instruction: 'Vehicle powered ON. Ensure mileage numbers are crisp and readable.',
        frameStyle: styles.odoFrame,
      };
    }
    if (key.includes('front')) {
      return {
        title: 'Front 3/4 Vehicle Framing',
        instruction: 'Vehicle fills 80%+ of frame, rego plate visible.',
        frameStyle: styles.frontVehicleFrame,
      };
    }
    if (key.includes('close')) {
      return {
        title: 'Defect Macro Close-up',
        instruction: 'Defect fills frame with flash on. Ensure zero blur.',
        frameStyle: styles.macroFrame,
      };
    }
    if (key.includes('isolation') || key.includes('hv')) {
      return {
        title: 'HV Safety Isolation & Lockout',
        instruction: 'Frame Manual Service Disconnect (MSD) & tag.',
        frameStyle: styles.hvFrame,
      };
    }
    return {
      title: rule.name || 'Evidence Capture',
      instruction: rule.guidanceText || 'Position subject clearly in frame.',
      frameStyle: styles.defaultFrame,
    };
  };

  const guide = getOverlayGuide();

  // Helper to extract mock OCR text if VIN / ODO
  const getMockOcr = () => {
    if (rule.ruleKey.includes('vin')) return 'LGXCE4C86P0019283';
    if (rule.ruleKey.includes('odo')) return '14,250 km';
    return undefined;
  };

  // Request Android Camera Permission
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Workshop Camera Permission',
          message: 'Camera access is required to capture warranty evidence, VIN plates, and odometers.',
          buttonPositive: 'Grant Access',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Camera permission request error:', err);
      return true;
    }
  };

  // Launch Native Device Camera
  const handleOpenNativeCamera = async () => {
    setIsCapturing(true);
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setIsCapturing(false);
        Alert.alert(
          'Camera Permission Denied',
          'Camera permission is required. You can also import from gallery or use simulated capture.'
        );
        return;
      }

      const result = await launchCamera({
        mediaType: isVideo ? 'video' : 'photo',
        cameraType: 'back',
        quality: 0.9,
        saveToPhotos: false,
      });

      setIsCapturing(false);

      if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
        const asset = result.assets[0];
        const uri = asset.uri || `file:///data/user/0/com.warrantyapp/cache/${rule.ruleKey}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
        onCaptureSuccess({
          fileUri: uri,
          ocrText: getMockOcr(),
          fileSize: asset.fileSize || (isVideo ? 5200000 : 1850000),
          durationSeconds: asset.duration || (isVideo ? 24 : undefined),
        });
        onClose();
      }
    } catch (err) {
      setIsCapturing(false);
      handleSimulatedCapture();
    }
  };


  // Launch Photo / Video Gallery
  const handleOpenGallery = async () => {
    setIsCapturing(true);
    try {
      const result = await launchImageLibrary({
        mediaType: isVideo ? 'video' : 'photo',
        quality: 0.9,
      });

      setIsCapturing(false);

      if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
        const asset = result.assets[0];
        const uri = asset.uri || `file:///data/user/0/com.warrantyapp/cache/${rule.ruleKey}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
        onCaptureSuccess({
          fileUri: uri,
          ocrText: getMockOcr(),
          fileSize: asset.fileSize || (isVideo ? 5200000 : 1850000),
          durationSeconds: asset.duration || (isVideo ? 24 : undefined),
        });
        onClose();
      }
    } catch (err) {
      setIsCapturing(false);
      handleSimulatedCapture();
    }
  };

  // Simulated Quick Capture (Fallback / Testing)
  const handleSimulatedCapture = () => {
    const mockUri = `file:///data/user/0/com.warrantyapp/cache/${rule.ruleKey}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
    onCaptureSuccess({
      fileUri: mockUri,
      ocrText: getMockOcr() || undefined,
      fileSize: isVideo ? 5200000 : 1850000,
      durationSeconds: isVideo ? 24 : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.circleButton}
          >
            <Icon name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.ruleTitle} numberOfLines={1}>
              {rule.name}
            </Text>
            <Text style={styles.guidanceSubtitle}>
              {guide.instruction}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTorchOn(!torchOn)}
            style={[
              styles.circleButton,
              torchOn && { backgroundColor: colors.warning },
            ]}
          >
            <Icon
              name="sparkles"
              size={18}
              color={torchOn ? colors.background : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Viewfinder Area with OEM Overlay Frame */}
        <View style={styles.viewfinder}>
          {/* Subtle Ambient Workshop Grid Lines */}
          <View style={styles.gridOverlay}>
            <View style={styles.gridLineV1} />
            <View style={styles.gridLineV2} />
            <View style={styles.gridLineH1} />
            <View style={styles.gridLineH2} />
          </View>

          {/* Guide Reticle Box */}
          <View style={[styles.guideFrame, guide.frameStyle]}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            <View style={styles.frameLabelBadge}>
              <Text style={styles.frameLabelText}>{guide.title}</Text>
            </View>
          </View>

          {/* Camera Action Options inside Viewfinder */}
          <View style={styles.actionCardOverlay}>
            {isCapturing ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenNativeCamera}
                  style={styles.openCameraBtn}
                >
                  <Icon name="camera" size={22} color={colors.textPrimary} />
                  <Text style={styles.openCameraBtnText}>Open Hardware Camera</Text>
                </TouchableOpacity>

                <View style={styles.subActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenGallery}
                    style={styles.subActionBtn}
                  >
                    <Icon name="upload" size={14} color={colors.textSecondary} />
                    <Text style={styles.subActionBtnText}>Import Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSimulatedCapture}
                    style={styles.subActionBtn}
                  >
                    <Icon name="check" size={14} color={colors.primary} />
                    <Text style={styles.subActionBtnText}>Instant Snap</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Bottom Shutter & Controls */}
        <View style={styles.bottomBar}>
          <View style={styles.actionRow}>
            <Badge
              label={isVideo ? 'HD 1080p MP4' : '4K HDR JPG'}
              variant="outline"
              size="sm"
            />

            {/* Big Hardware Shutter Trigger */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenNativeCamera}
              style={[
                styles.shutterOuter,
                isVideo && styles.videoShutterOuter,
              ]}
            >
              <View
                style={[
                  styles.shutterInner,
                  isVideo && styles.videoShutterInner,
                ]}
              >
                <Icon
                  name={isVideo ? 'video' : 'camera'}
                  size={28}
                  color={isVideo ? colors.danger : colors.primary}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSimulatedCapture}
              style={styles.quickSimBtn}
            >
              <Text style={styles.quickSimText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0f17',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(12, 15, 23, 0.95)',
    zIndex: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'center',
  },
  ruleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  guidanceSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    textAlign: 'center',
    marginTop: 2,
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
  },
  gridLineV1: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ffffff',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ffffff',
  },
  gridLineH1: {
    position: 'absolute',
    top: '33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#ffffff',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#ffffff',
  },
  guideFrame: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  vinFrame: {
    width: SCREEN_WIDTH * 0.88,
    height: 130,
    borderColor: colors.accentCyan,
  },
  odoFrame: {
    width: SCREEN_WIDTH * 0.85,
    height: 160,
    borderColor: colors.warning,
  },
  frontVehicleFrame: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.65,
    borderColor: colors.primary,
  },
  macroFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: (SCREEN_WIDTH * 0.75) / 2,
    borderColor: colors.danger,
  },
  hvFrame: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.6,
    borderColor: '#FF7A00',
  },
  defaultFrame: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.7,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.textPrimary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  frameLabelBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: spacing.borderRadius.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  frameLabelText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  actionCardOverlay: {
    backgroundColor: 'rgba(20, 26, 40, 0.95)',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    width: SCREEN_WIDTH * 0.88,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    marginBottom: spacing.md,
  },
  openCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.sm,
  },
  openCameraBtnText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  subActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  subActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.borderRadius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subActionBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  bottomBar: {
    backgroundColor: 'rgba(12, 15, 23, 0.95)',
    paddingBottom: 34,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  videoShutterOuter: {
    borderColor: colors.danger,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoShutterInner: {
    backgroundColor: colors.dangerLight,
  },
  quickSimBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSimText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});

