import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiClient } from '../../api/client';
import { getBaseServerUrl } from '../../config/env';
import { colors } from '../../theme/colors';

interface Bulletin {
  id: string; brandId: string; title: string; bulletinNumber: string;
  issueDate: string; effectiveDate: string; status: 'PUBLISHED';
}

export function ManufacturerBulletins({ brandId, brandName }: { brandId?: string; brandName?: string }) {
  const [items, setItems] = useState<Bulletin[]>([]);
  const [loadedBrand, setLoadedBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setRevision(value => value + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setItems([]); setLoadedBrand(''); setError('');
    if (!brandId) { setLoading(false); return; }
    setLoading(true);
    apiClient.get<Bulletin[]>(`/warranty-bulletins?brandId=${encodeURIComponent(brandId)}`)
      .then(data => { if (!cancelled) { setItems(data.filter(item => item.brandId === brandId && item.status === 'PUBLISHED')); setLoadedBrand(brandId); } })
      .catch(err => { if (!cancelled) setError(err.message || 'Unable to load bulletins.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [brandId, revision]);
  const open = async (id: string) => {
    setOpening(true); setError('');
    try {
      const { url } = await apiClient.get<{ url: string }>(`/warranty-bulletins/${encodeURIComponent(id)}/document`);
      const resolved = url.startsWith('/') ? `${getBaseServerUrl()}${url}` : url;
      if (!/^https?:\/\//i.test(resolved)) throw new Error('Invalid document address.');
      await Linking.openURL(resolved);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open PDF.'); }
    finally { setOpening(false); }
  };
  if (!brandId) return null;
  return <View style={styles.panel}>
    <Text style={styles.heading}>{brandName || 'Manufacturer'} warranty bulletins</Text>
    <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => setRevision(value => value + 1)}><Text style={styles.link}>Refresh bulletins</Text></TouchableOpacity>
    {loading && <ActivityIndicator color={colors.primary} />}
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {!loading && !error && loadedBrand === brandId && !items.length && <Text>No published bulletins for this manufacturer.</Text>}
    {loadedBrand === brandId && items.map(item => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open PDF: ${item.title}`} key={item.id} disabled={opening} onPress={() => void open(item.id)} style={styles.document}>
      <Text style={styles.heading}>{item.title}</Text>
      <Text>{item.bulletinNumber}</Text>
      <Text>Issued {item.issueDate} · Effective {item.effectiveDate}</Text>
      <Text style={styles.link}>Open PDF</Text>
    </TouchableOpacity>)}
    {opening && <ActivityIndicator color={colors.primary} />}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: 16, marginVertical: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', gap: 10 },
  heading: { fontWeight: '700', fontSize: 16, color: '#162033' },
  document: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee', gap: 5 },
  link: { color: colors.primary, fontWeight: '600' },
});
