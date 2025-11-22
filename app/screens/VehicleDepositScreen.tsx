import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

export default function VehicleDepositScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = (route.params as any) || {};
  const { accessToken, user } = useAuth();

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(500000); // Default fallback
  const [isLoadingDepositAmount, setIsLoadingDepositAmount] = useState(true);

  useEffect(() => {
    // Pre-fill buyer info from user profile
    if (user) {
      setBuyerName((user as any)?.name || '');
      setBuyerPhone((user as any)?.phone || '');
      
      // Fetch profile to get address
      fetchProfile();
    }
    fetchWalletBalance();
    fetchDepositAmount();
  }, []);

  const fetchDepositAmount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/deposit-amount`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.depositAmounts && Array.isArray(json.depositAmounts) && json.depositAmounts.length > 0) {
          setDepositAmount(json.depositAmounts[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching deposit amount:', e);
    } finally {
      setIsLoadingDepositAmount(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile/profile`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        const addr = json?.profile?.address;
        const fetchedName = json?.name || json?.profile?.fullName;
        const fetchedPhone = json?.phone || json?.profile?.phone;
        if (fetchedName && !buyerName) setBuyerName(fetchedName);
        if (fetchedPhone && !buyerPhone) setBuyerPhone(fetchedPhone);
        if (addr) {
          const parts = [addr.houseNumber, addr.ward, addr.district, addr.province].filter(Boolean);
          setBuyerAddress(parts.join(', '));
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile/wallet`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        // Accept multiple response shapes
        const balance = json?.wallet?.balance ?? json?.balance ?? json?.data?.balance ?? 0;
        setWalletBalance(Number(balance) || 0);
      }
    } catch (e) {
      console.error('Error fetching wallet:', e);
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '';
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    } catch {
      return `${price} VNĐ`;
    }
  };

  const handleDeposit = async () => {
    try {
      // Validate inputs
      if (!buyerName.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
        return;
      }
      if (!buyerPhone.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
        return;
      }
      if (!buyerAddress.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ');
        return;
      }

      // Check wallet balance
      if (walletBalance < depositAmount) {
        Alert.alert(
          'Số dư không đủ',
          `Số dư ví: ${formatPrice(walletBalance)}\nCần: ${formatPrice(depositAmount)}\n\nVui lòng nạp thêm tiền vào ví.`,
          [
            { text: 'Đóng', style: 'cancel' },
            { text: 'Nạp tiền', onPress: () => (navigation as any).navigate('Wallet') }
          ]
        );
        return;
      }

      setIsLoading(true);

      const body = {
        product_id: product._id,
        seller_id: product.seller._id,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_address: buyerAddress.trim(),
      };

      const res = await fetch(`${API_URL}/api/deposit/vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Không thể đặt cọc');
      }

      Alert.alert(
        'Đặt cọc thành công!',
        `Đã thanh toán ${formatPrice(depositAmount)} từ ví.\n\n${json.data?.note || 'Admin sẽ liên hệ để xác nhận giao dịch.'}\n\nBạn có thể xem đơn hàng trong mục "Tài khoản" > "Lịch sử đơn hàng".`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Simply go back to ProductDetail screen
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể đặt cọc');
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={{ padding: 16, color: '#d00' }}>Không tìm thấy sản phẩm</Text>
      </View>
    );
  }

  const firstImage = Array.isArray(product.images) && product.images.length > 0
    ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt cọc xe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Summary */}
        <View style={styles.productCard}>
          <View style={styles.productRow}>
            {firstImage && (
              <Image source={{ uri: firstImage }} style={styles.productImage} />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
              <Text style={styles.productDetail}>
                {product.brand} • {product.year}
              </Text>
            </View>
          </View>
        </View>

        {/* Deposit Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đặt cọc</Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3498db" />
            <Text style={styles.infoText}>
              Đặt cọc {formatPrice(depositAmount)} để giữ xe. Admin sẽ liên hệ sắp xếp thời gian gặp mặt và hoàn tất giao dịch.
            </Text>
          </View>
          
          <View style={styles.depositRow}>
            <Text style={styles.depositLabel}>Số tiền đặt cọc:</Text>
            {isLoadingDepositAmount ? (
              <ActivityIndicator size="small" color="#3498db" />
            ) : (
              <Text style={styles.depositAmount}>{formatPrice(depositAmount)}</Text>
            )}
          </View>
          
          <View style={styles.depositRow}>
            <Text style={styles.depositLabel}>Số dư ví hiện tại:</Text>
            <Text style={[styles.depositAmount, walletBalance < depositAmount && styles.insufficientBalance]}>
              {formatPrice(walletBalance)}
            </Text>
          </View>
        </View>

        {/* Buyer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin người mua</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập họ tên"
              placeholderTextColor="#999"
              value={buyerName}
              onChangeText={setBuyerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              value={buyerPhone}
              onChangeText={setBuyerPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Địa chỉ liên hệ *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập địa chỉ liên hệ"
              placeholderTextColor="#999"
              value={buyerAddress}
              onChangeText={setBuyerAddress}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Ionicons name="alert-circle" size={20} color="#e67e22" />
          <Text style={styles.noteText}>
            Lưu ý: Đây là đơn đặt cọc cho xe, không bao gồm vận chuyển. Bạn sẽ cần gặp trực tiếp người bán để kiểm tra và nhận xe.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomActions}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
          {isLoadingDepositAmount ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <Text style={styles.totalAmount}>{formatPrice(depositAmount)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.depositButton, (isLoading || isLoadingDepositAmount) && styles.depositButtonDisabled]}
          onPress={handleDeposit}
          disabled={isLoading || isLoadingDepositAmount}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="wallet" size={20} color="#fff" />
              <Text style={styles.depositButtonText}>Xác nhận đặt cọc</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  productCard: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productRow: {
    flexDirection: 'row',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  depositLabel: {
    fontSize: 14,
    color: '#666',
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  insufficientBalance: {
    color: '#e74c3c',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  bottomActions: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  depositButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositButtonDisabled: {
    opacity: 0.6,
  },
  depositButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

