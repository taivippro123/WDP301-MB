import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

interface SubscriptionData {
  _id: string;
  userId: string;
  planKey: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  planId: {
    _id: string;
    key: string;
    name: string;
    description: string;
    priceVnd: number;
    billingCycle: string;
    quotas: {
      maxListingsPerCycle: number;
      maxHighlightsPerCycle: number;
      aiUsagePerCycle: number;
      highlightHoursPerListing: number;
      cooldownDaysBetweenListings: number;
    };
    features: {
      aiAssist: boolean;
      priorityBoost: boolean;
      manualReviewBypass: boolean;
      supportLevel: string;
    };
  };
  usage: {
    listingsUsed: number;
    aiUsed: number;
    highlightsUsed: number;
    cycleStart: string;
    cycleEnd: string;
  };
}

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { accessToken, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchSubscription = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorText(null);

    try {
      const res = await fetch(`${API_URL}/api/subscriptions/me`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Không thể tải thông tin gói đăng ký');
      }

      const json = await res.json();
      setSubscription(json.data);
    } catch (e: any) {
      setErrorText(e.message || 'Không thể tải thông tin gói đăng ký');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [accessToken]);

  // Hide bottom navigation when this screen is focused
  useFocusEffect(
    useCallback(() => {
      const parent = (navigation as any)?.getParent?.();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      
      return () => {
        // Restore bottom navigation when leaving this screen
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
    }, [navigation])
  );

  const onRefresh = () => {
    fetchSubscription(true);
  };

  const handlePurchase = () => {
    const planId = '68f6358694b8406c57d9212f';
    const price = 299000;

    Alert.alert(
      'Xác nhận nâng cấp',
      `Bạn sẽ bị trừ ${formatPrice(price)} xu để nâng cấp gói PRO trong vòng 1 tháng.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Chấp nhận',
          style: 'default',
          onPress: async () => {
            try {
              setIsPurchasing(true);

              const response = await fetch(`${API_URL}/api/subscriptions/purchase`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ planId }),
              });

              const responseData = await response.json();

              if (!response.ok) {
                if (response.status === 401) {
                  await logout();
                  return;
                }
                
                // Check for insufficient wallet balance error
                const errorMsg = responseData?.error || responseData?.message || '';
                const errorMsgLower = errorMsg.toLowerCase();
                
                if (errorMsgLower.includes('insufficient wallet balance') || 
                    errorMsgLower.includes('insufficient') && errorMsgLower.includes('wallet')) {
                  Alert.alert('Lỗi', 'Không đủ xu để thanh toán, vui lòng nạp thêm');
                } else {
                  Alert.alert('Lỗi', errorMsg || 'Không thể nâng cấp gói đăng ký');
                }
                return;
              }

              // Success - refresh subscription data
              Alert.alert('Thành công', 'Gói đăng ký đã được nâng cấp thành công!');
              await fetchSubscription();
            } catch (error: any) {
              console.error('Purchase error:', error);
              Alert.alert('Lỗi', error?.message || 'Có lỗi xảy ra khi nâng cấp gói. Vui lòng thử lại sau.');
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'expired':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'expired':
        return 'Đã hết hạn';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getPlanBadgeColor = (planKey: string) => {
    switch (planKey) {
      case 'free':
        return '#9E9E9E';
      case 'basic':
        return '#2196F3';
      case 'premium':
        return '#FFD700';
      case 'enterprise':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const renderUsageBar = (used: number, max: number, label: string) => {
    const percentage = max > 0 ? (used / max) * 100 : 0;
    const isUnlimited = max === 0 && used === 0;

    return (
      <View style={styles.usageItem}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageLabel}>{label}</Text>
          <Text style={styles.usageText}>
            {isUnlimited ? 'Không giới hạn' : `${used}/${max}`}
          </Text>
        </View>
        {!isUnlimited && (
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: percentage >= 100 ? '#F44336' : '#FFD700'
                }
              ]} 
            />
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gói đăng ký</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorText && !subscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gói đăng ký</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>{errorText}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchSubscription()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!subscription) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gói đăng ký</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
      >
        {/* Current Plan Card */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planTitleContainer}>
              <Text style={styles.planName}>{subscription.planId.name}</Text>
             
            </View>
            <View 
              style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(subscription.status) }
              ]}
            >
              <Text style={styles.statusText}>{getStatusText(subscription.status)}</Text>
            </View>
          </View>

          <Text style={styles.planDescription}>{subscription.planId.description}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Giá gói:</Text>
            <Text style={styles.priceValue}>
              {formatPrice(subscription.planId.priceVnd)}
              <Text style={styles.priceCycle}>/{subscription.planId.billingCycle === 'monthly' ? 'tháng' : 'năm'}</Text>
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Subscription Info */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Bắt đầu</Text>
                <Text style={styles.infoValue}>{formatDate(subscription.startedAt)}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color="#666" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Hết hạn</Text>
                <Text style={styles.infoValue}>{formatDate(subscription.expiresAt)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.autoRenewContainer}>
            <Ionicons 
              name={subscription.autoRenew ? "sync-circle" : "sync-circle-outline"} 
              size={20} 
              color={subscription.autoRenew ? "#4CAF50" : "#666"} 
            />
            <Text style={[styles.autoRenewText, subscription.autoRenew && styles.autoRenewActive]}>
              {subscription.autoRenew ? 'Tự động gia hạn' : 'Không tự động gia hạn'}
            </Text>
          </View>
        </View>

        {/* Usage Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={24} color="#000" />
            <Text style={styles.sectionTitle}>Thống kê sử dụng</Text>
          </View>

          <View style={styles.usageCard}>
            <View style={styles.cycleInfo}>
              <Text style={styles.cycleLabel}>Chu kỳ hiện tại</Text>
              <Text style={styles.cycleDate}>
                {formatDate(subscription.usage.cycleStart)} - {formatDate(subscription.usage.cycleEnd)}
              </Text>
            </View>

            <View style={styles.divider} />

            {renderUsageBar(
              subscription.usage.listingsUsed,
              subscription.planId.quotas.maxListingsPerCycle,
              'Tin đăng'
            )}

            {renderUsageBar(
              subscription.usage.highlightsUsed,
              subscription.planId.quotas.maxHighlightsPerCycle,
              'Tin nổi bật'
            )}

            {renderUsageBar(
              subscription.usage.aiUsed,
              subscription.planId.quotas.aiUsagePerCycle,
              'AI Assist'
            )}
          </View>
        </View>

        {/* Quotas & Limits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={24} color="#000" />
            <Text style={styles.sectionTitle}>Hạn mức & Giới hạn</Text>
          </View>

          <View style={styles.quotaCard}>
            <View style={styles.quotaItem}>
              <View style={styles.quotaIconContainer}>
                <Ionicons name="document-text" size={20} color="#FFD700" />
              </View>
              <View style={styles.quotaTextContainer}>
                <Text style={styles.quotaLabel}>Tin đăng mỗi chu kỳ</Text>
                <Text style={styles.quotaValue}>
                  {subscription.planId.quotas.maxListingsPerCycle === 0 
                    ? 'Không giới hạn' 
                    : `${subscription.planId.quotas.maxListingsPerCycle} tin`}
                </Text>
              </View>
            </View>

            <View style={styles.quotaItem}>
              <View style={styles.quotaIconContainer}>
                <Ionicons name="time" size={20} color="#FFD700" />
              </View>
              <View style={styles.quotaTextContainer}>
                <Text style={styles.quotaLabel}>Thời gian chờ giữa các tin</Text>
                <Text style={styles.quotaValue}>
                  {subscription.planId.quotas.cooldownDaysBetweenListings} ngày
                </Text>
              </View>
            </View>

            <View style={styles.quotaItem}>
              <View style={styles.quotaIconContainer}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
              <View style={styles.quotaTextContainer}>
                <Text style={styles.quotaLabel}>Giờ nổi bật mỗi tin</Text>
                <Text style={styles.quotaValue}>
                  {subscription.planId.quotas.highlightHoursPerListing} giờ
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#000" />
            <Text style={styles.sectionTitle}>Tính năng</Text>
          </View>

          <View style={styles.featuresCard}>
            <View style={styles.featureItem}>
              <Ionicons 
                name={subscription.planId.features.aiAssist ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={subscription.planId.features.aiAssist ? "#4CAF50" : "#F44336"} 
              />
              <Text style={styles.featureText}>AI Hỗ trợ viết tin</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons 
                name={subscription.planId.features.priorityBoost ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={subscription.planId.features.priorityBoost ? "#4CAF50" : "#F44336"} 
              />
              <Text style={styles.featureText}>Ưu tiên hiển thị</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons 
                name={subscription.planId.features.manualReviewBypass ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={subscription.planId.features.manualReviewBypass ? "#4CAF50" : "#F44336"} 
              />
              <Text style={styles.featureText}>Bỏ qua duyệt thủ công</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="headset" size={24} color="#666" />
              <Text style={styles.featureText}>
                Hỗ trợ: {subscription.planId.features.supportLevel === 'none' ? 'Không có' : 'Ưu tiên'}
              </Text>
            </View>
          </View>
        </View>

        {/* Upgrade Button */}
        {subscription.planKey === 'free' && (
          <TouchableOpacity 
            style={[styles.upgradeButton, isPurchasing && styles.upgradeButtonDisabled]} 
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="rocket" size={24} color="#000" />
            )}
            <Text style={styles.upgradeButtonText}>
              {isPurchasing ? 'Đang xử lý...' : 'Nâng cấp gói đăng ký'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  priceCycle: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
  },
  autoRenewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoRenewText: {
    fontSize: 14,
    color: '#666',
  },
  autoRenewActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cycleInfo: {
    marginBottom: 8,
  },
  cycleLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  cycleDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  usageItem: {
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  usageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quotaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quotaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  quotaIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF9E6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotaTextContainer: {
    flex: 1,
  },
  quotaLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  quotaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});

