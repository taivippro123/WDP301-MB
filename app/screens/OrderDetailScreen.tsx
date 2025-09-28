import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  to_name?: string; 
  to_phone?: string; 
  to_address?: string;
  from_name?: string; 
  from_phone?: string; 
  from_address?: string;
  cod_amount?: number;
  leadtime?: string;
};

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { order, details } = route.params as { order: OrderItem; details?: GhnDetail };
  const { accessToken } = useAuth();
  const [submitting, setSubmitting] = React.useState<{ cancel: boolean; ret: boolean }>({ cancel: false, ret: false });
  const [receiverInfo, setReceiverInfo] = React.useState<{
    name: string;
    phone: string;
    address: string;
  }>({ name: '', phone: '', address: '' });
  const [profileAddress, setProfileAddress] = React.useState<string>('');
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showReturnModal, setShowReturnModal] = React.useState(false);

  const formatCurrency = (val?: number) => {
    if (typeof val !== 'number') return '';
    try { 
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val); 
    } catch { 
      return `${val} VNĐ`; 
    }
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getTimelineStatus = () => {
    const effectiveStatus = (details?.status || order.status || '').toString().toLowerCase();
    
    if (effectiveStatus === 'delivered') {
      return { step1: true, step2: true, step3: true };
    } else if (effectiveStatus === 'delivering') {
      return { step1: true, step2: true, step3: false };
    } else {
      return { step1: true, step2: false, step3: false };
    }
  };

  const timeline = getTimelineStatus();
  const effectiveStatus = (details?.status || order.status || '').toString().toLowerCase().trim();
  const productTitle = typeof order.productId === 'object' && order.productId && 'title' in order.productId 
    ? (order.productId as any).title 
    : 'Sản phẩm';

  // Fetch receiver info from GHN API
  React.useEffect(() => {
    (async () => {
      if (!accessToken) return;
      const oc = order?.shipping?.trackingNumber || order?.orderNumber;
      if (!oc) return;
      
      try {
        const res = await fetch(`${API_URL}/api/shipping/order/detail`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${accessToken}` 
          },
          body: JSON.stringify({ order_code: oc })
        });
        const raw = await res.text();
        let data: any = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}
        const d = data?.data || data || {};
        
        setReceiverInfo({
          name: d?.to_name || '',
          phone: d?.to_phone || '',
          address: d?.to_address || ''
        });
      } catch {}
    })();
  }, [accessToken, order]);

  // Fetch profile address
  React.useEffect(() => {
    (async () => {
      if (!accessToken) return;
      try {
        const res = await fetch(`${API_URL}/api/profile/profile`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();
        const addr = json?.profile?.address || {};
        const houseNumber = addr?.houseNumber || '';
        const ward = addr?.ward || '';
        const district = addr?.district || '';
        const province = addr?.province || '';
        const parts = [houseNumber, ward, district, province].filter(Boolean);
        setProfileAddress(parts.join(', '));
      } catch {}
    })();
  }, [accessToken]);

  const getOrderCode = () => (order?.shipping?.trackingNumber || order?.orderNumber || '').toString();

  const handleCancel = async () => {
    const code = getOrderCode();
    if (!code || !accessToken || submitting.cancel) return;
    setSubmitting((s) => ({ ...s, cancel: true }));
    try {
      const res = await fetch(`${API_URL}/api/shipping/order/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ order_code: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Hủy thất bại');
      Alert.alert('Thành công', 'Đã gửi yêu cầu hủy đơn.');
      setShowCancelModal(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể hủy đơn');
    } finally {
      setSubmitting((s) => ({ ...s, cancel: false }));
    }
  };

  const handleReturn = async () => {
    const code = getOrderCode();
    if (!code || !accessToken || submitting.ret) return;
    setSubmitting((s) => ({ ...s, ret: true }));
    try {
      const res = await fetch(`${API_URL}/api/shipping/order/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ order_code: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Trả hàng thất bại');
      Alert.alert('Đã gửi yêu cầu', 'Yêu cầu trả hàng đã được ghi nhận.');
      setShowReturnModal(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể gửi yêu cầu trả hàng');
    } finally {
      setSubmitting((s) => ({ ...s, ret: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={styles.sectionTitle}>Trạng thái vận chuyển</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, timeline.step1 && styles.timelineDotActive]}>
                {timeline.step1 && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.timelineLabel, timeline.step1 && styles.timelineLabelActive]}>
                Đã vận chuyển
              </Text>
            </View>
            
            <View style={[styles.timelineLine, timeline.step2 && styles.timelineLineActive]} />
            
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, timeline.step2 && styles.timelineDotActive]}>
                {timeline.step2 && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.timelineLabel, timeline.step2 && styles.timelineLabelActive]}>
                Đang giao hàng
              </Text>
            </View>
            
            <View style={[styles.timelineLine, timeline.step3 && styles.timelineLineActive]} />
            
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, timeline.step3 && styles.timelineDotActive]}>
                {timeline.step3 && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.timelineLabel, timeline.step3 && styles.timelineLabelActive]}>
                Đã giao hàng
              </Text>
            </View>
          </View>
          
          <View style={styles.shippingInfo}>
            <Text style={styles.shippingLabel}>Đơn vị vận chuyển: GHN</Text>
            {order.shipping?.trackingNumber && (
              <Text style={styles.trackingLabel}>
                Mã vận đơn: {order.shipping.trackingNumber}
              </Text>
            )}
            {details?.leadtime ? (
              <Text style={styles.trackingLabel}>Ngày nhận dự kiến: {formatDateTime(details.leadtime)}</Text>
            ) : null}
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn hàng</Text>
              <Text style={styles.infoValue}>#{order.orderNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sản phẩm</Text>
              <Text style={styles.infoValue}>{productTitle}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày đặt</Text>
              <Text style={styles.infoValue}>{formatDateTime(order.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tổng tiền</Text>
              <Text style={[styles.infoValue, styles.priceText]}>{formatCurrency(order.finalAmount)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phí vận chuyển</Text>
              <Text style={[styles.infoValue, styles.priceText]}>{formatCurrency(order.shippingFee ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Receiver Info */}
        {true && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên</Text>
                <Text style={styles.infoValue}>{receiverInfo.name || details?.to_name || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số điện thoại</Text>
                <Text style={styles.infoValue}>{receiverInfo.phone || details?.to_phone || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                <Text style={[styles.infoValue, styles.addressText]}>{profileAddress || receiverInfo.address || details?.to_address || '—'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {(() => {
            const s = (effectiveStatus || '').toLowerCase().trim();
            // Hard guard: không hiển thị nút nào khi đã giao/đã hủy/đã hoàn
            if (s === 'delivered' || s.includes('cancel') || s === 'returned') return null;
            const canCancel = s === 'ready_to_pick' || s === 'picking';
            const canReturn = (
              s === 'delivery_fail'
            );

            if (!canCancel && !canReturn) return null;
            return (
              <View style={[styles.buttonRow, { gap: 12 }] }>
                {canCancel && (
                  <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} disabled={submitting.cancel} onPress={() => setShowCancelModal(true)}>
                    <Text style={styles.cancelButtonText}>Hủy đặt hàng</Text>
                  </TouchableOpacity>
                )}
                {canReturn && (
                  <TouchableOpacity style={[styles.actionButton, styles.returnButton]} disabled={submitting.ret} onPress={() => setShowReturnModal(true)}>
                    <Text style={styles.returnButtonText}>Trả hàng</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>

      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận hủy đơn hàng</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>
                Bạn có chắc chắn muốn hủy đơn hàng #{order.orderNumber}?
              </Text>
              <Text style={styles.modalSubMessage}>
                Hành động này không thể hoàn tác.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]} 
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Không</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]} 
                onPress={handleCancel}
                disabled={submitting.cancel}
              >
                <Text style={styles.confirmModalButtonText}>
                  {submitting.cancel ? 'Đang xử lý...' : 'Có, hủy đơn'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Return Confirmation Modal */}
      <Modal visible={showReturnModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận trả hàng</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>
                Bạn có chắc chắn muốn trả hàng cho đơn hàng #{order.orderNumber}?
              </Text>
              <Text style={styles.modalSubMessage}>
                Yêu cầu trả hàng sẽ được gửi đến đơn vị vận chuyển.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]} 
                onPress={() => setShowReturnModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Không</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]} 
                onPress={handleReturn}
                disabled={submitting.ret}
              >
                <Text style={styles.confirmModalButtonText}>
                  {submitting.ret ? 'Đang xử lý...' : 'Có, trả hàng'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  timelineContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    paddingBottom: 24,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDotActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  timelineLine: {
    height: 2,
    backgroundColor: '#ddd',
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 20,
  },
  timelineLineActive: {
    backgroundColor: '#000',
  },
  shippingInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  shippingLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  trackingLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    flex: 2,
    textAlign: 'right',
  },
  priceText: {
    fontWeight: '600',
    color: '#e74c3c',
  },
  addressText: {
    textAlign: 'left',
  },
  actionButtons: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 120, // ensure not covered by bottom navigation
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '700',
  },
  returnButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  returnButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalButton: {
    backgroundColor: '#e74c3c',
  },
  confirmModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
