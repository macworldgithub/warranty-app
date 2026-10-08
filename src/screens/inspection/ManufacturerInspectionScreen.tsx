import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { EvidenceCard } from '../../components/evidence/EvidenceCard';
import { ManufacturerBulletins } from '../../components/evidence/ManufacturerBulletins';
import { brandsApi } from '../../api/brands.api';
import { brandPacksApi } from '../../api/brandPacks.api';
import { casesApi } from '../../api/cases.api';
import { Brand, BrandPack, EvidenceItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { rooftopVehiclesService, RooftopVehicle } from '../../services/rooftopVehicles.service';
import { offlineStorage, VehicleZoneInspection } from '../../services/offlineStorage';
import { namingEngine } from '../../services/namingEngine';
import { evidenceUploadService } from '../../services/evidenceUpload.service';
import { colors } from '../../theme/colors';

interface Props {
  vehicle?: RooftopVehicle | null;
  onSelectVehicle?: (vehicle: RooftopVehicle) => void;
  onBack: () => void;
  onLogout?: () => void;
  onOpenHome?: () => void;
  onOpenTickets?: () => void;
  onOpenLoaners?: () => void;
  onOpenProfile?: () => void;
  onCompleteInspection?: (vehicle: RooftopVehicle) => void;
}

const normalizeMake = (value: string) => value.toLowerCase().replace(/\s+motor(s)?$/, '').trim();

export const ManufacturerInspectionScreen: React.FC<Props> = ({ vehicle, onSelectVehicle, onBack, onLogout, onCompleteInspection }) => {
  const { user, activeSiteId } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [vehicles, setVehicles] = useState<RooftopVehicle[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [pack, setPack] = useState<BrandPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [packLoading, setPackLoading] = useState(false);
  const [error, setError] = useState('');
  const [packError, setPackError] = useState('');
  const [inspection, setInspection] = useState<VehicleZoneInspection | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const siteId = activeSiteId || user?.defaultSiteId || user?.authorizedSiteIds?.[0];
    Promise.all([brandsApi.getBrands(), casesApi.getCases({ siteId: siteId?.toLowerCase() === 'all' ? undefined : siteId, limit: 100 })])
      .then(([brandList, caseList]) => {
        if (cancelled) return;
        setBrands(brandList);
        setVehicles(siteId ? rooftopVehiclesService.getVehiclesForRooftop(siteId, caseList) : []);
      })
      .catch(() => { if (!cancelled) setError('Unable to load manufacturers and vehicles. Please retry.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSiteId, user?.defaultSiteId, user?.authorizedSiteIds, retry]);

  const brand = vehicle ? brands.find(item => normalizeMake(item.name) === normalizeMake(vehicle.make)) : selectedBrand;
  const brandId = brand?.id;

  useEffect(() => {
    let cancelled = false;
    setPack(null);
    setPackError('');
    if (!brandId) { setPackLoading(false); return; }
    setPackLoading(true);
    brandPacksApi.getActiveByBrandId(brandId).then(result => {
      if (result.brandId !== brandId || result.status !== 'PUBLISHED') throw new Error('Incorrect manufacturer pack');
      if (!cancelled) setPack(result);
    }).catch(() => {
      if (!cancelled) setPackError('Published evidence requirements are unavailable for this manufacturer. Ask your warranty administrator to publish its pack.');
    }).finally(() => { if (!cancelled) setPackLoading(false); });
    return () => { cancelled = true; };
  }, [brandId, retry]);

  useEffect(() => {
    if (!vehicle || !pack || pack.brandId !== brandId) { setInspection(null); return; }
    const stored = offlineStorage.getVehicleInspection(vehicle.vin);
    const next: VehicleZoneInspection = {
      vin: vehicle.vin.toUpperCase(), roNumber: vehicle.roNumber || vehicle.inspectionNumber,
      capturedZoneKeys: stored?.capturedZoneKeys || [], evidenceItems: stored?.evidenceItems || [],
      defects: stored?.defects || [], status: 'IN_PROGRESS', updatedAt: new Date().toISOString(),
      brandId: pack.brandId, brandPackId: pack.id, brandPackVersion: pack.version,
    };
    offlineStorage.saveVehicleInspection(next);
    setInspection(next);
  }, [vehicle, pack, brandId]);

  const persist = (next: VehicleZoneInspection) => { offlineStorage.saveVehicleInspection(next); setInspection(next); };
  const saveEvidence = (item: Partial<EvidenceItem> & { ruleKey: string }) => {
    if (!inspection || !pack || !vehicle) return;
    const rule = pack.rules.find(entry => entry.ruleKey === item.ruleKey);
    if (!rule) return;
    const evidence: EvidenceItem = {
      ...item, id: item.id || `ev_${Date.now()}_${rule.ruleKey}`, ruleKey: rule.ruleKey,
      ruleName: rule.name, mediaType: rule.mediaType, isMandatory: rule.isMandatory,
      tier: rule.tier, oemFileName: namingEngine.generateOemFileName(rule, inspection.roNumber || 'RO'),
    };
    const next = { ...inspection, evidenceItems: [...inspection.evidenceItems.filter(entry => entry.ruleKey !== rule.ruleKey), evidence], capturedZoneKeys: [...new Set([...inspection.capturedZoneKeys, rule.ruleKey])] };
    persist(next);
    void evidenceUploadService.uploadEvidenceToServer({ vin: inspection.vin, roNumber: inspection.roNumber, evidenceItem: evidence, vehicleDetails: vehicle, brandId: pack.brandId, siteId: vehicle.siteId, brandPackId: pack.id, brandPackVersion: pack.version }).then(result => {
      if (!result.success || !result.storageUrl) return;
      const latest = offlineStorage.getVehicleInspection(inspection.vin);
      if (!latest || latest.brandPackId !== pack.id) return;
      const updated = { ...latest, evidenceItems: latest.evidenceItems.map(entry => entry.id === evidence.id ? { ...entry, storageUrl: result.storageUrl, isUploaded: true } : entry) };
      offlineStorage.saveVehicleInspection(updated);
      setInspection(current => current?.vin === updated.vin ? updated : current);
    });
  };
  const hasEvidence = (key: string) => inspection?.evidenceItems.some(item => item.ruleKey === key && Boolean(item.fileUri || item.storageUrl || item.serverUrl));
  const ready = Boolean(pack?.rules.length && pack.rules.filter(rule => rule.isMandatory).every(rule => hasEvidence(rule.ruleKey)));

  return <View style={styles.container}>
    <Header title={vehicle ? 'Manufacturer Evidence Capture' : 'New Inspection'} onBack={onBack} onLogout={onLogout} showBrandLogo={false} />
    <ScrollView contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator color={colors.primary} /> : error ? <><Text>{error}</Text><Button title="Retry" onPress={() => setRetry(value => value + 1)} /></> : <>
        {!vehicle && <>
          <Text style={styles.title}>Choose manufacturer</Text>
          {brands.map(item => <TouchableOpacity key={item.id} style={styles.card} onPress={() => setSelectedBrand(item)}><Text style={styles.title}>{selectedBrand?.id === item.id ? '✓ ' : ''}{item.name}</Text></TouchableOpacity>)}
        </>}
        {brand && <>
          <Text style={styles.title}>{brand.name} evidence path</Text>
          <ManufacturerBulletins key={brand.id} brandId={brand.id} brandName={brand.name} />
          {!vehicle && <>
            <Text style={styles.title}>Select vehicle</Text>
            {vehicles.filter(item => normalizeMake(item.make) === normalizeMake(brand.name)).map(item => <TouchableOpacity key={item.id} style={styles.card} onPress={() => onSelectVehicle?.(item)}><Text>{item.year} {item.make} {item.model}</Text><Text>{item.rego} · {item.vin}</Text></TouchableOpacity>)}
            {!vehicles.some(item => normalizeMake(item.make) === normalizeMake(brand.name)) && <Text>No vehicles for this manufacturer at the selected rooftop.</Text>}
          </>}
          {packLoading ? <ActivityIndicator color={colors.primary} /> : packError ? <><Text>{packError}</Text><Button title="Retry requirements" onPress={() => setRetry(value => value + 1)} /></> : pack && <>
            <Text>{pack.name} · Version {pack.version}</Text>
            {!vehicle ? <>
              {pack.rules.map(rule => <Text key={rule.ruleKey} style={styles.description}>{rule.name} · {rule.mediaType} · {rule.isMandatory ? 'Required' : 'Optional'}</Text>)}
            </> : <>
              <Text style={styles.description}>{vehicle.make} {vehicle.model} · {vehicle.vin}</Text>
              {pack.rules.length === 0 && <Text>No evidence requirements have been configured for this manufacturer.</Text>}
              {inspection && pack.rules.map(rule => <EvidenceCard key={`${pack.id}_${rule.ruleKey}`} rule={rule} evidence={inspection.evidenceItems.find(item => item.ruleKey === rule.ruleKey)} roNumber={inspection.roNumber || 'RO'} onSaveEvidence={saveEvidence} onRemoveEvidence={key => persist({ ...inspection, evidenceItems: inspection.evidenceItems.filter(item => item.ruleKey !== key), capturedZoneKeys: inspection.capturedZoneKeys.filter(item => item !== key), status: 'IN_PROGRESS' })} onAddVoiceNote={() => {}} />)}
              <Button title="Complete & Save Inspection" disabled={!ready || !inspection} onPress={() => { if (inspection) { persist({ ...inspection, status: 'COMPLETE' }); onCompleteInspection?.(vehicle); } }} />
            </>}
          </>}
        </>}
        {vehicle && !brand && <Text>No manufacturer configuration matches this vehicle. Contact your warranty administrator.</Text>}
      </>}
    </ScrollView>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  description: { color: colors.textSecondary, marginVertical: 8 },
  card: { padding: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
