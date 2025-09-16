import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    Keyboard,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const compactOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput | null>(null);
  const compactSearchInputRef = useRef<TextInput | null>(null);
  
  const categories = [
    { id: 1, name: 'Xe máy\nđiện', icon: 'bicycle-outline' },
    { id: 2, name: 'Ô tô\nđiện', icon: 'car-outline' },
    { id: 3, name: 'Pin xe\nmáy', icon: 'battery-charging-outline' },
    { id: 4, name: 'Pin ô tô\nđiện', icon: 'battery-full-outline' },
    { id: 5, name: 'Phụ kiện\nxe điện', icon: 'build-outline' },
    { id: 6, name: 'Sạc xe\nđiện', icon: 'flash-outline' },
    { id: 7, name: 'Xe đạp\nđiện', icon: 'bicycle' },
    { id: 8, name: 'Xe tải\nđiện', icon: 'bus-outline' },
    { id: 9, name: 'Dịch vụ\nsửa chữa', icon: 'construct-outline' },
    { id: 10, name: 'Bảo hiểm\nxe điện', icon: 'shield-checkmark-outline' },
  ];

  const fetchProducts = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorText(null);
    try {
      const url = `${API_URL}/api/products`;
      const res = await fetch(url);
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.products ?? []);
      setProducts(list);
    } catch (e) {
      setErrorText('Không tải được danh sách sản phẩm');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    fetchProducts(true);
  };

  const tabs = ['Dành cho bạn', 'Gần bạn', 'Mới nhất'];

  // Chiều cao header khi đầy đủ
  const HEADER_MAX_HEIGHT = 220;
  const HEADER_MIN_HEIGHT = 70; // Chiều cao compact search
  const SCROLL_THRESHOLD = 120;

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const shouldShowCompact = currentScrollY > SCROLL_THRESHOLD;
    
    if (shouldShowCompact !== isScrolled) {
      setIsScrolled(shouldShowCompact);
      
      // Parallel animations for smoother transition
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: shouldShowCompact ? -HEADER_MAX_HEIGHT : 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(compactOpacity, {
          toValue: shouldShowCompact ? 1 : 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handleSearchFocus = (isCompact = false) => {
    if (isCompact && compactSearchInputRef.current) {
      compactSearchInputRef.current.focus();
    } else if (!isCompact && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setSearchText('');
    dismissKeyboard();
  };

  const formatPrice = (price?: number | string) => {
    if (price === undefined || price === null) return '';
    if (typeof price === 'string') return price;
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    } catch {
      return `${price} VNĐ`;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header, 
            { 
              transform: [{ translateY: headerTranslateY }],
            }
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity>
              <Ionicons name="menu" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={() => (navigation as any).navigate('Wishlist')}
              >
                <Ionicons name="heart-outline" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={() => (navigation as any).navigate('Notification')}
              >
                <Ionicons name="notifications-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.headerTitle}>Xe điện & Pin xe điện</Text>
          <Text style={styles.headerSubtitle}>Nền tảng giao dịch xe điện hàng đầu</Text>
          
          {/* Search Box */}
          <TouchableOpacity 
            style={styles.searchContainer}
            onPress={() => handleSearchFocus(false)}
            activeOpacity={1}
          >
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Tìm xe điện, pin theo hãng, đời, dung lượng..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={dismissKeyboard}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Compact Search Bar when scrolled */}
        <Animated.View 
          style={[
            styles.compactSearchContainer,
            {
              opacity: compactOpacity,
              transform: [{
                translateY: compactOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-HEADER_MIN_HEIGHT, 0],
                })
              }]
            }
          ]}
          pointerEvents={isScrolled ? 'auto' : 'none'}
        >
          <TouchableOpacity style={styles.compactMenuButton}>
            <Ionicons name="menu" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.compactSearch}
            onPress={() => handleSearchFocus(true)}
            activeOpacity={1}
          >
            <Ionicons name="search" size={16} color="#999" />
            <TextInput
              ref={compactSearchInputRef}
              style={styles.compactSearchInput}
              placeholder="Tìm sản phẩm..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={dismissKeyboard}
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                onPress={clearSearch}
                style={styles.compactClearButton}
              >
                <Ionicons name="close-circle" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.compactIcon}
            onPress={() => (navigation as any).navigate('Wishlist')}
          >
            <Ionicons name="heart-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.compactIcon}
            onPress={() => (navigation as any).navigate('Notification')}
          >
            <Ionicons name="notifications-outline" size={20} color="#000" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.ScrollView 
          style={styles.content}
          contentContainerStyle={{ 
            paddingTop: HEADER_MAX_HEIGHT + 10, // Thêm 10px để tránh che category
            paddingBottom: 100 // Thêm padding bottom để tránh che bởi bottom navigation
          }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#FFD700']}
              tintColor="#FFD700"
              title="Đang cập nhật..."
              titleColor="#000"
            />
          }
        >
        {/* Categories */}
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryItem}>
              <View style={styles.categoryIcon}>
                <Ionicons name={category.icon as any} size={32} color="#FF6B35" />
              </View>
              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => setActiveTab(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          {isLoading && (
            <Text style={{ padding: 16, color: '#666' }}>Đang tải sản phẩm...</Text>
          )}
          {errorText && !isLoading && (
            <Text style={{ padding: 16, color: '#d00' }}>{errorText}</Text>
          )}
          {!isLoading && !errorText && products.map((product) => (
            <TouchableOpacity 
              key={product._id || product.id} 
              style={styles.productItem}
              onPress={() => (navigation as any).navigate('ProductDetail', { productId: product._id || product.id })}
            >
              <View style={styles.productImage}>
                {product.images && product.images.length > 0 ? (
                  <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                ) : (
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                <View style={styles.productDetails}>
                  {(product.brand || product.year) && (
                    <Text style={styles.productDetail}>{product.brand}{product.year ? ` • ${product.year}` : ''}</Text>
                  )}
                  {product.specifications?.batteryCapacity && (
                    <Text style={styles.productDetail}>Pin: {product.specifications.batteryCapacity}</Text>
                  )}
                  {product.condition && (
                    <Text style={styles.productDetail}>Tình trạng: {product.condition}</Text>
                  )}
                </View>
                <Text style={styles.productLocation}>
                  {(() => {
                    const sellerAddr = (product as any)?.seller?.address;
                    if (sellerAddr?.province) return sellerAddr.province;
                    const loc: any = product.location;
                    if (loc?.province) return loc.province;
                    if (loc?.city) return loc.city;
                    return loc || '';
                  })()}
                </Text>
              </View>
              <TouchableOpacity style={styles.favoriteButton}>
                <Ionicons name="heart-outline" size={20} color="#999" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
       </Animated.ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 25,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingRight: 8,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  categoryItem: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    lineHeight: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  productItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: '1%',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    minHeight: 280,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  productLocation: {
    fontSize: 12,
    color: '#666',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  productDetails: {
    marginVertical: 4,
  },
  productDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  compactSearchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  compactMenuButton: {
    marginRight: 12,
  },
  compactSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  compactSearchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#000',
    fontSize: 14,
    paddingRight: 8,
    backgroundColor: '#fff',
  },
  compactClearButton: {
    padding: 2,
  },
  compactIcon: {
    marginLeft: 8,
  },
});