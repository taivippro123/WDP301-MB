import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

export default function TopUpScreen() {
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [coinAmount, setCoinAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [orderUrl, setOrderUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Hide bottom navigation when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Hide bottom tab bar when entering this screen
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });

      // Show bottom tab bar when leaving this screen
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

  // Predefined amounts
  const quickAmounts = [
    { coins: 10000, vnd: '10,000' },
    { coins: 20000, vnd: '20,000' },
    { coins: 50000, vnd: '50,000' },
    { coins: 100000, vnd: '100,000' },
    { coins: 200000, vnd: '200,000' },
    { coins: 500000, vnd: '500,000' },
  ];

  const handleQuickAmountPress = (amount: number) => {
    setSelectedAmount(amount);
    setCoinAmount(amount.toString());
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setCoinAmount(numericValue);
    setSelectedAmount(null); // Clear selected quick amount
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    return parseInt(amount).toLocaleString('vi-VN');
  };

  const handleTopUp = async () => {
    if (!coinAmount || parseInt(coinAmount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số xu hợp lệ');
      return;
    }

    const coins = parseInt(coinAmount);
    const vndAmount = coins; // 1 coin = 1 VND

    if (coins < 1000) {
      Alert.alert('Lỗi', 'Số xu tối thiểu là 1,000 xu');
      return;
    }

    if (coins > 50000000) {
      Alert.alert('Lỗi', 'Số xu tối đa là 50,000,000 xu');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch(`${API_URL}/api/zalopay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ amount: vndAmount, description: 'Nạp xu vào ví' }),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Không tạo được đơn hàng');
      }
      const url = data?.data?.order_url;
      if (!url) throw new Error('Không có order_url');
      setOrderUrl(url);
      setOrderId(data?.data?.orderId || null);
      setOrderAmount(Number(data?.data?.amount) || vndAmount);
      setShowPayment(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo đơn hàng');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchWallet = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile/wallet`, {
          headers: {
            'Accept': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          }
        });
        const raw = await res.text();
        let data: any = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}
        const bal = data?.wallet?.balance ?? data?.balance ?? 0;
        if (mounted) setWalletBalance(Number(bal) || 0);
      } catch {}
    };
    fetchWallet();
    return () => { mounted = false; };
  }, [accessToken]);

  // Poll order status every 3s when orderId is available
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes

    const timer = setInterval(async () => {
      try {
        attempts += 1;
        const res = await fetch(`${API_URL}/api/zalopay/order/${orderId}/status`, {
          headers: {
            'Accept': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          }
        });
        const raw = await res.text();
        let data: any = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}
        const status = data?.data?.status || data?.status;
        if (!cancelled && (status === 'success' || status === 'paid' || status === 'completed')) {
          clearInterval(timer);
          setShowPayment(false);
          setOrderId(null);
          Alert.alert(
            'Thành công',
            'Thanh toán thành công. Số xu sẽ được cộng vào ví.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Quay lại màn hình tài khoản trong stack hiện tại
                  (navigation as any).goBack();
                }
              }
            ]
          );
          // Update wallet balance locally
          if (orderAmount) setWalletBalance(prev => (prev || 0) + orderAmount!);
        }
        if (attempts >= maxAttempts) {
          clearInterval(timer);
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [orderId, accessToken, orderAmount]);

  const openZaloPaySandbox = async () => {
    try {
      const schemes = ['zalopaysb://app', 'zalopay://'];
      for (const scheme of schemes) {
        const can = await Linking.canOpenURL(scheme);
        if (can) {
          // If we already have an orderUrl, try to pass the token into the sandbox app
          if (orderUrl) {
            let token = '';
            try {
              const urlObj = new URL(orderUrl);
              const tokenParam = urlObj.searchParams.get('order');
              token = tokenParam || '';
            } catch {}
            const deepLink = token ? `${scheme}?order=${encodeURIComponent(token)}` : scheme;
            await Linking.openURL(deepLink);
          } else {
            await Linking.openURL(scheme);
          }
          return;
        }
      }
      if (orderUrl) {
        await Linking.openURL(orderUrl);
      } else {
        Alert.alert('Không mở được ZaloPay', 'Không tìm thấy ứng dụng ZaloPay hoặc liên kết thanh toán.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở ZaloPay. Vui lòng thử lại sau.');
    }
  };
  

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nạp xu</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Balance */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet" size={24} color="#FFD700" />
                <Text style={styles.balanceTitle}>Số dư hiện tại</Text>
              </View>
              <View style={styles.balanceAmount}>
                <Text style={styles.balanceValue}>{walletBalance.toLocaleString('vi-VN')}</Text>
                <View style={styles.coinIcon}>
                  <Text style={styles.coinText}>Xu</Text>
                </View>
              </View>
            </View>

            {/* Quick Amount Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn nhanh số xu</Text>
              <View style={styles.quickAmountGrid}>
                {quickAmounts.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.quickAmountButton,
                      selectedAmount === item.coins && styles.selectedQuickAmount
                    ]}
                    onPress={() => handleQuickAmountPress(item.coins)}
                  >
                    <Text style={[
                      styles.quickAmountCoins,
                      selectedAmount === item.coins && styles.selectedQuickAmountText
                    ]}>
                      {formatCurrency(item.coins.toString())} xu
                    </Text>
                    <Text style={[
                      styles.quickAmountVnd,
                      selectedAmount === item.coins && styles.selectedQuickAmountSubtext
                    ]}>
                      {item.vnd} VNĐ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Amount Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hoặc nhập số xu tùy chỉnh</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số xu (tối thiểu 1,000 xu)"
                  placeholderTextColor="#999"
                  value={coinAmount}
                  onChangeText={handleCustomAmountChange}
                  keyboardType="numeric"
                  maxLength={8}
                />
                <View style={styles.inputSuffix}>
                  <Text style={styles.inputSuffixText}>xu</Text>
                </View>
              </View>
              
              {coinAmount && (
                <View style={styles.conversionInfo}>
                  <Ionicons name="information-circle" size={16} color="#4A90E2" />
                  <Text style={styles.conversionText}>
                    = {formatCurrency(coinAmount)} VNĐ
                  </Text>
                </View>
              )}
            </View>

            {/* Payment Info */}
            <View style={styles.paymentInfo}>
              <View style={styles.paymentMethod}>
                <Ionicons name="card" size={20} color="#0068FF" />
                <Text style={styles.paymentMethodText}>Thanh toán qua ZaloPay</Text>
                <View style={styles.safeBadge}>
                  <Text style={styles.safeBadgeText}>An toàn</Text>
                </View>
              </View>
              <Text style={styles.paymentNote}>
                • Tỷ giá: 1 xu = 1 VNĐ{'\n'}
                • Xu sẽ được cộng ngay sau khi thanh toán thành công{'\n'}
                • Hỗ trợ 24/7 nếu có vấn đề
              </Text>

              {showPayment && orderUrl && (
                <View style={styles.qrContainer}>
                  <Text style={styles.qrTitle}>Quét QR để thanh toán</Text>
                  <View style={styles.qrBox}>
                    <QRCode value={orderUrl} size={200} />
                  </View>
                  <View style={styles.qrActions}>
                    <TouchableOpacity style={styles.qrActionButton} onPress={async () => { await Clipboard.setStringAsync(orderUrl as string); Alert.alert('Đã sao chép', 'Link thanh toán đã được sao chép'); }}>
                      <Ionicons name="copy" size={16} color="#000" />
                      <Text style={styles.qrActionText}>Sao chép link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.qrActionButton} onPress={() => Linking.openURL(orderUrl)}>
                      <Ionicons name="open" size={16} color="#000" />
                      <Text style={styles.qrActionText}>Mở trình duyệt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Fixed Bottom Button */}
          <View style={styles.bottomContainer}>
            {!showPayment && (
              <TouchableOpacity
                style={[
                  styles.topUpButton,
                  (creating || !coinAmount || parseInt(coinAmount) < 1000) && styles.disabledButton
                ]}
                onPress={handleTopUp}
                disabled={creating || !coinAmount || parseInt(coinAmount) < 1000}
              >
                <Ionicons name="card" size={20} color="#000" style={styles.buttonIcon} />
                <Text style={styles.topUpButtonText}>
                  Nạp {coinAmount ? formatCurrency(coinAmount) : '0'} xu
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: -50
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: 50
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 8,
  },
  coinIcon: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coinText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedQuickAmount: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  quickAmountCoins: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  quickAmountVnd: {
    fontSize: 14,
    color: '#666',
  },
  selectedQuickAmountText: {
    color: '#000',
  },
  selectedQuickAmountSubtext: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  inputSuffix: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  inputSuffixText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  conversionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  conversionText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '500',
  },
  paymentInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  safeBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safeBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  paymentNote: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  qrContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qrActionText: {
    marginLeft: 6,
    color: '#000',
    fontWeight: '600',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  topUpButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  buttonIcon: {
    marginRight: 8
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
