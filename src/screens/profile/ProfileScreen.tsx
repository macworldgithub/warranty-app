import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { Header } from '../../components/common/Header';
import { authApi } from '../../api/auth.api';
import { User, UserRole } from '../../types';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

const ROOFTOP_OPTIONS = [
  { id: 'site_cranbourne_byd', name: 'Booran BYD Cranbourne' },
  { id: 'site_dandenong_multi', name: 'Booran Dandenong Multi' },
  { id: 'site_cheltenham_mg', name: 'Booran MG Cheltenham' },
  { id: 'site_berwick_toyota_ford', name: 'Booran Berwick Multi' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onLogout }) => {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();
  const { isOnline, pendingCount } = useNetwork();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Registered Users Directory State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'TECHNICIAN'>('ALL');

  // Add User Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('Booran2026!');
  const [createRole, setCreateRole] = useState<UserRole>('TECHNICIAN');
  const [createSiteId, setCreateSiteId] = useState('site_cranbourne_byd');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit User Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('TECHNICIAN');
  const [editSiteId, setEditSiteId] = useState('site_cranbourne_byd');
  const [editPassword, setEditPassword] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Action Loading
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CLERK' || user?.role === 'SERVICE_MANAGER';

  // Load registered users from backend
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await authApi.getUsers();
      if (Array.isArray(data)) {
        setUsersList(data);
      }
    } catch (err: any) {
      console.log('Failed to fetch registered users:', err?.message || err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const promises: Promise<any>[] = [refreshMe()];
      if (isAdmin) {
        promises.push(loadUsers());
      }
      await Promise.all(promises);
      Alert.alert('Profile Updated', 'Your profile details have been refreshed.');
    } catch {
      // Ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Booran Warranty account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchRole = u.role?.toLowerCase().includes(q);
      return matchName || matchEmail || matchRole;
    });
  }, [usersList, searchQuery, roleFilter]);

  // Open Edit Modal
  const handleOpenEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name || '');
    setEditEmail(targetUser.email || '');
    setEditRole(targetUser.role || 'TECHNICIAN');
    setEditSiteId(targetUser.defaultSiteId || 'site_cranbourne_byd');
    setEditPassword('');
    setEditModalVisible(true);
  };

  // Confirm Create User
  const handleCreateUser = async () => {
    if (!createName.trim()) {
      Alert.alert('Validation Error', 'Please enter the user full name.');
      return;
    }
    if (!createEmail.trim() || !createEmail.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid work email address.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await authApi.createUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword.trim() || 'Booran2026!',
        role: createRole,
        siteId: createSiteId,
      });

      Alert.alert('User Created', `Account for ${createName} (${createRole}) has been created successfully.`);
      setAddModalVisible(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('Booran2026!');
      setCreateRole('TECHNICIAN');
      loadUsers();
    } catch (err: any) {
      Alert.alert('Failed to Create User', err?.message || 'Could not register user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Confirm Update User
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter the user full name.');
      return;
    }

    setEditSubmitting(true);
    try {
      await authApi.updateUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        siteId: editSiteId,
        ...(editPassword?.trim() ? { password: editPassword.trim() } : {}),
      });

      const rooftopName =
        ROOFTOP_OPTIONS.find((r) => r.id === editSiteId)?.name || editSiteId;

      // Update user in local usersList state immediately
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
              ...u,
              name: editName.trim(),
              email: editEmail.trim(),
              role: editRole,
              defaultSiteId: editSiteId,
            }
            : u
        )
      );

      Alert.alert(
        'Rooftop & User Updated',
        `Primary Leadership rooftop for ${editName} has been updated to "${rooftopName}".`
      );
      setEditModalVisible(false);
      setEditingUser(null);
      if (editingUser.id === user?.id) {
        refreshMe();
      }
    } catch (err: any) {
      Alert.alert('Failed to Update User', err?.message || 'Could not update user account.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Confirm Delete User
  const handleDeleteUser = (targetUser: User) => {
    if (targetUser.id === user?.id) {
      Alert.alert('Action Restricted', 'You cannot delete your own active account.');
      return;
    }
    if (targetUser.id === 'usr_admin_1') {
      Alert.alert('Action Restricted', 'The primary system administrator account cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${targetUser.name} (${targetUser.email})? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(targetUser.id);
            try {
              await authApi.deleteUser(targetUser.id);
              Alert.alert('User Deleted', `Account for ${targetUser.name} has been removed.`);
              loadUsers();
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete user account.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Profile & Settings"
        subtitle="Manage your workshop account"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* User Card Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCircle, isAdmin && styles.adminAvatar]}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
          </View>

          <Text style={styles.userName}>{user?.name || 'Workshop Member'}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>

          <View style={styles.roleBadgeContainer}>
            {isAdmin ? (
              <Badge
                label="ADMINISTRATOR"
                variant="warning"
                size="md"
                icon={<Icon name="shield" size={14} color="#B45309" />}
              />
            ) : (
              <Badge
                label="TECHNICIAN"
                variant="primary"
                size="md"
                icon={<Icon name="wrench" size={14} color={colors.primary} />}
              />
            )}
            <Badge
              label={isOnline ? 'Online' : 'Offline'}
              variant={isOnline ? 'success' : 'neutral'}
              size="sm"
            />
          </View>
        </View>

        {/* Role Permissions Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="shield" size={18} color={isAdmin ? '#D97706' : colors.primary} />
            <Text style={styles.sectionTitle}>Role Permissions & Access</Text>
          </View>

          <View style={[styles.permissionBanner, isAdmin ? styles.adminBanner : styles.techBanner]}>
            <Text style={styles.permissionTitle}>
              {isAdmin ? 'System Administrator' : 'Workshop Technician'}
            </Text>
            <Text style={styles.permissionDesc}>
              {isAdmin
                ? 'Full Administrative Oversight: You have access to view, audit, and monitor all warranty evidence submissions across all technicians and workshop rooftops.'
                : 'Technician Access: You have permission to capture OEM-compliant evidence, record voice notes, and submit warranty claims. Only your own warranty cases are displayed.'}
            </Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="user-check" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Account Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValueMono}>{user?.id || '—'}</Text>
          </View>


          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Pending Queue</Text>
            <Text style={styles.infoValue}>
              {pendingCount > 0 ? `${pendingCount} item(s) pending sync` : 'All synced'}
            </Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* REGISTERED USERS DIRECTORY (ADMIN ONLY)                   */}
        {/* ========================================================= */}
        {isAdmin && (
          <View style={styles.sectionCard}>
            <View style={styles.directoryHeaderRow}>
              <View style={styles.sectionHeader}>
                <Icon name="user" size={18} color={colors.primary} />
                <View>
                  <Text style={styles.sectionTitle}>Registered Users</Text>
                  <Text style={styles.sectionSubTitle}>
                    {usersList.length} total team member{usersList.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {isAdmin && (
                <TouchableOpacity
                  style={styles.addUserHeaderBtn}
                  onPress={() => setAddModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Icon name="user-plus" size={14} color="#FFFFFF" />
                  <Text style={styles.addUserHeaderBtnText}>+ Add User</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, or role..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Role Filter Chips */}
            <View style={styles.filterChipRow}>
              {(['ALL', 'ADMIN', 'TECHNICIAN'] as const).map((r) => {
                const isSelected = roleFilter === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                    onPress={() => setRoleFilter(r)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                      {r === 'ALL' ? 'All Roles' : r === 'ADMIN' ? 'Admins' : 'Technicians'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Users List */}
            {loadingUsers ? (
              <View style={styles.usersLoadingContainer}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.usersLoadingText}>Loading user directory...</Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.noUsersContainer}>
                <Text style={styles.noUsersText}>No registered users match your criteria.</Text>
              </View>
            ) : (
              <View style={styles.usersListContainer}>
                {filteredUsers.map((item) => {
                  const itemIsAdmin = item.role === 'ADMIN';
                  const isCurrentSelf = item.id === user?.id;

                  return (
                    <View key={item.id} style={styles.userItemCard}>
                      <View style={styles.userItemLeft}>
                        <View style={[styles.userItemAvatar, itemIsAdmin && styles.userItemAvatarAdmin]}>
                          <Text style={[styles.userItemAvatarText, itemIsAdmin && styles.userItemAvatarTextAdmin]}>
                            {getInitials(item.name)}
                          </Text>
                        </View>

                        <View style={styles.userItemDetails}>
                          <View style={styles.userItemNameRow}>
                            <Text style={styles.userItemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            {isCurrentSelf && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>YOU</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.userItemEmail} numberOfLines={1}>
                            {item.email}
                          </Text>
                          <View style={styles.userItemMetaRow}>
                            <Badge
                              label={itemIsAdmin ? 'ADMIN' : 'TECH'}
                              variant={itemIsAdmin ? 'warning' : 'primary'}
                              size="sm"
                            />
                            <Text style={styles.userItemSite} numberOfLines={1}>
                              {item.defaultSiteId ? item.defaultSiteId.replace(/site_|_/g, ' ').toUpperCase() : 'CRANBOURNE BYD'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Admin Action Buttons (Edit / Delete) */}
                      {isAdmin && (
                        <View style={styles.userActionButtons}>
                          <TouchableOpacity
                            style={styles.editUserBtn}
                            onPress={() => handleOpenEdit(item)}
                            activeOpacity={0.7}
                          >
                            <Icon name="sliders" size={15} color={colors.textPrimary} />
                          </TouchableOpacity>

                          {!isCurrentSelf && item.id !== 'usr_admin_1' && (
                            <TouchableOpacity
                              style={styles.deleteUserBtn}
                              onPress={() => handleDeleteUser(item)}
                              activeOpacity={0.7}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? (
                                <ActivityIndicator color={colors.flagged} size="small" />
                              ) : (
                                <Icon name="trash" size={15} color={colors.flagged} />
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.actionSection}>
          <Button
            title="Refresh Account Data"
            variant="secondary"
            size="md"
            leftIcon={<Icon name="refresh" size={16} color={colors.textPrimary} />}
            loading={isRefreshing}
            onPress={handleRefresh}
            fullWidth
            style={styles.refreshButton}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogoutPress}
            style={styles.logoutButton}
          >
            <Icon name="log-out" size={18} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Log Out of Workshop</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionFooter}>
          Booran Motors Warranty Capture · v1.0.0
        </Text>
      </ScrollView>

      {/* ========================================================= */}
      {/* ADD & EDIT USER MODALS (ADMIN ONLY)                       */}
      {/* ========================================================= */}
      {isAdmin && (
        <>
          <Modal
            visible={addModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setAddModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconCircle}>
                    <Icon name="user-plus" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Add Registered User</Text>
                    <Text style={styles.modalSubTitle}>Create a new workshop or admin account</Text>
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="E.g., John Smith"
                    placeholderTextColor={colors.textMuted}
                    value={createName}
                    onChangeText={setCreateName}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Work Email *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="E.g., jsmith@booran.com.au"
                    placeholderTextColor={colors.textMuted}
                    value={createEmail}
                    onChangeText={setCreateEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Initial Password</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Booran2026!"
                    placeholderTextColor={colors.textMuted}
                    value={createPassword}
                    onChangeText={setCreatePassword}
                    secureTextEntry
                  />
                </View>

                {/* Role Selection */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>System Role</Text>
                  <View style={styles.rolePickerRow}>
                    <TouchableOpacity
                      style={[styles.rolePickBtn, createRole === 'TECHNICIAN' && styles.rolePickBtnActive]}
                      onPress={() => setCreateRole('TECHNICIAN')}
                    >
                      <Icon
                        name="wrench"
                        size={14}
                        color={createRole === 'TECHNICIAN' ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.rolePickBtnText,
                          createRole === 'TECHNICIAN' && styles.rolePickBtnTextActive,
                        ]}
                      >
                        Technician
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rolePickBtn, createRole === 'ADMIN' && styles.rolePickBtnActiveAdmin]}
                      onPress={() => setCreateRole('ADMIN')}
                    >
                      <Icon
                        name="shield"
                        size={14}
                        color={createRole === 'ADMIN' ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.rolePickBtnText,
                          createRole === 'ADMIN' && styles.rolePickBtnTextActive,
                        ]}
                      >
                        Administrator
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Dealership Site Selector */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Primary Dealership Rooftop</Text>
                  <View style={styles.sitePickerList}>
                    {ROOFTOP_OPTIONS.map((site) => {
                      const isChosen = createSiteId === site.id;
                      return (
                        <TouchableOpacity
                          key={site.id}
                          style={[styles.siteOption, isChosen && styles.siteOptionActive]}
                          onPress={() => setCreateSiteId(site.id)}
                        >
                          <Icon
                            name={isChosen ? 'check' : 'building'}
                            size={14}
                            color={isChosen ? colors.primary : colors.textSecondary}
                          />
                          <Text style={[styles.siteOptionText, isChosen && styles.siteOptionTextActive]}>
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setAddModalVisible(false)}
                    disabled={createSubmitting}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, createSubmitting && styles.btnDisabled]}
                    onPress={handleCreateUser}
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Icon name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.modalSubmitBtnText}>Create Account</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* ========================================================= */}
          {/* EDIT USER MODAL                                           */}
          {/* ========================================================= */}
          <Modal
            visible={editModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setEditModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="sliders" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Edit Registered User</Text>
                    <Text style={styles.modalSubTitle}>{editingUser?.email}</Text>
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="User name"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Work Email</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>


                {/* Role Selection */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>System Role</Text>
                  <View style={styles.rolePickerRow}>
                    <TouchableOpacity
                      style={[styles.rolePickBtn, editRole === 'TECHNICIAN' && styles.rolePickBtnActive]}
                      onPress={() => setEditRole('TECHNICIAN')}
                    >
                      <Icon
                        name="wrench"
                        size={14}
                        color={editRole === 'TECHNICIAN' ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.rolePickBtnText,
                          editRole === 'TECHNICIAN' && styles.rolePickBtnTextActive,
                        ]}
                      >
                        Technician
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rolePickBtn, editRole === 'ADMIN' && styles.rolePickBtnActiveAdmin]}
                      onPress={() => setEditRole('ADMIN')}
                    >
                      <Icon
                        name="shield"
                        size={14}
                        color={editRole === 'ADMIN' ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.rolePickBtnText,
                          editRole === 'ADMIN' && styles.rolePickBtnTextActive,
                        ]}
                      >
                        Administrator
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Dealership Site Selector */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Primary Leadership Rooftop (Dealership)</Text>
                  <View style={styles.sitePickerList}>
                    {ROOFTOP_OPTIONS.map((site) => {
                      const isChosen = editSiteId === site.id;
                      return (
                        <TouchableOpacity
                          key={site.id}
                          style={[styles.siteOption, isChosen && styles.siteOptionActive]}
                          onPress={() => setEditSiteId(site.id)}
                        >
                          <Icon
                            name={isChosen ? 'check' : 'building'}
                            size={14}
                            color={isChosen ? colors.primary : colors.textSecondary}
                          />
                          <Text style={[styles.siteOptionText, isChosen && styles.siteOptionTextActive]}>
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSubmitting}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, editSubmitting && styles.btnDisabled]}
                    onPress={handleUpdateUser}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Icon name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  adminAvatar: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  avatarText: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  directoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionSubTitle: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addUserHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addUserHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  filterChipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  usersLoadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  usersLoadingText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  noUsersContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  noUsersText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  usersListContainer: {
    gap: spacing.sm,
  },
  userItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm + 2,
  },
  userItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  userItemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  userItemAvatarAdmin: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  userItemAvatarText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  userItemAvatarTextAdmin: {
    color: '#B45309',
  },
  userItemDetails: {
    flex: 1,
    minWidth: 0,
  },
  userItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userItemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  youBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: typography.weights.heavy,
  },
  userItemEmail: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  userItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  userItemSite: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
  },
  userActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  editUserBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteUserBtn: {
    width: 32,
    height: 32,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.flaggedLight,
    borderWidth: 1,
    borderColor: 'rgba(225, 31, 38, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBanner: {
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  adminBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  techBanner: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  permissionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  permissionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  infoValueMono: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
  },
  actionSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  refreshButton: {
    backgroundColor: colors.surface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.flagged,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  logoutButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  modalSubTitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalInputGroup: {
    marginBottom: spacing.md,
  },
  modalInputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalTextInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rolePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 38,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolePickBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rolePickBtnActiveAdmin: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  rolePickBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  rolePickBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  sitePickerList: {
    gap: spacing.xs,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siteOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  siteOptionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  siteOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  modalSubmitBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
