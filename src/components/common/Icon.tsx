import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

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
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'sliders'
  | 'map-pin'
  | 'log-in';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const glyphs: Record<IconName, string> = {
  camera: '📷',
  video: '📹',
  mic: '🎙️',
  'mic-off': '🔇',
  check: '✓',
  'check-circle': '✅',
  'alert-circle': '⚠️',
  close: '✕',
  refresh: '🔄',
  'chevron-left': '‹',
  'chevron-right': '›',
  'chevron-down': '⌄',
  car: '🚗',
  shield: '🛡️',
  barcode: '▌│█',
  'file-text': '📄',
  sparkles: '✨',
  upload: '☁️',
  'wifi-off': '⚡',
  wifi: '📶',
  trash: '🗑️',
  pin: '📌',
  play: '▶',
  pause: '⏸',
  plus: '+',
  search: '🔍',
  flag: '🚩',
  info: 'ℹ️',
  clock: '⏱️',
  user: '👤',
  'user-plus': '👤+',
  mail: '✉️',
  lock: '🔒',
  eye: '👁️',
  'eye-off': '🙈',
  sliders: '⚙️',
  'map-pin': '📍',
  'log-in': '🔑',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = colors.textPrimary,
  style,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text
        style={[
          styles.text,
          {
            fontSize: size * 0.85,
            color,
            lineHeight: size,
          },
        ]}
      >
        {glyphs[name] || '•'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
});

