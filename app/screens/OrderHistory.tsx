import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

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

  // Background sync returns/refunds when opening this screen
  React.useEffect(() => {
    (async () => {
      if (!accessToken) return;
      try {
        await fetch(`${API_URL}/api/shipping/returns/sync`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        // Optionally refresh orders after sync
        fetchOrders();
      } catch {
        // silent
      }
    })();
  }, [accessToken, fetchOrders]);

  // Fetch GHN status for each order using server proxy
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

  const renderItem = ({ item }: { item: OrderItem }) => {
    const title = typeof item.productId === 'object' && item.productId && 'title' in item.productId ? (item.productId as any).title : '';
    const oc = item?.shipping?.trackingNumber || item?.orderNumber;
    const d = oc ? details[oc] : undefined;
    const effectiveStatus = (d?.status || item.status || '').toString();
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => (navigation as any).navigate('OrderDetail', { 
          order: item, 
          details: d 
        })}
      >
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
        <Text style={styles.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
      </TouchableOpacity>
    );
  };

  const filteredOrders = React.useMemo(() => {
    const mapToEffective = (o: OrderItem) => {
      const oc = o?.shipping?.trackingNumber || o?.orderNumber;
      const d = oc ? details[oc] : undefined;
      return (d?.status || o.status || '').toString().toLowerCase();
    };
    const isMatch = (s: string) => {
      if (statusFilter === 'all') return true;
      // Deposit orders (in-person vehicle flow)
      if (statusFilter === 'deposit') return s === 'deposit';
      if (statusFilter === 'waiting_pick') return s === 'ready_to_pick' || s === 'picking';
      // "Chờ giao": gồm picked 
      if (statusFilter === 'delivering') return s === 'picked' ;
      // "Đã giao": gồm delivered và delivering
      if (statusFilter === 'delivered') return s === 'delivered' || s === 'delivering';
      // "Trả hàng": gồm return, returning, returned
      if (statusFilter === 'return') return s === 'return' || s === 'returning' || s === 'returned';
      if (statusFilter === 'cancel') return s.includes('cancel');
      return true;
    };
    return orders.filter((o) => isMatch(mapToEffective(o)));
  }, [orders, details, statusFilter]);

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

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersBar}>
          <FilterTab label="Tất cả" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          <FilterTab label="Đặt cọc" active={statusFilter === 'deposit'} onPress={() => setStatusFilter('deposit')} />
          <FilterTab label="Chờ lấy" active={statusFilter === 'waiting_pick'} onPress={() => setStatusFilter('waiting_pick')} />
          <FilterTab label="Chờ giao" active={statusFilter === 'delivering'} onPress={() => setStatusFilter('delivering')} />
          <FilterTab label="Đã giao" active={statusFilter === 'delivered'} onPress={() => setStatusFilter('delivered')} />
          <FilterTab label="Trả hàng" active={statusFilter === 'return'} onPress={() => setStatusFilter('return')} />
          <FilterTab label="Đã hủy" active={statusFilter === 'cancel'} onPress={() => setStatusFilter('cancel')} />
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(it) => it._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
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
  if (s === 'deposit') return { color: '#f39c12' };
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
  if (s === 'deposit') return 'Đặt cọc';
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
  if (s === 'pending') return '-';
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
  filtersContainer: { paddingVertical: 8 },
  filtersBar: { paddingHorizontal: 16, flexDirection: 'row' },
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

function FilterTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[filterStyles.btn, active ? filterStyles.btnActive : null]} activeOpacity={0.8}>
      <Text style={[filterStyles.text, active ? filterStyles.textActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const filterStyles = StyleSheet.create({
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  btnActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  text: { fontSize: 12, color: '#000', fontWeight: '600', textAlign: 'center' },
  textActive: { color: '#000' },
});


