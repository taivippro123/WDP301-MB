import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

type OrderItem = {
  _id: string;
  orderNumber: string;
  status: string;
  finalAmount: number;
  shippingFee?: number;
  unitPrice?: number;
  createdAt: string;
  shipping?: {
    method?: string;
    trackingNumber?: string;
    carrier?: string;
  };
  productId?: { _id: string; title?: string; images?: string[] } | string;
};

type GhnDetail = {
  status?: string;
  to_name?: string; to_phone?: string; to_address?: string;
  from_name?: string; from_phone?: string; from_address?: string;
  cod_amount?: number;
  leadtime?: string;
};

export default function OrderHistory() {
  const navigation = useNavigation();
  const { accessToken, logout } = useAuth();
  const [orders, setOrders] = React.useState<OrderItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<Record<string, GhnDetail>>({});

  const fetchOrders = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/profile/orders?page=1&limit=20`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const json = await res.json();
      setOrders(Array.isArray(json?.orders) ? json.orders : []);
    } catch (e) {
      setError('Không tải được đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [accessToken, logout, navigation]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch GHN details for each order using server proxy
  React.useEffect(() => {
    (async () => {
      if (!accessToken) return;
      const next: Record<string, GhnDetail> = { ...details };
      for (const o of orders) {
        const oc = o?.shipping?.trackingNumber || o?.orderNumber;
        if (!oc || next[oc]) continue;
        try {
          const res = await fetch(`${API_URL}/api/shipping/order/detail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ order_code: oc })
          });
          const raw = await res.text();
          let data: any = {};
          try { data = raw ? JSON.parse(raw) : {}; } catch {}
          const d = data?.data || data || {};
          next[oc] = {
            status: d?.status || d?.current_status || undefined,
            to_name: d?.to_name, to_phone: d?.to_phone, to_address: d?.to_address,
            from_name: d?.from_name, from_phone: d?.from_phone, from_address: d?.from_address,
            cod_amount: d?.cod_amount,
            leadtime: d?.leadtime,
          } as GhnDetail;
        } catch {}
      }
      setDetails(next);
    })();
  }, [orders, accessToken]);

  const formatCurrency = (val?: number) => {
    if (typeof val !== 'number') return '';
    try { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val); } catch { return `${val} VNĐ`; }
  };


  // chỉ lấy ngày/tháng/năm
  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const renderItem = ({ item }: { item: OrderItem }) => {
    const title = typeof item.productId === 'object' && item.productId && 'title' in item.productId ? (item.productId as any).title : '';
    const oc = item?.shipping?.trackingNumber || item?.orderNumber;
    const d = oc ? details[oc] : undefined;
    const effectiveStatus = (d?.status || item.status || '').toString();
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.rowBetween}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={[styles.status, statusColor(effectiveStatus)]}>{formatGhnStatus(effectiveStatus)}</Text>
        </View>
        {!!title && <Text style={styles.title} numberOfLines={1}>Sản phẩm: {title}</Text>}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tổng thanh toán</Text>
          <Text style={styles.metaValue}>{formatCurrency(item.finalAmount)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Phí vận chuyển</Text>
          <Text style={styles.metaValue}>{formatCurrency(item.shippingFee ?? 0)}</Text>
        </View>
        {d ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.metaLabel}>Người gửi: {d.from_name} • {d.from_phone}</Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Người nhận: {d.to_name} • {d.to_phone}</Text>
          </View>
        ) : null}
        {d?.leadtime ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.metaLabel}>Ngày nhận dự kiến: {formatDateTime(d.leadtime)}</Text>
          </View>
        ) : null}
        <Text style={styles.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={orders}
        keyExtractor={(it) => it._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} />}
        ListEmptyComponent={!loading ? (
          <View style={{ padding: 24 }}>
            <Text style={{ textAlign: 'center', color: '#666' }}>Chưa có đơn hàng</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

function statusColor(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'ready_to_pick') return { color: '#2980b9' };
  if (s === 'picking' || s === 'money_collect_picking') return { color: '#8e44ad' };
  if (s === 'picked') return { color: '#8e44ad' };
  if (s === 'storing' || s === 'sorting') return { color: '#8e44ad' };
  if (s === 'transporting') return { color: '#9b59b6' };
  if (s === 'delivering' || s === 'money_collect_delivering') return { color: '#f39c12' };
  if (s === 'delivered') return { color: '#27ae60' };
  if (s === 'delivery_fail') return { color: '#c0392b' };
  if (s === 'waiting_to_return') return { color: '#d35400' };
  if (s === 'return' || s === 'return_transporting' || s === 'return_sorting' || s === 'returning') return { color: '#e67e22' };
  if (s === 'return_fail') return { color: '#c0392b' };
  if (s === 'returned') return { color: '#34495e' };
  if (s.includes('cancel')) return { color: '#c0392b' };
  if (s.includes('pending')) return { color: '#e67e22' };
  return { color: '#333' };
}

function formatGhnStatus(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'ready_to_pick') return 'Chờ lấy hàng';
  if (s === 'picking') return 'Đang lấy hàng';
  if (s === 'money_collect_picking') return 'Đang lấy hàng (thu hộ)';
  if (s === 'picked') return 'Đã lấy hàng';
  if (s === 'storing') return 'Đang lưu kho';
  if (s === 'sorting') return 'Đang phân loại';
  if (s === 'transporting') return 'Đang trung chuyển';
  if (s === 'delivering') return 'Đang giao hàng';
  if (s === 'money_collect_delivering') return 'Đang giao (thu hộ)';
  if (s === 'delivered') return 'Đã giao hàng';
  if (s === 'delivery_fail') return 'Giao hàng thất bại';
  if (s === 'waiting_to_return') return 'Chờ hoàn';
  if (s === 'return') return 'Chuẩn bị hoàn hàng';
  if (s === 'return_transporting') return 'Đang hoàn hàng (trung chuyển)';
  if (s === 'return_sorting') return 'Hoàn hàng (phân loại)';
  if (s === 'returning') return 'Đang hoàn hàng';
  if (s === 'return_fail') return 'Hoàn hàng thất bại';
  if (s === 'returned') return 'Đã hoàn hàng';
  if (s.includes('cancel')) return 'Đã hủy';
  if (s === 'pending') return 'Chờ xác nhận';
  return status || '—';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 50},
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  error: { color: '#d00', padding: 16 },
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNumber: { fontSize: 16, fontWeight: '700', color: '#000' },
  status: { fontSize: 12, fontWeight: '700' },
  title: { marginTop: 4, fontSize: 14, color: '#333' },
  metaRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 12, color: '#666' },
  metaValue: { fontSize: 12, color: '#000', fontWeight: '600' },
  createdAt: { marginTop: 8, fontSize: 11, color: '#999' },
});


