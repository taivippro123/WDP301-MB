import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
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
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    price: '',
    description: '',
    category: '',
    brand: '',
    model: '',
    year: '',
    condition: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    images: [] as string[],
    specifications: {
      batteryCapacity: '',
      range: '',
      chargingTime: '',
      power: '',
      maxSpeed: '',
      motorType: '',
      batteryType: '',
      voltage: '',
      capacity: '',
      cycleLife: '',
      operatingTemperature: '',
      warranty: '',
      compatibility: ''
    }
  });

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

  const fetchProductDetails = async (productId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        headers: authHeaders(),
      });
      
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return null;
      }
      
      if (!res.ok) {
        throw new Error('Không thể tải chi tiết sản phẩm');
      }
      
      const product = await res.json();
      return product;
    } catch (e: any) {
      console.error('Error fetching product details:', e);
      return null;
    }
  };

  const handleEditProduct = async (product: any) => {
    setIsLoading(true);
    try {
      // Fetch full product details
      const fullProduct = await fetchProductDetails(product._id);
      if (!fullProduct) {
        Alert.alert('Lỗi', 'Không thể tải chi tiết sản phẩm');
        return;
      }

      setEditingProduct(fullProduct);
      setEditForm({
        title: fullProduct.title || '',
        price: fullProduct.price?.toString() || '',
        description: fullProduct.description || '',
        category: fullProduct.category || '',
        brand: fullProduct.brand || '',
        model: fullProduct.model || '',
        year: fullProduct.year?.toString() || '',
        condition: fullProduct.condition || '',
        length: fullProduct.length?.toString() || '',
        width: fullProduct.width?.toString() || '',
        height: fullProduct.height?.toString() || '',
        weight: fullProduct.weight?.toString() || '',
        images: fullProduct.images || [],
        specifications: {
          batteryCapacity: fullProduct.specifications?.batteryCapacity || '',
          range: fullProduct.specifications?.range || '',
          chargingTime: fullProduct.specifications?.chargingTime || '',
          power: fullProduct.specifications?.power || '',
          maxSpeed: fullProduct.specifications?.maxSpeed || '',
          motorType: fullProduct.specifications?.motorType || '',
          batteryType: fullProduct.specifications?.batteryType || '',
          voltage: fullProduct.specifications?.voltage || '',
          capacity: fullProduct.specifications?.capacity || '',
          cycleLife: fullProduct.specifications?.cycleLife || '',
          operatingTemperature: fullProduct.specifications?.operatingTemperature || '',
          warranty: fullProduct.specifications?.warranty || '',
          compatibility: fullProduct.specifications?.compatibility || ''
        }
      });
      setIsEditModalVisible(true);
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể tải chi tiết sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    setIsLoading(true);
    try {
      const updateData = {
        title: editForm.title,
        price: parseFloat(editForm.price) || 0,
        description: editForm.description,
        category: editForm.category,
        brand: editForm.brand,
        model: editForm.model,
        year: editForm.year ? parseInt(editForm.year) : undefined,
        condition: editForm.condition,
        length: editForm.length ? parseFloat(editForm.length) : undefined,
        width: editForm.width ? parseFloat(editForm.width) : undefined,
        height: editForm.height ? parseFloat(editForm.height) : undefined,
        weight: editForm.weight ? parseFloat(editForm.weight) : undefined,
        images: editForm.images,
        specifications: {
          batteryCapacity: editForm.specifications.batteryCapacity,
          range: editForm.specifications.range,
          chargingTime: editForm.specifications.chargingTime,
          power: editForm.specifications.power,
          maxSpeed: editForm.specifications.maxSpeed,
          motorType: editForm.specifications.motorType,
          batteryType: editForm.specifications.batteryType,
          voltage: editForm.specifications.voltage,
          capacity: editForm.specifications.capacity,
          cycleLife: editForm.specifications.cycleLife,
          operatingTemperature: editForm.specifications.operatingTemperature,
          warranty: editForm.specifications.warranty,
          compatibility: editForm.specifications.compatibility
        }
      };

      const res = await fetch(`${API_URL}/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(updateData)
      });

      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }

      if (res.ok) {
        Alert.alert('Thành công', 'Tin đăng đã được cập nhật');
        setIsEditModalVisible(false);
        setEditingProduct(null);
        loadMyProducts(); // Reload the list
      } else {
        const errorData = await res.json();
        Alert.alert('Lỗi', errorData?.message || 'Không thể cập nhật tin đăng');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể cập nhật tin đăng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = (product: any) => {
    Alert.alert(
      'Xóa tin đăng',
      'Bạn có chắc chắn muốn xóa tin đăng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const res = await fetch(`${API_URL}/api/products/${product._id}`, {
                method: 'DELETE',
                headers: authHeaders()
              });

              if (res.status === 401) {
                await logout();
                (navigation as any).navigate('Tài khoản');
                return;
              }

              if (res.ok) {
                Alert.alert('Thành công', 'Tin đăng đã được xóa');
                loadMyProducts(); // Reload the list
              } else {
                const errorData = await res.json();
                Alert.alert('Lỗi', errorData?.message || 'Không thể xóa tin đăng');
              }
            } catch (e: any) {
              Alert.alert('Lỗi', 'Không thể xóa tin đăng');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setEditForm(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const removeImage = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Video handling functions (from HomeScreen)
  const getFirstMediaUrl = (p: any): string | null => {
    const imgs: any[] = Array.isArray(p?.images) ? p.images : [];
    const vids: any[] = Array.isArray((p as any)?.videos) ? (p as any).videos : [];
    const first = (imgs[0] || vids[0]) || null;
    if (!first) return null;
    return typeof first === 'string' ? first : (first.url || first.secure_url || null);
  };

  const isVideoUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const u = url.toLowerCase();
    return /(\.mp4|\.mov|\.m4v|\.webm|\.ogg)(\?|$)/.test(u) || u.includes('/video/upload');
  };

  const getVideoPoster = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      const withSo = url.replace('/video/upload/', '/video/upload/so_0/');
      return withSo.replace(/\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i, '.jpg$2');
    } catch {
      return undefined;
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
    <View key={item._id || item.id} style={styles.listingCard}>
      <TouchableOpacity 
        style={styles.listingContent}
        onPress={() => {
          const pid = item._id || item.id;
          (navigation as any).navigate('Trang chủ' as never, { screen: 'ProductDetail', params: { productId: pid } } as never);
        }}
      >
        <View style={styles.listingImage}>
          {(() => {
            const url = getFirstMediaUrl(item);
            if (!url) return <Ionicons name="image-outline" size={40} color="#ccc" />;
            if (isVideoUrl(url)) {
              const poster = getVideoPoster(url);
              return (
                <View style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                  {poster ? (
                    <Image source={{ uri: poster }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Ionicons name="videocam" size={32} color="#999" />
                  )}
                  <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="play" size={20} color="#fff" />
                  </View>
                </View>
              );
            }
            return <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />;
          })()}
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

      <View style={styles.listingActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditProduct(item)}
        >
          <Ionicons name="create-outline" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteProduct(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
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

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sửa tin đăng</Text>
            <TouchableOpacity onPress={handleUpdateProduct} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                {isLoading ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Basic Information */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tiêu đề *</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.title}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))}
                placeholder="Nhập tiêu đề tin đăng"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editForm.description}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                placeholder="Mô tả chi tiết sản phẩm"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Giá (VNĐ) *</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.price}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, price: text }))}
                placeholder="Nhập giá sản phẩm"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Danh mục</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.category}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, category: text }))}
                  placeholder="VD: vehicle, battery"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Tình trạng</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.condition}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, condition: text }))}
                  placeholder="VD: new, used"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Thương hiệu</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.brand}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, brand: text }))}
                  placeholder="VD: VinFast"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Model</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.model}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, model: text }))}
                  placeholder="VD: VF8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Năm sản xuất</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.year}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, year: text }))}
                placeholder="VD: 2023"
                keyboardType="numeric"
              />
            </View>

            {/* Images Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hình ảnh sản phẩm</Text>
            </View>

            <View style={styles.imagesContainer}>
              {editForm.images.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  {(() => {
                    if (isVideoUrl(image)) {
                      const poster = getVideoPoster(image);
                      return (
                        <View style={styles.imagePreview}>
                          {poster ? (
                            <Image source={{ uri: poster }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
                          ) : (
                            <Ionicons name="videocam" size={24} color="#999" />
                          )}
                          <View style={{ position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="play" size={12} color="#fff" />
                          </View>
                        </View>
                      );
                    }
                    return <Image source={{ uri: image }} style={styles.imagePreview} />;
                  })()}
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="#666" />
                <Text style={styles.addImageText}>Thêm ảnh</Text>
              </TouchableOpacity>
            </View>

            {/* Physical Dimensions */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kích thước & Trọng lượng</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 4 }]}>
                <Text style={styles.inputLabel}>Chiều dài (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.length}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, length: text }))}
                  placeholder="150"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.inputLabel}>Chiều rộng (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.width}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, width: text }))}
                  placeholder="60"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 4 }]}>
                <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.height}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, height: text }))}
                  placeholder="90"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trọng lượng (kg)</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.weight}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, weight: text }))}
                placeholder="50"
                keyboardType="numeric"
              />
            </View>

            {/* Specifications */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Dung lượng pin</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.batteryCapacity}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, batteryCapacity: text }
                  }))}
                  placeholder="VD: 3.5 kWh"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Tầm hoạt động</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.range}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, range: text }
                  }))}
                  placeholder="VD: 203 km"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Thời gian sạc</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.chargingTime}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, chargingTime: text }
                  }))}
                  placeholder="VD: 6-7 giờ"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Công suất</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.power}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, power: text }
                  }))}
                  placeholder="VD: 2,500 W"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Tốc độ tối đa</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.maxSpeed}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, maxSpeed: text }
                  }))}
                  placeholder="VD: 120 km/h"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Loại động cơ</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.motorType}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, motorType: text }
                  }))}
                  placeholder="VD: Permanent Magnet"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Loại pin</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.batteryType}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, batteryType: text }
                  }))}
                  placeholder="VD: LFP"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Điện áp</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.voltage}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, voltage: text }
                  }))}
                  placeholder="VD: 48V"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Dung lượng</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.capacity}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, capacity: text }
                  }))}
                  placeholder="VD: 34.6 Ah"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Chu kỳ sạc</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.specifications.cycleLife}
                  onChangeText={(text) => setEditForm(prev => ({ 
                    ...prev, 
                    specifications: { ...prev.specifications, cycleLife: text }
                  }))}
                  placeholder="VD: 2000 chu kỳ"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nhiệt độ hoạt động</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.specifications.operatingTemperature}
                onChangeText={(text) => setEditForm(prev => ({ 
                  ...prev, 
                  specifications: { ...prev.specifications, operatingTemperature: text }
                }))}
                placeholder="VD: -10°C đến 45°C"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bảo hành</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.specifications.warranty}
                onChangeText={(text) => setEditForm(prev => ({ 
                  ...prev, 
                  specifications: { ...prev.specifications, warranty: text }
                }))}
                placeholder="VD: 3 năm hoặc 30,000 km"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tương thích</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.specifications.compatibility}
                onChangeText={(text) => setEditForm(prev => ({ 
                  ...prev, 
                  specifications: { ...prev.specifications, compatibility: text }
                }))}
                placeholder="VD: Tương thích trạm sạc VinFast"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  listingContent: {
    flex: 1,
    flexDirection: "row",
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#666",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  disabledText: {
    color: "#ccc",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  specsContainer: {
    // Container for specifications inputs
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // Image styles
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  addImageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});