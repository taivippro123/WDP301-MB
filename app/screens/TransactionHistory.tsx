import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

type WalletTransaction = {
  _id: string;
  type: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  reference?: string;
  paymentMethod?: string;
  status?: string;
  createdAt: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    bankTransactionId?: string | null;
  };
};

export default function TransactionHistory() {
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const fetchTransactions = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/profile/wallet/transactions`, {
        headers: {
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const raw = await res.text();
      const trimmed = (raw || '').trim();
      const isHtml = trimmed.startsWith('<');
      let data: any = {};
      if (!isHtml) {
        try {
          data = trimmed ? JSON.parse(trimmed) : {};
        } catch {
          // keep data as empty object if parsing fails
        }
      }
      if (!res.ok) {
        const message = data?.message || (isHtml ? 'Phản hồi không hợp lệ từ máy chủ' : 'Không thể tải lịch sử giao dịch');
        throw new Error(message);
      }
      if (isHtml) {
        throw new Error('Phản hồi không hợp lệ từ máy chủ');
      }
      const list: WalletTransaction[] = Array.isArray(data?.transactions) ? data.transactions : [];
      setTransactions(list);
    } catch (e: any) {
      setError(e?.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchTransactions();
    } finally {
      setRefreshing(false);
    }
  }, [fetchTransactions]);

  const renderItem = ({ item }: { item: WalletTransaction }) => {
    const isDebit = item.type === 'purchase' || item.type === 'payment' || item.type === 'transfer_out' || item.amount < 0;
    const isCredit = !isDebit; // treat the rest as credit (e.g., topup, refund)
    const amountSign = isDebit ? '-' : '+';
    const amountColor = isDebit ? '#e74c3c' : '#2ecc71';
    const title = item.description || item.type;
    const subtitle = item.metadata?.orderId ? `Mã đơn: ${item.metadata.orderId}` : item.reference || item.paymentMethod || '';
    const date = new Date(item.createdAt).toLocaleString('vi-VN');

    return (
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={styles.itemIcon}>
            <Ionicons name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'} size={22} color={amountColor} />
          </View>
          <View style={styles.itemTexts}>
            <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={styles.itemSubtitle} numberOfLines={1}>{subtitle}</Text>}
            <Text style={styles.itemDate}>{date}</Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: amountColor }]}>
            {amountSign}{Math.abs(item.amount).toLocaleString('vi-VN')}
          </Text>
          {typeof item.balanceAfter === 'number' && (
            <Text style={styles.itemBalance}>Số dư: {Number(item.balanceAfter).toLocaleString('vi-VN')}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FFD700" />
        <Text style={{ marginTop: 8 }}>Đang tải lịch sử giao dịch...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchTransactions} style={styles.retryBtn}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={transactions.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : {}}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="time" size={28} color="#bbb" />
              <Text style={{ color: '#666', marginTop: 8 }}>Chưa có giao dịch</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FFD700"]} tintColor="#FFD700" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerPlaceholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffe0e0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 8,
    color: '#e74c3c',
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  retryText: {
    color: '#000',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f7f7',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemTexts: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemBalance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});


