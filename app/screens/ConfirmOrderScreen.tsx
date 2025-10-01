import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

type ConfirmOrderParams = {
  product: {
    _id: string;
    title: string;
    price: number;
    images?: any[];
    seller?: any;
  };
};

export default function ConfirmOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken, user } = useAuth();
  const { product } = (route.params as any) || {};

  const [receiver, setReceiver] = React.useState({
    name: '',
    phone: '',
    addressLine: '',
    ward: '',
    district: '',
    province: '',
    wardCode: '',
    districtCode: '',
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [shippingFee, setShippingFee] = React.useState<number>(0);
  const [etaText, setEtaText] = React.useState<string>('');
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  // Address modal state
  const [showAddressModal, setShowAddressModal] = React.useState(false);
  const [savingAddress, setSavingAddress] = React.useState(false);
  const [houseNumber, setHouseNumber] = React.useState<string>('');
  const [provinceCode, setProvinceCode] = React.useState<string | number | null>(null);
  const [districtCode, setDistrictCode] = React.useState<string | number | null>(null);
  const [wardCode, setWardCode] = React.useState<string | number | null>(null);
  const [provinces, setProvinces] = React.useState<any[]>([]);
  const [districts, setDistricts] = React.useState<any[]>([]);
  const [wards, setWards] = React.useState<any[]>([]);
  const [showProvincePicker, setShowProvincePicker] = React.useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = React.useState(false);
  const [showWardPicker, setShowWardPicker] = React.useState(false);
  const [provinceSearch, setProvinceSearch] = React.useState('');
  const [districtSearch, setDistrictSearch] = React.useState('');
  const [wardSearch, setWardSearch] = React.useState('');

  const firstImage = React.useMemo(() => {
    const imgs = (product?.images || []) as any[];
    const toUrl = (x: any) => (typeof x === 'string' ? x : (x?.url || x?.secure_url));
    return imgs.length ? toUrl(imgs[0]) : undefined;
  }, [product]);

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile/profile`, {
        headers: { 'Accept': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      });
      const json = res.ok ? await res.json() : null;
      const p = json || {};
      const addr: any = p?.profile?.address || {};
      setReceiver({
        name: (p?.name as any) || (user as any)?.name || '',
        phone: (p?.phone as any) || '',
        addressLine: addr?.houseNumber || '',
        ward: addr?.ward || '',
        district: addr?.district || '',
        province: addr?.province || '',
        wardCode: String(addr?.wardCode || ''),
        districtCode: String(addr?.districtCode || ''),
      });
    } catch {}
  }, [accessToken, user]);

  const calculateShipping = React.useCallback(async () => {
    try {
      if (!product) return;
      setIsCalculating(true);
      const sellerAddr: any = (product as any)?.seller?.profile?.address || (product as any)?.seller?.address || {};
      const payload = {
        service_type_id: 2,
        from_district_id: Number(sellerAddr?.districtCode) || 0,
        from_ward_code: String(sellerAddr?.wardCode || ''),
        to_district_id: Number(receiver.districtCode) || 0,
        to_ward_code: String(receiver.wardCode || ''),
        length: (product as any)?.length || 30,
        width: (product as any)?.width || 40,
        height: (product as any)?.height || 20,
        weight: (product as any)?.weight || 3000,
        insurance_value: 0,
        cod_value: 0,
        coupon: null as any
      };
      const res = await fetch(`${API_URL}/api/shipping/fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!res.ok) throw new Error(data?.message || 'Không tính được phí ship');
      const feeData = data?.data || data;
      const totalFee = Number(feeData?.total ?? feeData?.service_fee ?? feeData?.fee ?? 0);
      setShippingFee(totalFee);
      // ETA naive: +2-5 days based on fee presence
      const today = new Date();
      const days = totalFee > 0 ? 3 : 5;
      const eta = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      setEtaText(`${eta.getDate().toString().padStart(2,'0')}/${(eta.getMonth()+1).toString().padStart(2,'0')}/${eta.getFullYear()}`);
    } catch (e: any) {
      Alert.alert('Không thể tính phí', e?.message || 'Vui lòng thử lại');
    } finally {
      setIsCalculating(false);
    }
  }, [product, receiver, accessToken]);

  // Address APIs (same as AddressSettingScreen)
  const authHeaders = React.useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const fetchProvinces = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile/locations/provinces`, { headers: authHeaders });
      const data = await res.json();
      setProvinces(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {}
  }, [authHeaders]);

  const fetchDistricts = React.useCallback(async (provCode: string | number) => {
    try {
      const query = encodeURIComponent(String(provCode));
      const res = await fetch(`${API_URL}/api/profile/locations/districts?provinceCode=${query}`, { headers: authHeaders });
      const data = await res.json();
      setDistricts(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {}
  }, [authHeaders]);

  const fetchWards = React.useCallback(async (distId: string | number) => {
    try {
      const query = encodeURIComponent(String(distId));
      const res = await fetch(`${API_URL}/api/profile/locations/wards?districtId=${query}`, { headers: authHeaders });
      const data = await res.json();
      setWards(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
    } catch {}
  }, [authHeaders]);

  const openAddressModal = React.useCallback(async () => {
    setHouseNumber(receiver.addressLine || '');
    setProvinceCode(receiver.province || null as any);
    setDistrictCode(receiver.district || null as any);
    setWardCode(receiver.ward || null as any);
    await fetchProvinces();
    if (receiver.province) await fetchDistricts(receiver.province as any);
    if (receiver.district) await fetchWards(receiver.district as any);
    setShowAddressModal(true);
  }, [receiver, fetchProvinces, fetchDistricts, fetchWards]);

  React.useEffect(() => {
    if (showAddressModal && provinceCode) {
      setDistricts([]);
      setWards([]);
      setDistrictCode(null);
      setWardCode(null);
      fetchDistricts(provinceCode);
    }
  }, [showAddressModal, provinceCode, fetchDistricts]);

  React.useEffect(() => {
    if (showAddressModal && districtCode) {
      setWards([]);
      setWardCode(null);
      fetchWards(districtCode);
    }
  }, [showAddressModal, districtCode, fetchWards]);

  const saveAddress = React.useCallback(async () => {
    try {
      setSavingAddress(true);
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
      // Update local receiver labels using selected items
      const prov = provinces.find((p) => String(p.Code ?? p.ProvinceID) === String(provinceCode ?? ''));
      const dist = districts.find((d) => String(d.Code ?? d.DistrictID) === String(districtCode ?? ''));
      const ward = wards.find((w) => String(w.WardCode) === String(wardCode ?? ''));
      setReceiver((prev) => ({
        ...prev,
        addressLine: houseNumber || '',
        province: prov?.ProvinceName || String(provinceCode || ''),
        district: dist?.DistrictName || String(districtCode || ''),
        ward: ward?.WardName || String(wardCode || ''),
        provinceCode: String(provinceCode || ''),
        districtCode: String(districtCode || ''),
        wardCode: String(wardCode || ''),
      } as any));
      setShowAddressModal(false);
      // Recalculate shipping with new address
      setTimeout(() => {
        calculateShipping();
      }, 0);
      Alert.alert('Thành công', 'Cập nhật địa chỉ thành công');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể cập nhật');
    } finally {
      setSavingAddress(false);
    }
  }, [houseNumber, provinceCode, districtCode, wardCode, authHeaders, provinces, districts, wards, calculateShipping]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      await fetchProfile();
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchProfile]);

  // Refetch receiver info and hide bottom tab bar when focused
  useFocusEffect(
    React.useCallback(() => {
      const parent = (navigation as any)?.getParent?.();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      fetchProfile();
      return () => {
        parent?.setOptions({
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
    }, [fetchProfile, navigation])
  );

  React.useEffect(() => {
    if (receiver.districtCode && receiver.wardCode) {
      calculateShipping();
    }
  }, [receiver.districtCode, receiver.wardCode, calculateShipping]);

  const total = Number(product?.price || 0) + Number(shippingFee || 0);

  const goToContract = async () => {
    try {
      if (!product?._id) {
        Alert.alert('Lỗi', 'Thiếu thông tin sản phẩm');
        return;
      }
      (navigation as any).navigate('Contract', {
        productId: (product as any)?._id,
        sellerId: (product as any)?.seller?._id,
        // Pass through product with enriched seller contact for contract rendering
        product,
        receiver,
        unitPrice: Number((product as any)?.price) || 0,
        shippingFee: Number(shippingFee) || 0,
      });
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể mở hợp đồng');
    }
  };

  const placeOrder = async () => {
    try {
      if (!product?._id) {
        Alert.alert('Lỗi', 'Thiếu thông tin sản phẩm');
        return;
      }
      // Validate receiver fields
      const missing: string[] = [];
      if (!receiver.name?.trim()) missing.push('Họ tên người nhận');
      if (!receiver.phone?.trim()) missing.push('SĐT người nhận');
      if (!receiver.addressLine?.trim()) missing.push('Địa chỉ người nhận');
      if (!receiver.ward?.trim()) missing.push('Phường/Xã người nhận');
      if (!receiver.district?.trim()) missing.push('Quận/Huyện người nhận');
      if (!receiver.province?.trim()) missing.push('Tỉnh/Thành người nhận');
      if (missing.length > 0) {
        Alert.alert('Thiếu thông tin', `Vui lòng bổ sung:\n- ${missing.join('\n- ')}`);
        return;
      }
      if (!shippingFee || Number(shippingFee) <= 0) {
        Alert.alert('Lỗi', 'Phí vận chuyển không hợp lệ. Vui lòng tính phí trước.');
        return;
      }

      setIsPlacingOrder(true);

      const sellerAddr: any = (product as any)?.seller?.profile?.address || (product as any)?.seller?.address || {};
      const body: any = {
        // Receiver
        to_name: receiver.name.trim(),
        to_phone: receiver.phone.trim(),
        to_address: receiver.addressLine.trim(),
        to_ward_name: receiver.ward.trim(),
        to_district_name: receiver.district.trim(),
        to_province_name: receiver.province.trim(),
        // Package
        length: (product as any)?.length || 30,
        width: (product as any)?.width || 40,
        height: (product as any)?.height || 20,
        weight: (product as any)?.weight || 3000,
        service_type_id: 2,
        payment_type_id: 2,
        insurance_value: 0,
        cod_amount: 0,
        required_note: 'KHONGCHOXEMHANG',
        // Product content/name
        content: (product as any)?.title || 'Hàng hóa',
        // Commerce fields
        product_id: (product as any)?._id,
        seller_id: (product as any)?.seller?._id,
        unit_price: Number((product as any)?.price) || 0,
        shipping_fee: Number(shippingFee) || 0,
        items: [
          {
            name: (product as any)?.title || 'Hàng hóa',
            code: (product as any)?._id || undefined,
            quantity: 1,
            price: Number((product as any)?.price) || 0,
            length: (product as any)?.length || undefined,
            width: (product as any)?.width || undefined,
            height: (product as any)?.height || undefined,
            weight: (product as any)?.weight || undefined,
            category: { level1: (product as any)?.category || undefined }
          }
        ],
      };
      // Sender (optional)
      if ((product as any)?.seller?.name) body.from_name = (product as any)?.seller?.name;
      if ((product as any)?.seller?.phone) body.from_phone = (product as any)?.seller?.phone;
      if (sellerAddr?.houseNumber) body.from_address = sellerAddr?.houseNumber;
      if (sellerAddr?.ward) body.from_ward_name = sellerAddr?.ward;
      if (sellerAddr?.district) body.from_district_name = sellerAddr?.district;
      if (sellerAddr?.province) body.from_province_name = sellerAddr?.province;

      const res = await fetch(`${API_URL}/api/shipping/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.status === 401 || res.status === 403) {
        Alert.alert('Không thể tạo đơn', 'Yêu cầu bị chặn hoặc cần xác thực lại. Vui lòng thử lại sau.');
        return;
      }
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!res.ok) {
        const msg = data?.error || data?.message || (typeof data === 'string' ? data : 'Không thể tạo đơn hàng');
        throw new Error(msg);
      }
      const order = data?.data || data;
      Alert.alert('Thành công', `Đã tạo đơn hàng. Mã: ${order?.order_code || order?.data?.order_code || 'N/A'}`);
      const root = (navigation as any).getParent?.() || navigation;
      // Ensure Account stack has AccountMain behind OrderHistory
      try { root.navigate('Tài khoản', { screen: 'AccountMain' }); } catch {}
      setTimeout(() => {
        try { root.navigate('Tài khoản', { screen: 'OrderHistory', params: { fromOrderSuccess: true } }); } catch {}
      }, 0);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo đơn hàng');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đơn hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={{ marginTop: 8 }}>Đang tải thông tin...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Receiver info */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Địa chỉ nhận hàng</Text>
            <Text style={styles.receiverName}>{receiver.name} • {receiver.phone || '---'}</Text>
            <Text style={styles.receiverAddress}>
              {[
                receiver.addressLine,
                receiver.ward,
                receiver.district,
                receiver.province,
              ].filter(Boolean).join(', ')}
            </Text>
            <TouchableOpacity style={styles.changeAddressButton} onPress={openAddressModal}>
              <Text style={styles.changeAddressText}>Thay đổi địa chỉ</Text>
            </TouchableOpacity>
          </View>

          {/* Product summary */}
          <View style={styles.block}>
            <View style={{ flexDirection: 'row' }}>
              <View style={styles.thumbnail}>
                {firstImage ? (
                  <Image source={{ uri: firstImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="image-outline" size={24} color="#999" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.productTitle} numberOfLines={2}>{product?.title}</Text>
                <Text style={styles.productPrice}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(product?.price||0))}</Text>
              </View>
            </View>
          </View>

          {/* Shipping fee and ETA */}
          <View style={styles.block}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Đơn vị vận chuyển</Text>
              <Text style={styles.value}>GHN</Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <Text style={styles.label}>Phí vận chuyển</Text>
              <Text style={styles.value}>{isCalculating ? 'Đang tính...' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(shippingFee||0))}</Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <Text style={styles.label}>Dự kiến giao</Text>
              <Text style={styles.value}>{etaText || '—'}</Text>
            </View>
          </View>

          {/* Payment method */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Phương thức thanh toán</Text>
            <View style={styles.paymentRow}>
              <Ionicons name="wallet" size={18} color="#000" />
              <Text style={styles.paymentText}>Ví Ecoin</Text>
            </View>
          </View>

          {/* Total */}
          <View style={styles.block}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Tiền hàng</Text>
              <Text style={styles.value}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(product?.price||0))}</Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: 6 }]}>
              <Text style={styles.label}>Phí vận chuyển</Text>
              <Text style={styles.value}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(shippingFee||0))}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bottom action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={{ fontSize: 12, color: '#666' }}>Tổng cộng</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#000' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}</Text>
        </View>
        <TouchableOpacity style={[styles.placeOrderButton, isPlacingOrder && { opacity: 0.7 }]} onPress={goToContract} disabled={isPlacingOrder || isCalculating}>
          {isPlacingOrder ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.placeOrderText}>Ký hợp đồng</Text>}
        </TouchableOpacity>
      </View>

      {/* Address Edit Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#000' }}>Cập nhật địa chỉ</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={{ fontSize: 14, color: '#333', marginTop: 16, marginBottom: 6 }}>Số nhà, đường</Text>
              <TextInput
                value={houseNumber}
                onChangeText={setHouseNumber}
                placeholder="Nhập số nhà, đường"
                placeholderTextColor="#999"
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#000' }}
              />

              <Text style={{ fontSize: 14, color: '#333', marginTop: 12, marginBottom: 6 }}>Tỉnh/Thành phố</Text>
              <TouchableOpacity style={styles.selectorButton} onPress={() => setShowProvincePicker(true)}>
                <Text style={styles.selectorText}>{(() => { const p = provinces.find((x) => String((x.Code ?? x.ProvinceID)) === String(provinceCode ?? '')); return p?.ProvinceName || (receiver.province || 'Chọn tỉnh'); })()}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              <Text style={{ fontSize: 14, color: '#333', marginTop: 12, marginBottom: 6 }}>Quận/Huyện</Text>
              <TouchableOpacity style={styles.selectorButton} onPress={() => setShowDistrictPicker(true)} disabled={!provinceCode}>
                <Text style={[styles.selectorText, !provinceCode && { color: '#bbb' }]}>{(() => { const d = districts.find((x) => String((x.Code ?? x.DistrictID)) === String(districtCode ?? '')); return d?.DistrictName || (receiver.district || 'Chọn huyện'); })()}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              <Text style={{ fontSize: 14, color: '#333', marginTop: 12, marginBottom: 6 }}>Phường/Xã</Text>
              <TouchableOpacity style={styles.selectorButton} onPress={() => setShowWardPicker(true)} disabled={!districtCode}>
                <Text style={[styles.selectorText, !districtCode && { color: '#bbb' }]}>{(() => { const w = wards.find((x) => String(x.WardCode) === String(wardCode ?? '')); return w?.WardName || (receiver.ward || 'Chọn xã'); })()}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveButton, savingAddress && { opacity: 0.7 }]} onPress={saveAddress} disabled={savingAddress}>
                <Text style={styles.saveButtonText}>{savingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Province picker */}
            <PickerModal
              visible={showProvincePicker}
              title="Chọn tỉnh"
              search={provinceSearch}
              onChangeSearch={setProvinceSearch}
              data={provinces}
              getId={(p: any) => String(p.Code ?? p.ProvinceID)}
              getLabel={(p: any) => p.ProvinceName}
              onSelect={(p: any) => { setProvinceCode(p.Code ?? p.ProvinceID); setShowProvincePicker(false); setProvinceSearch(''); }}
              onClose={() => { setShowProvincePicker(false); setProvinceSearch(''); }}
            />

            {/* District picker */}
            <PickerModal
              visible={showDistrictPicker}
              title="Chọn huyện"
              search={districtSearch}
              onChangeSearch={setDistrictSearch}
              data={districts}
              getId={(d: any) => String(d.Code ?? d.DistrictID)}
              getLabel={(d: any) => d.DistrictName}
              onSelect={(d: any) => { setDistrictCode(d.Code ?? d.DistrictID); setShowDistrictPicker(false); setDistrictSearch(''); }}
              onClose={() => { setShowDistrictPicker(false); setDistrictSearch(''); }}
            />

            {/* Ward picker */}
            <PickerModal
              visible={showWardPicker}
              title="Chọn xã"
              search={wardSearch}
              onChangeSearch={setWardSearch}
              data={wards}
              getId={(w: any) => String(w.WardCode)}
              getLabel={(w: any) => w.WardName}
              onSelect={(w: any) => { setWardCode(w.WardCode); setShowWardPicker(false); setWardSearch(''); }}
              onClose={() => { setShowWardPicker(false); setWardSearch(''); }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable bottom-sheet searchable picker
function PickerModal<T>({
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  content: { flex: 1 },
  block: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  blockTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 8 },
  receiverName: { fontSize: 14, color: '#000', fontWeight: '600' },
  receiverAddress: { fontSize: 14, color: '#333', marginTop: 4 },
  changeAddressButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 6 },
  changeAddressText: { color: '#007AFF', fontWeight: '600' },
  thumbnail: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden' },
  productTitle: { fontSize: 14, color: '#000', fontWeight: '600' },
  productPrice: { fontSize: 16, color: '#e74c3c', fontWeight: '700', marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, color: '#000', fontWeight: '600' },
  recalcButton: { marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8 },
  recalcText: { color: '#000', fontWeight: '600' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentText: { marginLeft: 8, fontSize: 14, color: '#000', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalLabel: { fontSize: 16, color: '#333', fontWeight: '600' },
  totalValue: { fontSize: 18, color: '#e67e22', fontWeight: '800' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeOrderButton: { backgroundColor: '#FFD700', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  placeOrderText: { color: '#000', fontWeight: '700' },
  selectorButton: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorText: { color: '#000' },
  saveButton: { marginTop: 16, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#000', fontWeight: '600', fontSize: 16 },
});

