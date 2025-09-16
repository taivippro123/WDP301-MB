import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import API_URL from "../../config/api";
import { useAuth } from "../AuthContext";

const { width: screenWidth } = Dimensions.get("window");

export default function ManageListingsScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const tabsScrollViewRef = useRef<ScrollView>(null);
  const { accessToken, logout } = useAuth();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [productsByStatus, setProductsByStatus] = useState<Record<string, any[]>>({
    active: [],
    expired: [],
    rejected: [],
    draft: [],
    pending: [],
    hidden: [],
  });

  // Tabs configuration
  const tabs = [
    { id: 0, title: "ĐANG HIỂN THỊ", key: "active" },
    { id: 1, title: "HẾT HẠN", key: "expired" },
    { id: 2, title: "BỊ TỪ CHỐI", key: "rejected" },
    { id: 3, title: "TIN NHÁP", key: "draft" },
    { id: 4, title: "CHỜ DUYỆT", key: "pending" },
    { id: 5, title: "ĐÃ ẨN", key: "hidden" },
  ];

  const tabLayouts = useRef<{ x: number; width: number; textWidth: number }[]>(
    Array(tabs.length).fill(null).map(() => ({ x: 0, width: 0, textWidth: 0 }))
  );
  const textRefs = useRef<(Text | null)[]>([]);
  const scrollOffsetX = useSharedValue(0);

  const handleTabLayout = (event: any, index: number) => {
    const { x, width } = event.nativeEvent.layout;
    
    tabLayouts.current[index] = {
      ...tabLayouts.current[index],
      x,
      width
    };
    
    // Update indicator immediately if this is the active tab and text width is available
    if (index === activeTab && tabLayouts.current[index].textWidth > 0) {
      setTimeout(() => updateIndicatorPosition(), 10);
    }
  };

  const handleTextLayout = (event: any, index: number) => {
    const { width: textWidth } = event.nativeEvent.layout;
    
    tabLayouts.current[index] = {
      ...tabLayouts.current[index],
      textWidth
    };
    
    // Update indicator immediately if this is the active tab and tab layout is available
    if (index === activeTab && tabLayouts.current[index].width > 0) {
      setTimeout(() => updateIndicatorPosition(), 10);
    }
  };

  // Animated values
  const translateX = useSharedValue(0);
  const tabIndicatorPosition = useSharedValue(0);
  const tabIndicatorWidth = useSharedValue(100); // Start with some width
  const isGesturing = useSharedValue(false);
  
  // Initialize indicator on mount
  useEffect(() => {
    loadMyProducts();
    const initTimer = setTimeout(() => {
      updateIndicatorPosition();
    }, 100);
    
    return () => clearTimeout(initTimer);
  }, []);

  const authHeaders = () => ({
    'Accept': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const loadMyProducts = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/products/my/products`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Không thể tải danh sách tin đăng');
      }
      const items: any[] = Array.isArray(data?.products) ? data.products : [];
      const grouped: Record<string, any[]> = { active: [], expired: [], rejected: [], draft: [], pending: [], hidden: [] };
      items.forEach((p) => {
        const status = p?.status as string;
        if (status && grouped[status as keyof typeof grouped]) {
          grouped[status].push(p);
        } else {
          grouped.active.push(p); // default bucket
        }
      });
      setProductsByStatus(grouped);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto scroll tabs to center active tab
  const scrollToActiveTab = (tabIndex: number) => {
    setTimeout(() => {
      if (tabsScrollViewRef.current && tabs.length > 0) {
        const tabWidth = 120;
        const tabPadding = 8;
        const centerOffset = screenWidth / 2 - tabWidth / 2;

        const scrollX = tabIndex * tabWidth + tabPadding - centerOffset;
        const maxScrollX = Math.max(
          0,
          tabs.length * tabWidth + tabPadding * 2 - screenWidth
        );
        const finalScrollX = Math.max(0, Math.min(scrollX, maxScrollX));

        tabsScrollViewRef.current.scrollTo({
          x: finalScrollX,
          animated: true,
        });
      }
    }, 100);
  };

  const handleGestureEvent = (event: any) => {
    try {
      if (!event?.nativeEvent) return;

      const { state, translationX, velocityX } = event.nativeEvent;

      if (state === State.ACTIVE && typeof translationX === "number") {
        const maxTranslation = screenWidth * 0.3;
        translateX.value = Math.max(
          -maxTranslation,
          Math.min(maxTranslation, translationX)
        );
      } else if (state === State.END) {
        const minSwipeDistance = 50;
        const minVelocity = 500;

        if (typeof translationX === "number" && typeof velocityX === "number") {
          if (
            Math.abs(translationX) > minSwipeDistance ||
            Math.abs(velocityX) > minVelocity
          ) {
            if (translationX > 0) {
              handleSwipeRight();
            } else if (translationX < 0) {
              handleSwipeLeft();
            }
          }
        }

        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        });
      }
    } catch (error) {
      translateX.value = withSpring(0);
    }
  };

  const handleSwipeLeft = () => {
    try {
      if (tabs && activeTab < tabs.length - 1) {
        const newIndex = activeTab + 1;
        setActiveTab(newIndex);
      }
    } catch (error) {
      // Handle swipe error silently
    }
  };

  const handleSwipeRight = () => {
    try {
      if (activeTab > 0) {
        const newIndex = activeTab - 1;
        setActiveTab(newIndex);
      }
    } catch (error) {
      // Handle swipe error silently
    }
  };

  const forceRemeasureLayouts = () => {
    // Force re-measure all tab layouts
    tabs.forEach((_, index) => {
      const ref = textRefs.current[index];
      if (ref) {
        ref.measure((x, y, width, height, pageX, pageY) => {
          if (tabLayouts.current[index]) {
            tabLayouts.current[index].x = pageX;
            tabLayouts.current[index].textWidth = width;
          }
        });
      }
    });
  };

  const updateIndicatorPosition = () => {
    const layout = tabLayouts.current[activeTab];
    
    if (layout && layout.textWidth > 0 && layout.width > 0) {
      // Calculate center position of the text within the tab
      const tabCenterX = layout.x + layout.width / 2;
      const textStartX = tabCenterX - layout.textWidth / 2;
      
      // Adjust for scroll offset - indicator position relative to scrollview container
      const adjustedTextStartX = textStartX - scrollOffsetX.value;
      
      tabIndicatorPosition.value = withSpring(adjustedTextStartX, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      });
      tabIndicatorWidth.value = withSpring(layout.textWidth, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      });
    } else {
      forceRemeasureLayouts();
      setTimeout(() => {
        const newLayout = tabLayouts.current[activeTab];
        if (newLayout && newLayout.textWidth > 0) {
          const tabCenterX = newLayout.x + newLayout.width / 2;
          const textStartX = tabCenterX - newLayout.textWidth / 2;
          const adjustedTextStartX = textStartX - scrollOffsetX.value;
          
          tabIndicatorPosition.value = withSpring(adjustedTextStartX, {
            damping: 20,
            stiffness: 200,
            mass: 0.8,
          });
          tabIndicatorWidth.value = withSpring(newLayout.textWidth, {
            damping: 20,
            stiffness: 200,
            mass: 0.8,
          });
        }
      }, 100);
    }
  };

  useEffect(() => {
    // Add multiple attempts with different delays
    const timer1 = setTimeout(() => {
      updateIndicatorPosition();
    }, 0);
    
    const timer2 = setTimeout(() => {
      updateIndicatorPosition();
    }, 100);
    
    const timer3 = setTimeout(() => {
      updateIndicatorPosition();
    }, 300);
    
    scrollToActiveTab(activeTab);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [activeTab]);

  const listings = [
    {
      id: 1,
      title: "Xe máy điện VinFast Klara A2",
      price: "35,000,000 VNĐ",
      location: "Hà Nội",
      status: "active",
      views: 156,
      favorites: 12,
      postedDate: "3 ngày trước",
      expiryDate: "27 ngày còn lại",
    },
    {
      id: 2,
      title: "Pin xe máy điện Lithium 60V 32Ah",
      price: "8,500,000 VNĐ",
      location: "Đà Nẵng",
      status: "active",
      views: 89,
      favorites: 5,
      postedDate: "1 tuần trước",
      expiryDate: "23 ngày còn lại",
    },
    {
      id: 3,
      title: "Xe đạp điện Yamaha PAS",
      price: "18,000,000 VNĐ",
      location: "Hà Nội",
      status: "active",
      views: 234,
      favorites: 18,
      postedDate: "2 tuần trước",
      expiryDate: "16 ngày còn lại",
    },
  ];

  const expiredListings = [
    {
      id: 4,
      title: "Ô tô điện VinFast VF8",
      price: "1,200,000,000 VNĐ",
      location: "TP.HCM",
      status: "expired",
      views: 445,
      favorites: 28,
      postedDate: "2 tháng trước",
      expiryDate: "Đã hết hạn",
    },
  ];

  const getCountForTab = (index: number) => {
    const key = tabs[index]?.key as keyof typeof productsByStatus;
    if (!key) return 0;
    return productsByStatus[key]?.length || 0;
  };

  const getCurrentListings = () => {
    const key = tabs[activeTab]?.key as keyof typeof productsByStatus;
    if (!key) return [];
    return productsByStatus[key] || [];
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="document-outline" size={64} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>Không tìm thấy tin đăng</Text>
      <Text style={styles.emptySubtitle}>
        Bạn hiện tại không có tin đăng nào cho trạng thái này
      </Text>
      {activeTab === 0 && (
        <TouchableOpacity style={styles.postButton}>
          <Text style={styles.postButtonText}>Đăng tin</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const tabIndicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabIndicatorPosition.value }],
      width: tabIndicatorWidth.value,
    };
  });

  const renderListingItem = (item: any) => (
    <TouchableOpacity key={item._id || item.id} style={styles.listingCard} onPress={() => {
      const pid = item._id || item.id;
      (navigation as any).navigate('Trang chủ' as never, { screen: 'ProductDetail', params: { productId: pid } } as never);
    }}>
      <View style={styles.listingImage}>
        {item?.images && item.images.length > 0 ? (
          <View style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}>
            {/* @ts-ignore */}
            <Animated.Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ) : (
          <Ionicons name="image-outline" size={40} color="#ccc" />
        )}
      </View>

      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingPrice}>{typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')} VNĐ` : item.price}</Text>
        {!!item.location && <Text style={styles.listingLocation}>{item.location}</Text>}

        <View style={styles.listingStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color="#666" />
            <Text style={styles.statText}>{item.views || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={16} color="#666" />
            <Text style={styles.statText}>{item.favorites || item.likes || 0}</Text>
          </View>
        </View>

        <View style={styles.listingDates}>
          <Text style={styles.dateText}>{item.postedDate || new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
          <Text
            style={[
              styles.expiryText,
              item.status === "expired" && styles.expiredText,
            ]}
          >
            {item.expiryDate || (item.status === 'expired' ? 'Đã hết hạn' : 'Đang hiển thị')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý tin đăng</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          ref={tabsScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
          onScroll={(event) => {
            scrollOffsetX.value = event.nativeEvent.contentOffset.x;
            // Update indicator position when scrolling
            runOnJS(updateIndicatorPosition)();
          }}
          scrollEventThrottle={16}
          onScrollEndDrag={() => {
            setTimeout(() => updateIndicatorPosition(), 50);
          }}
          onMomentumScrollEnd={() => {
            setTimeout(() => updateIndicatorPosition(), 50);
          }}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => {
                setActiveTab(index);
              }}
              onLayout={(e) => handleTabLayout(e, index)}
            >
              <Text
                ref={(ref) => { textRefs.current[index] = ref; }}
                style={[
                  styles.tabText,
                  activeTab === index && styles.activeTabText,
                ]}
                onLayout={(e) => handleTextLayout(e, index)}
              >
                {tab.title} ({getCountForTab(index)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Animated Tab Indicator */}
        <Animated.View
          style={[styles.tabIndicator, tabIndicatorAnimatedStyle]}
        />
      </View>

      {/* Content */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureEvent}
        activeOffsetX={[-15, 15]}
        failOffsetY={[-10, 10]}
        shouldCancelWhenOutside={true}
      >
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="reload" size={24} color="#999" />
                <Text style={styles.emptySubtitle}>Đang tải tin đăng...</Text>
              </View>
            ) : errorMsg ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
                <Text style={styles.emptyTitle}>Lỗi</Text>
                <Text style={styles.emptySubtitle}>{errorMsg}</Text>
                <TouchableOpacity style={styles.postButton} onPress={loadMyProducts}>
                  <Text style={styles.postButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : getCurrentListings().length === 0 ? (
              renderEmptyState()
            ) : (
              getCurrentListings().map(renderListingItem)
            )}
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
  },
  userStats: {
    marginRight: 16,
  },
  userStatsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tabsContainer: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minWidth: 120,
  },
  activeTab: {
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "bold",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: "#FFD700",
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  postButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  listingCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  listingImage: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 18,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 4,
  },
  listingLocation: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  listingStats: {
    flexDirection: "row",
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  listingDates: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 11,
    color: "#999",
  },
  expiryText: {
    fontSize: 11,
    color: "#4CAF50",
  },
  expiredText: {
    color: "#FF6B6B",
  },
  listingActions: {
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    marginVertical: 2,
  },
});