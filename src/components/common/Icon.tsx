import React from 'react';
import { ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import {
  AlertCircle,
  Barcode,
  Camera,
  Car,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Info,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Video,
  Wifi,
  WifiOff,
  Wrench,
  Building,
  Key,
  X,
  Zap,
  ZapOff,
  type LucideProps,
} from 'lucide-react-native';

export type IconName =
  | 'camera'
  | 'video'
  | 'mic'
  | 'mic-off'
  | 'check'
  | 'check-circle'
  | 'alert-circle'
  | 'close'
  | 'refresh'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'car'
  | 'shield'
  | 'barcode'
  | 'file-text'
  | 'sparkles'
  | 'upload'
  | 'wifi-off'
  | 'wifi'
  | 'trash'
  | 'pin'
  | 'play'
  | 'pause'
  | 'plus'
  | 'search'
  | 'flag'
  | 'info'
  | 'clock'
  | 'user'
  | 'user-plus'
  | 'user-check'
  | 'mail'
  | 'lock'
  | 'key'
  | 'eye'
  | 'eye-off'
  | 'sliders'
  | 'settings'
  | 'map-pin'
  | 'log-in'
  | 'log-out'
  | 'wrench'
  | 'building'
  | 'zap'
  | 'zap-off'
  | 'edit';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  camera: Camera,
  video: Video,
  mic: Mic,
  'mic-off': MicOff,
  check: Check,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  close: X,
  refresh: RefreshCw,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  car: Car,
  shield: Shield,
  barcode: Barcode,
  'file-text': FileText,
  sparkles: Sparkles,
  upload: Upload,
  'wifi-off': WifiOff,
  wifi: Wifi,
  trash: Trash2,
  pin: Pin,
  play: Play,
  pause: Pause,
  plus: Plus,
  search: Search,
  flag: Flag,
  info: Info,
  clock: Clock,
  user: User,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  mail: Mail,
  lock: Lock,
  key: Key,
  eye: Eye,
  'eye-off': EyeOff,
  sliders: SlidersHorizontal,
  settings: Settings,
  'map-pin': MapPin,
  'log-in': LogIn,
  'log-out': LogOut,
  wrench: Wrench,
  building: Building,
  zap: Zap,
  'zap-off': ZapOff,
  edit: SlidersHorizontal,
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = colors.textPrimary,
  style,
}) => {
  const IconComponent = icons[name];

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    />
  );
};

