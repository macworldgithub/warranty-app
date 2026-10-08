import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Button } from './Button';

export function LogoutDialog({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { height } = useWindowDimensions();
  if (!visible) return null;
  return <View style={[styles.overlay, { height }]}>
    <View style={styles.card}>
      <Text style={styles.title}>Log Out</Text>
      <Text>Are you sure you want to log out?</Text>
      <Button title="Cancel" variant="secondary" onPress={onCancel} />
      <Button title="Log Out" onPress={onConfirm} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10001, elevation: 31, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
});
