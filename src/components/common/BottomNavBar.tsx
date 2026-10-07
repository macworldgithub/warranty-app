import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Car,
  Wrench,
  Key,
  Shield,
  FileText,
  Camera,
  Plus,
  Square,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export type BottomNavTab =
  | 'home'
  | 'drive'
  | 'hoist'
  | 'loaner'
  | 'vehicles'
  | 'tickets'
  | 'profile';

export interface BottomNavAction {
  label: string;
  icon?: 'camera' | 'plus' | 'stop' | 'wrench' | 'file';
  onPress: () => void;
  isDangerous?: boolean;
  disabled?: boolean;
}

export interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onOpenHome?: () => void;
  onOpenDrive?: () => void;
  onOpenHoists?: () => void;
  onOpenLoaners?: () => void;
  onOpenVehicles?: () => void;
  onOpenTickets?: (tab?: string) => void;
  onOpenProfile?: () => void;
  actionButton?: BottomNavAction;
  containerStyle?: ViewStyle;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onOpenHome,
  onOpenDrive,
  onOpenHoists,
  onOpenLoaners,
  onOpenVehicles,
  onOpenTickets,
  onOpenProfile,
  actionButton,
  containerStyle,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const userFirstName = useMemo(() => {
    if (!user?.name) return 'Profile';
    return user.name.trim().split(/\s+/)[0].toLowerCase();
  }, [user?.name]);

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [user?.name]);

  const renderActionIcon = () => {
    if (!actionButton?.icon) return <Plus size={15} color="#FFFFFF" strokeWidth={2.8} />;
    switch (actionButton.icon) {
      case 'camera':
        return <Camera size={15} color="#FFFFFF" strokeWidth={2.5} />;
      case 'stop':
        return <Square size={13} color="#FFFFFF" fill="#FFFFFF" />;
      case 'wrench':
        return <Wrench size={15} color="#FFFFFF" strokeWidth={2.5} />;
      case 'file':
        return <FileText size={15} color="#FFFFFF" strokeWidth={2.5} />;
      case 'plus':
      default:
        return <Plus size={15} color="#FFFFFF" strokeWidth={2.8} />;
    }
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* ── Contextual Action Button (e.g. + Start Drive, + New Inspection, + New Agreement) ── */}
      {actionButton && (
        <View style={styles.actionContainer} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={actionButton.onPress}
            disabled={actionButton.disabled}
            style={[
              styles.actionBtn,
              actionButton.isDangerous && styles.actionBtnDangerous,
              actionButton.disabled && styles.actionBtnDisabled,
            ]}
          >
            {renderActionIcon()}
            <Text style={styles.actionBtnText}>{actionButton.label}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 7-Item Sorted Bottom Navigation Bar ── */}
      <View
        style={[
          styles.navBar,
          { paddingBottom: Math.max(insets.bottom + 6, 16) },
        ]}
      >
        {/* 1. Home */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenHome}
          style={styles.tabItem}
        >
          <Home
            size={20}
            color={activeTab === 'home' ? '#DC2626' : '#64748B'}
            strokeWidth={activeTab === 'home' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Drive */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenDrive}
          style={styles.tabItem}
        >
          <Car
            size={20}
            color={activeTab === 'drive' ? '#DC2626' : '#64748B'}
            strokeWidth={activeTab === 'drive' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'drive' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            Drive
          </Text>
        </TouchableOpacity>

        {/* 3. Hoist */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenHoists}
          style={styles.tabItem}
        >
          <Wrench
            size={20}
            color={activeTab === 'hoist' ? '#DC2626' : '#64748B'}
            strokeWidth={activeTab === 'hoist' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'hoist' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            Hoist
          </Text>
        </TouchableOpacity>

        {/* 4. Loaner */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenLoaners}
          style={styles.tabItem}
        >
          <Key
            size={20}
            color={activeTab === 'loaner' ? '#DC2626' : '#64748B'}
            strokeWidth={activeTab === 'loaner' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'loaner' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            Loaner
          </Text>
        </TouchableOpacity>

        {/* 5. Vehicles */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenVehicles}
          style={styles.tabItem}
        >
          <Shield
            size={20}
            color={activeTab === 'vehicles' ? '#DC2626' : '#64748B'}
            strokeWidth={activeTab === 'vehicles' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'vehicles' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            Vehicles
          </Text>
        </TouchableOpacity>

        {/* 6. Tickets */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onOpenTickets && onOpenTickets('all')}
          style={styles.tabItem}
        >
          <FileText
            size={20}
            color={activeTab === 'tickets' ? '#DC2626' : '#64748B'}
            strokeWidth={activeTab === 'tickets' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'tickets' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            Tickets
          </Text>
        </TouchableOpacity>

        {/* 7. Profile */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenProfile}
          style={styles.tabItem}
        >
          <View
            style={[
              styles.avatarCircle,
              activeTab === 'profile' && styles.avatarCircleActive,
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                activeTab === 'profile' && styles.avatarTextActive,
              ]}
            >
              {userInitials}
            </Text>
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'profile' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            {userFirstName}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 10,
  },
  actionBtn: {
    backgroundColor: '#D71920',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#D71920',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  actionBtnDangerous: {
    backgroundColor: '#B91C1C',
    borderColor: '#991B1B',
  },
  actionBtnDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#CBD5E1',
    shadowOpacity: 0.1,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    minWidth: 44,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  avatarCircle: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleActive: {
    backgroundColor: '#DC2626',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
  },
  avatarTextActive: {
    color: '#FFFFFF',
  },
});
