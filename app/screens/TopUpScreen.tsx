import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
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

export default function TopUpScreen() {
  const navigation = useNavigation();
  const [coinAmount, setCoinAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

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

    if (coins > 10000000) {
      Alert.alert('Lỗi', 'Số xu tối đa là 10,000,000 xu');
      return;
    }

    Alert.alert(
      'Xác nhận nạp xu',
      `Bạn sắp nạp ${formatCurrency(coinAmount)} xu\nSố tiền: ${formatCurrency(coinAmount)} VNĐ\n\nXác nhận thanh toán qua ZaloPay?`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Thanh toán',
          onPress: () => openZaloPaySandbox(coins, vndAmount)
        }
      ]
    );
  };

  const openZaloPaySandbox = async () => {
    const zaloPayUrl = "zalopay://"; // chỉ mở app, không cần token
  
    try {
      const canOpen = await Linking.canOpenURL(zaloPayUrl);
      if (canOpen) {
        await Linking.openURL(zaloPayUrl);
      } else {
        Alert.alert("Không mở được ZaloPay", "Bạn chưa cài app ZaloPay Sandbox");
      }
    } catch (error) {
      console.error("Error opening ZaloPay:", error);
      Alert.alert("Lỗi", "Không thể mở ZaloPay. Vui lòng thử lại sau.");
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
                <Text style={styles.balanceValue}>0</Text>
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
            </View>
          </ScrollView>

          {/* Fixed Bottom Button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[
                styles.topUpButton,
                (!coinAmount || parseInt(coinAmount) < 1000) && styles.disabledButton
              ]}
              onPress={handleTopUp}
              disabled={!coinAmount || parseInt(coinAmount) < 1000}
            >
              <Ionicons name="card" size={20} color="#000" style={styles.buttonIcon} />
              <Text style={styles.topUpButtonText}>
                Nạp {coinAmount ? formatCurrency(coinAmount) : '0'} xu
              </Text>
            </TouchableOpacity>
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
