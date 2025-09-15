import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

type Province = { Code?: string | number; ProvinceID?: number; ProvinceName: string };
type District = { Code?: string | number; DistrictID?: number; DistrictName: string };
type Ward = { WardCode?: string | number; WardName: string };

export default function AddressSettingScreen() {
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Address state
  // Only manage address here
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [provinceCode, setProvinceCode] = useState<string | number | null>(null);
  const [districtCode, setDistrictCode] = useState<string | number | null>(null);
  const [wardCode, setWardCode] = useState<string | number | null>(null);
  // Fallback labels when API returns names but no codes
  const [provinceNameFallback, setProvinceNameFallback] = useState<string>('');
  const [districtNameFallback, setDistrictNameFallback] = useState<string>('');
  const [wardNameFallback, setWardNameFallback] = useState<string>('');

  // Select options
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  // Dropdown state
  const [showProvinceModal, setShowProvinceModal] = useState<boolean>(false);
  const [showDistrictModal, setShowDistrictModal] = useState<boolean>(false);
  const [showWardModal, setShowWardModal] = useState<boolean>(false);
  const [provinceSearch, setProvinceSearch] = useState<string>('');
  const [districtSearch, setDistrictSearch] = useState<string>('');
  const [wardSearch, setWardSearch] = useState<string>('');

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/profile/profile`, { headers: authHeaders });
      const data = await res.json();
      const p = data?.profile || data;
      // This screen only needs address fields
      const addr = p?.address || {};
      setHouseNumber(addr?.houseNumber || '');
      setProvinceCode(addr?.provinceCode || addr?.province || null);
      setDistrictCode(addr?.districtCode || addr?.district || null);
      setWardCode(addr?.wardCode || addr?.ward || null);
      setProvinceNameFallback(typeof addr?.province === 'string' ? addr.province : '');
      setDistrictNameFallback(typeof addr?.district === 'string' ? addr.district : '');
      setWardNameFallback(typeof addr?.ward === 'string' ? addr.ward : '');
    } catch (e) {
      // noop
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProvinces = async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile/locations/provinces`, { headers: authHeaders });
      const data = await res.json();
      setProvinces(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {}
  };

  const fetchDistricts = async (provCode: string | number) => {
    try {
      const query = encodeURIComponent(String(provCode));
      const res = await fetch(`${API_URL}/api/profile/locations/districts?provinceCode=${query}`, { headers: authHeaders });
      const data = await res.json();
      setDistricts(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {}
  };

  const fetchWards = async (distId: string | number) => {
    try {
      const query = encodeURIComponent(String(distId));
      const res = await fetch(`${API_URL}/api/profile/locations/wards?districtId=${query}`, { headers: authHeaders });
      const data = await res.json();
      setWards(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {}
  };

  useEffect(() => {
    fetchProfile();
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (provinceCode) {
      setDistricts([]);
      setWards([]);
      setDistrictCode(null);
      setWardCode(null);
      fetchDistricts(provinceCode);
    }
  }, [provinceCode]);

  useEffect(() => {
    if (districtCode) {
      setWards([]);
      setWardCode(null);
      fetchWards(districtCode);
    }
  }, [districtCode]);

  const getProvinceCode = (p: Province) => p.Code ?? p.ProvinceID;
  const getDistrictCode = (d: District) => d.Code ?? d.DistrictID;
  const getWardCode = (w: Ward) => w.WardCode;

  // Selected labels
  const selectedProvinceName = useMemo(() => {
    const found = provinces.find(p => String(getProvinceCode(p)) === String(provinceCode ?? ''));
    return found?.ProvinceName || provinceNameFallback || 'Chọn tỉnh';
  }, [provinces, provinceCode, provinceNameFallback]);

  const selectedDistrictName = useMemo(() => {
    const found = districts.find(d => String(getDistrictCode(d)) === String(districtCode ?? ''));
    return found?.DistrictName || districtNameFallback || 'Chọn huyện';
  }, [districts, districtCode, districtNameFallback]);

  const selectedWardName = useMemo(() => {
    const found = wards.find(w => String(getWardCode(w)) === String(wardCode ?? ''));
    return found?.WardName || wardNameFallback || 'Chọn xã';
  }, [wards, wardCode, wardNameFallback]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      const payload = {
        houseNumber: houseNumber || '',
        provinceCode: provinceCode != null ? String(provinceCode) : '',
        districtCode: districtCode != null ? String(districtCode) : '',
        wardCode: wardCode != null ? String(wardCode) : '',
      };
      const res = await fetch(`${API_URL}/api/profile/locations`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(raw || 'Cập nhật thất bại');
      }
      Alert.alert('Thành công', 'Cập nhật địa chỉ thành công');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể cập nhật');
    } finally {
      setSaving(false);
    }
  };

  // Hide bottom tab bar while on this screen
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: {
            backgroundColor: 'white',
            height: 90,
            paddingBottom: 2,
            paddingTop: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderTopColor: '#E5E5E7',
          }
        });
      };
    }, [navigation])
  );

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    <View style={styles.container}>
      <SafeAreaView />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt địa chỉ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={styles.sectionTitle}>Địa chỉ</Text>
        {!!(provinceNameFallback || districtNameFallback || wardNameFallback || houseNumber) && (
          <Text style={{ color: '#666', marginBottom: 8 }}>
            {(houseNumber ? houseNumber + ', ' : '')}
            {wardNameFallback ? wardNameFallback + ', ' : ''}
            {districtNameFallback ? districtNameFallback + ', ' : ''}
            {provinceNameFallback || ''}
          </Text>
        )}

        <Text style={styles.label}>Số nhà, đường</Text>
        <TextInput
          value={houseNumber}
          onChangeText={setHouseNumber}
          placeholder="Nhập số nhà, đường"
          placeholderTextColor="#999"
          style={styles.input}
        />

        <Text style={styles.label}>Tỉnh/Thành phố</Text>
        <TouchableOpacity style={styles.selectorButton} onPress={() => setShowProvinceModal(true)}>
          <Text style={styles.selectorText}>{selectedProvinceName}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        <Text style={styles.label}>Quận/Huyện</Text>
        <TouchableOpacity style={styles.selectorButton} onPress={() => setShowDistrictModal(true)} disabled={!provinceCode}>
          <Text style={[styles.selectorText, !provinceCode && { color: '#bbb' }]}>{selectedDistrictName}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        <Text style={styles.label}>Phường/Xã</Text>
        <TouchableOpacity style={styles.selectorButton} onPress={() => setShowWardModal(true)} disabled={!districtCode}>
          <Text style={[styles.selectorText, !districtCode && { color: '#bbb' }]}>{selectedWardName}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveButton, (saving) && styles.saveButtonDisabled]} onPress={saveProfile} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Province Modal */}
      <DropdownModal
        visible={showProvinceModal}
        title="Chọn tỉnh"
        search={provinceSearch}
        onChangeSearch={setProvinceSearch}
        data={provinces}
        getId={(p: Province) => String(getProvinceCode(p))}
        getLabel={(p: Province) => p.ProvinceName}
        onSelect={(p: Province) => { setProvinceCode(getProvinceCode(p) ?? null); setShowProvinceModal(false); setProvinceSearch(''); }}
        onClose={() => { setShowProvinceModal(false); setProvinceSearch(''); }}
        
      />

      {/* District Modal */}
      <DropdownModal
        visible={showDistrictModal}
        title="Chọn huyện"
        search={districtSearch}
        onChangeSearch={setDistrictSearch}
        data={districts}
        getId={(d: District) => String(getDistrictCode(d))}
        getLabel={(d: District) => d.DistrictName}
        onSelect={(d: District) => { setDistrictCode(getDistrictCode(d) ?? null); setShowDistrictModal(false); setDistrictSearch(''); }}
        onClose={() => { setShowDistrictModal(false); setDistrictSearch(''); }}
      />

      {/* Ward Modal */}
      <DropdownModal
        visible={showWardModal}
        title="Chọn xã"
        search={wardSearch}
        onChangeSearch={setWardSearch}
        data={wards}
        getId={(w: Ward) => String(getWardCode(w))}
        getLabel={(w: Ward) => w.WardName}
        onSelect={(w: Ward) => { setWardCode(getWardCode(w) ?? null); setShowWardModal(false); setWardSearch(''); }}
        onClose={() => { setShowWardModal(false); setWardSearch(''); }}
      />
    </View>
    </TouchableWithoutFeedback>
  );
}

