import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { authApi } from '../../api/auth.api';
import { User } from '../../types';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type AuthTab = 'SIGN_IN' | 'SIGN_UP';

const DEALERSHIP_SITES = [
  { id: 'site_cranbourne_byd', name: 'Cranbourne BYD', code: 'BYD-CR' },
  { id: 'site_berwick_toyota_ford', name: 'Berwick Toyota & Ford', code: 'TF-BW' },
  { id: 'site_dandenong_hyundai', name: 'Dandenong Hyundai', code: 'HYU-DN' },
  { id: 'site_frankston_mg', name: 'Frankston MG & Chery', code: 'MG-FK' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const { login, registerTechnician, isLoading } = useAuth();
  const { serverUrl, setServerUrl, isOnline, checkConnectivity } = useNetwork();

  // Tab State: SIGN_IN or SIGN_UP
  const [activeTab, setActiveTab] = useState<AuthTab>('SIGN_IN');

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('technician@booran.com.au');
  const [signInPassword, setSignInPassword] = useState('password123');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpEmployeeId, setSignUpEmployeeId] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState('site_cranbourne_byd');

  // Developer URL Drawer (Hidden by default)
  const [showDevConfig, setShowDevConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const users = await authApi.getUsers();
        if (users && users.length > 0) {
          // Filter exclusively to Technicians for mobile app
          const techList = users.filter(
            u => !u.role || u.role.toUpperCase() === 'TECHNICIAN'
          );
          if (techList.length > 0) {
            setTechnicians(techList);
          } else {
            setTechnicians(users.map(u => ({ ...u, role: 'TECHNICIAN' })));
          }
        }
      } catch (err) {
        // Default workshop technicians fallback
        setTechnicians([
          {
            id: 'usr_tech_1',
            name: 'Jake Smith',
            email: 'technician@booran.com.au',
            role: 'TECHNICIAN',
            defaultSiteId: 'site_cranbourne_byd',
          },
          {
            id: 'usr_ahad',
            name: 'Abdul Ahad',
            email: 'abdulahadnauman10@gmail.com',
            role: 'TECHNICIAN',
            defaultSiteId: 'site_berwick_toyota_ford',
          },
          {
            id: 'usr_tech_2',
            name: 'Marcus Vance',
            email: 'marcus.vance@booran.com.au',
            role: 'TECHNICIAN',
            defaultSiteId: 'site_dandenong_hyundai',
          },
        ]);
      }
    };

    fetchTechnicians();
  }, [serverUrl]);

  const handleSignIn = async (emailToUse?: string) => {
    setAuthError(null);
    const targetEmail = emailToUse || signInEmail;
    if (!targetEmail || !targetEmail.trim()) {
      setAuthError('Please enter a valid technician email address.');
      return;
    }

    try {
      await login(targetEmail.trim(), signInPassword);
      onLoginSuccess();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check server connection.');
    }
  };

  const handleSignUp = async () => {
    setAuthError(null);
    if (!signUpName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setAuthError('Please enter a valid technician email.');
      return;
    }
    if (signUpPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    try {
      await registerTechnician({
        name: signUpName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        employeeId: signUpEmployeeId.trim(),
        defaultSiteId: selectedSiteId,
      });
      onLoginSuccess();
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleSaveDevConfig = () => {
    setServerUrl(tempUrl);
    setShowDevConfig(false);
    checkConnectivity();
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Brand Hero & Header */}
      <View style={styles.heroSection}>
        <View style={styles.logoBadge}>
          <Icon name="shield" size={32} color={colors.primary} />
        </View>
        <Text style={styles.brandSubtitle}>BOORAN MOTOR GROUP · AFTERSALES</Text>
        <Text style={styles.appTitle}>Technician Evidence App</Text>
        <Text style={styles.appDescription}>
          Guided Warranty Evidence Capture · Multi-Brand OEM Rule Packs
        </Text>

        <View style={styles.statusRow}>
          <Badge
            label={isOnline ? 'Backend Connected' : 'Offline Queue Mode'}
            variant={isOnline ? 'success' : 'warning'}
            size="sm"
            icon={
              <Icon
                name={isOnline ? 'wifi' : 'wifi-off'}
                size={12}
                color={isOnline ? colors.success : colors.warning}
              />
            }
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDevConfig(!showDevConfig)}
            style={styles.devGearBtn}
          >
            <Icon name="sliders" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hidden Developer Config Drawer */}
      {showDevConfig && (
        <View style={styles.configCard}>
          <View style={styles.configCardHeader}>
            <Icon name="sliders" size={14} color={colors.primary} />
            <Text style={styles.configTitle}>Developer API Host Override</Text>
          </View>
          <View style={styles.configInputRow}>
            <TextInput
              value={tempUrl}
              onChangeText={setTempUrl}
              style={styles.configInput}
              placeholder="http://10.0.2.2:4000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title="Apply"
              variant="primary"
              size="sm"
              onPress={handleSaveDevConfig}
            />
          </View>
        </View>
      )}

      {/* Error Alert Banner */}
      {authError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{authError}</Text>
        </View>
      )}

      {/* Mode Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('SIGN_IN');
            setAuthError(null);
          }}
          style={[styles.tabButton, activeTab === 'SIGN_IN' && styles.tabButtonActive]}
        >
          <Icon
            name="log-in"
            size={16}
            color={activeTab === 'SIGN_IN' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'SIGN_IN' && styles.tabTextActive,
            ]}
          >
            Technician Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('SIGN_UP');
            setAuthError(null);
          }}
          style={[styles.tabButton, activeTab === 'SIGN_UP' && styles.tabButtonActive]}
        >
          <Icon
            name="user-plus"
            size={16}
            color={activeTab === 'SIGN_UP' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'SIGN_UP' && styles.tabTextActive,
            ]}
          >
            New Registration
          </Text>
        </TouchableOpacity>
      </View>

      {/* SIGN IN VIEW */}
      {activeTab === 'SIGN_IN' && (
        <View style={styles.formCard}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Technician Email</Text>
            <View style={styles.inputWrapper}>
              <Icon name="mail" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signInEmail}
                onChangeText={setSignInEmail}
                style={styles.textInput}
                placeholder="technician@booran.com.au"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signInPassword}
                onChangeText={setSignInPassword}
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showSignInPassword}
              />
              <TouchableOpacity
                onPress={() => setShowSignInPassword(!showSignInPassword)}
                style={styles.eyeBtn}
              >
                <Icon
                  name={showSignInPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Direct Sign In Button */}
          <Button
            title="Sign In to Workshop App"
            variant="primary"
            size="huge"
            loading={isLoading}
            onPress={() => handleSignIn()}
            leftIcon={<Icon name="shield" size={20} color={colors.textPrimary} />}
            fullWidth
            style={styles.mainActionBtn}
          />

          {/* Quick Select Workshop Technicians */}
          {technicians.length > 0 && (
            <View style={styles.quickSelectSection}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR QUICK SELECT TECHNICIAN</Text>
                <View style={styles.dividerLine} />
              </View>

              {technicians.map(tech => {
                const isSelected = signInEmail.toLowerCase() === tech.email.toLowerCase();
                return (
                  <TouchableOpacity
                    key={tech.id || tech.email}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSignInEmail(tech.email);
                      handleSignIn(tech.email);
                    }}
                    style={[
                      styles.techCard,
                      isSelected && styles.techCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.techAvatar,
                        isSelected && styles.techAvatarSelected,
                      ]}
                    >
                      <Text style={styles.avatarText}>{tech.name.charAt(0)}</Text>
                    </View>

                    <View style={styles.techInfo}>
                      <Text style={styles.techName}>{tech.name}</Text>
                      <Text style={styles.techEmail}>{tech.email}</Text>
                      <Text style={styles.techSite}>
                        Workshop Technician · {tech.defaultSiteId || 'Cranbourne BYD'}
                      </Text>
                    </View>

                    <Icon name="chevron-right" size={20} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* SIGN UP VIEW */}
      {activeTab === 'SIGN_UP' && (
        <View style={styles.formCard}>
          <Text style={styles.signUpHeaderTitle}>Create Workshop Technician Account</Text>
          <Text style={styles.signUpHeaderDesc}>
            Register your technician profile to capture and upload warranty evidence packs.
          </Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="user" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signUpName}
                onChangeText={setSignUpName}
                style={styles.textInput}
                placeholder="e.g. Abdul Ahad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Work Email *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="mail" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signUpEmail}
                onChangeText={setSignUpEmail}
                style={styles.textInput}
                placeholder="abdul.ahad@booran.com.au"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Employee ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee Badge ID / RO Tag (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Icon name="shield" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signUpEmployeeId}
                onChangeText={setSignUpEmployeeId}
                style={styles.textInput}
                placeholder="e.g. TECH-4092"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Primary Dealership Site Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Primary Dealership Site *</Text>
            <View style={styles.sitesGrid}>
              {DEALERSHIP_SITES.map(site => {
                const isSelected = selectedSiteId === site.id;
                return (
                  <TouchableOpacity
                    key={site.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSiteId(site.id)}
                    style={[
                      styles.siteChip,
                      isSelected && styles.siteChipSelected,
                    ]}
                  >
                    <Icon
                      name={isSelected ? 'check-circle' : 'map-pin'}
                      size={14}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.siteChipText,
                        isSelected && styles.siteChipTextSelected,
                      ]}
                    >
                      {site.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signUpPassword}
                onChangeText={setSignUpPassword}
                style={styles.textInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showSignUpPassword}
              />
              <TouchableOpacity
                onPress={() => setShowSignUpPassword(!showSignUpPassword)}
                style={styles.eyeBtn}
              >
                <Icon
                  name={showSignUpPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                value={signUpConfirmPassword}
                onChangeText={setSignUpConfirmPassword}
                style={styles.textInput}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showSignUpPassword}
              />
            </View>
          </View>

          {/* Sign Up Button */}
          <Button
            title="Create Technician Account"
            variant="primary"
            size="huge"
            loading={isLoading}
            onPress={handleSignUp}
            leftIcon={<Icon name="user-plus" size={20} color={colors.textPrimary} />}
            fullWidth
            style={styles.mainActionBtn}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: colors.primaryLight,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: typography.sizes.xl + 2,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  appDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  devGearBtn: {
    padding: spacing.xs,
  },
  configCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  configCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  configTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  configInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  configInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    borderWidth: 1,
    borderColor: colors.border,
    height: 38,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.sm,
    gap: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signUpHeaderTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  signUpHeaderDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  sitesGrid: {
    gap: spacing.xs,
  },
  siteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  siteChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  siteChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  siteChipTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
  },
  mainActionBtn: {
    marginTop: spacing.md,
  },
  quickSelectSection: {
    marginTop: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
    letterSpacing: 1,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  techAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techAvatarSelected: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  techEmail: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  techSite: {
    fontSize: typography.sizes.xs - 2,
    color: colors.primaryLight,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
});