// Bottom-sheet style searchable dropdown to avoid overlapping UI
function DropdownModal<T>({
  visible,
  title,
  search,
  onChangeSearch,
  data,
  getId,
  getLabel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  search: string;
  onChangeSearch: (text: string) => void;
  data: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
}) {
  const filtered = React.useMemo(() => {
    const q = (search || '').toLowerCase();
    if (!q) return data;
    return data.filter((item) => getLabel(item).toLowerCase().includes(q));
  }, [data, search, getLabel]);

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: visible ? 'flex' : 'none' }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '70%', minHeight: 320, backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#000' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
              <Ionicons name="search" size={16} color="#666" />
              <TextInput
                style={{ flex: 1, paddingVertical: 10, paddingLeft: 8, color: '#000' }}
                placeholder="Tìm kiếm..."
                placeholderTextColor="#999"
                value={search}
                onChangeText={onChangeSearch}
              />
            </View>
          </View>
          <ScrollView style={{ paddingHorizontal: 8 }} contentContainerStyle={{ paddingBottom: 120, minHeight: 260 }} keyboardShouldPersistTaps="handled">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <TouchableOpacity key={getId(item)} style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f6f6f6' }} onPress={() => onSelect(item)}>
                  <Text style={{ color: '#000' }}>{getLabel(item)}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={{ flex: 1, minHeight: 240, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Không có dữ liệu</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#000' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 12 },
  label: { fontSize: 14, color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    color: '#000'
  },
  select: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
    minHeight: 48, justifyContent: 'center'
  },
  selectorButton: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  selectorText: { color: '#000' },
  saveButton: { marginTop: 24, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#000', fontWeight: '600', fontSize: 16 },
});


