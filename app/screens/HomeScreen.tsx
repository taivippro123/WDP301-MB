import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
  const { logout, accessToken } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<'' | 'vehicle' | 'battery'>('');
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState<string | null>(null);
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

  const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
  const parsePrice = (s: string): number | undefined => {
    const d = onlyDigits(s);
    if (!d) return undefined;
    const n = Number(d);
    return Number.isFinite(n) ? n : undefined;
  };
  const formatVndInput = (s: string) => {
    const d = onlyDigits(s);
    if (!d) return '';
    try { return Number(d).toLocaleString('vi-VN'); } catch { return d; }
  };
  const handleMinPriceChange = (t: string) => setMinPriceInput(formatVndInput(t));
  const handleMaxPriceChange = (t: string) => setMaxPriceInput(formatVndInput(t));

  const fetchProducts = async (options?: {
    isRefresh?: boolean;
    query?: string;
    category?: '' | 'vehicle' | 'battery';
    minPriceInputOverride?: string;
    maxPriceInputOverride?: string;
  }) => {
    const isRefresh = options?.isRefresh ?? false;
    const queryOverride = options?.query;
    const categoryOverride = options?.category;
    const minPriceInputOverride = options?.minPriceInputOverride;
    const maxPriceInputOverride = options?.maxPriceInputOverride;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorText(null);
    try {
      const params = new URLSearchParams();
      params.set('status', 'active');
      params.set('sort', 'priority');
      const q = ((queryOverride !== undefined ? queryOverride : searchText) || '').trim();
      const categoryValue = categoryOverride !== undefined ? categoryOverride : filterCategory;
      const minInputValue = minPriceInputOverride !== undefined ? minPriceInputOverride : minPriceInput;
      const maxInputValue = maxPriceInputOverride !== undefined ? maxPriceInputOverride : maxPriceInput;
      if (q) params.set('q', q);
      if (categoryValue) params.set('category', categoryValue);
      const minPriceParam = parsePrice(minInputValue);
      const maxPriceParam = parsePrice(maxInputValue);
      if (typeof minPriceParam === 'number') params.set('min_price', String(minPriceParam));
      if (typeof maxPriceParam === 'number') params.set('max_price', String(maxPriceParam));
      const url = `${API_URL}/api/products?${params.toString()}`;
      const res = await fetch(url);
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.products ?? []);
      const qLower = q.toLowerCase();
      const minPriceFilter = minPriceParam;
      const maxPriceFilter = maxPriceParam;
      const getNumericPrice = (p: any): number => {
        const val = (p?.price as any);
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const digits = val.replace(/\D/g, '');
          const n = Number(digits || '0');
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };
      const filtered = list.filter((p: any) => {
        // Category filter (server may not support)
        if (categoryValue) {
          const cat = (p?.category || '').toString().toLowerCase();
          if (categoryValue === 'vehicle' && cat !== 'vehicle') return false;
          if (categoryValue === 'battery' && cat !== 'battery') return false;
        }
        // Price range filter (server may not support)
        const price = getNumericPrice(p);
        if (typeof minPriceFilter === 'number' && price < minPriceFilter) return false;
        if (typeof maxPriceFilter === 'number' && price > maxPriceFilter) return false;
        // Text search fallback
        if (qLower) {
          const title = (p?.title || '').toString().toLowerCase();
          const brand = (p?.brand || '').toString().toLowerCase();
          const model = (p?.model || '').toString().toLowerCase();
          const spec = (p?.specifications?.batteryCapacity || '').toString().toLowerCase();
          const hay = `${title} ${brand} ${model} ${spec}`;
          if (!hay.includes(qLower)) return false;
        }
        return true;
      });
      setProducts(filtered);
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

  const applyFilters = () => {
    fetchProducts();
  };

  // Fetch wishlist items
  const fetchWishlist = async () => {
    if (!accessToken) return;
    
    try {
      const res = await fetch(`${API_URL}/api/profile/wishlist`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (res.ok) {
        const json = await res.json();
        console.log('HomeScreen Wishlist API Response:', json); // Debug log
        
        // API returns array directly, extract product IDs
        const wishlistItems = Array.isArray(json) ? json : (json.items || []);
        const productIds = wishlistItems.map((item: any) => item.productId || item._id);
        setWishlistItems(productIds);
      }
    } catch (e) {
      // Silently fail for wishlist
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
  }, [accessToken]);

  // Refresh wishlist when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchWishlist();
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    fetchProducts({ isRefresh: true });
    fetchWishlist();
  };

  const onSubmitSearch = () => {
    fetchProducts();
  };

  // Add/remove from wishlist
  const toggleWishlist = async (productId: string) => {
    if (!accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích');
      return;
    }

    if (wishlistLoading === productId) return; // Prevent multiple clicks

    const isInWishlist = wishlistItems.includes(productId);
    setWishlistLoading(productId);
    
    try {
      const res = await fetch(`${API_URL}/api/profile/wishlist${isInWishlist ? `/${productId}` : `/${productId}`}`, {
        method: isInWishlist ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: isInWishlist ? undefined : JSON.stringify({ productId }),
      });
      
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      
      if (res.ok) {
        if (isInWishlist) {
          setWishlistItems(prev => prev.filter(id => id !== productId));
        } else {
          setWishlistItems(prev => [...prev, productId]);
        }
      } else {
        const errorText = isInWishlist ? 'Không thể xóa sản phẩm khỏi danh sách yêu thích' : 'Không thể thêm sản phẩm vào danh sách yêu thích';
        Alert.alert('Lỗi', errorText);
      }
    } catch (e) {
      const errorText = isInWishlist ? 'Không thể xóa sản phẩm khỏi danh sách yêu thích' : 'Không thể thêm sản phẩm vào danh sách yêu thích';
      Alert.alert('Lỗi', errorText);
    } finally {
      setWishlistLoading(null);
    }
  };

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
    fetchProducts({ query: '' });
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
                onSubmitEditing={onSubmitSearch}
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
                onSubmitEditing={onSubmitSearch}
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
            <TouchableOpacity 
              key={category.id} 
              style={styles.categoryItem}
              onPress={() => {
                // Quick category mapping for vehicle/battery filters
                let nextCategory: '' | 'vehicle' | 'battery' = '';
                if (category.name.includes('Pin')) {
                  nextCategory = 'battery';
                } else if (category.name.includes('Xe')) {
                  nextCategory = 'vehicle';
                }
                setFilterCategory(nextCategory);
                fetchProducts({ category: nextCategory });
              }}
            >
              <View style={styles.categoryIcon}>
                <Ionicons name={category.icon as any} size={32} color="#FF6B35" />
              </View>
              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <View style={styles.priceInputs}>
            <View style={[styles.priceInputWrap, { marginRight: 8 }]}>
              <Text style={styles.priceLabel}>Giá từ</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={minPriceInput}
                onChangeText={handleMinPriceChange}
              />
            </View>
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceLabel}>Giá đến</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="10.000.000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={maxPriceInput}
                onChangeText={handleMaxPriceChange}
              />
            </View>
          </View>
          <View style={styles.typeChips}>
            <TouchableOpacity
              onPress={() => setFilterCategory(filterCategory === 'vehicle' ? '' : 'vehicle')}
              style={[styles.chip, filterCategory === 'vehicle' && styles.chipActive]}
            >
              <Text style={[styles.chipText, filterCategory === 'vehicle' && styles.chipTextActive]}>Xe điện</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterCategory(filterCategory === 'battery' ? '' : 'battery')}
              style={[styles.chip, filterCategory === 'battery' && styles.chipActive]}
            >
              <Text style={[styles.chipText, filterCategory === 'battery' && styles.chipTextActive]}>Pin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyFilters}
              style={styles.applyButton}
            >
              <Ionicons name="funnel-outline" size={16} color="#000" />
              <Text style={styles.applyButtonText}>Lọc</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          {isLoading && (
            <Text style={{ padding: 16, color: '#666' }}>Đang tải sản phẩm...</Text>
          )}
          {errorText && !isLoading && (
            <Text style={{ padding: 16, color: '#d00' }}>{errorText}</Text>
          )}
          {!isLoading && !errorText && products.map((product) => {
            // Kiểm tra priority: chỉ làm nổi bật sản phẩm có priorityLevel === "high"
            const isPriority = product.priorityLevel === 'high';
            
            return (
            <TouchableOpacity 
              key={product._id || product.id} 
              style={[styles.productItem, isPriority && styles.priorityProductItem]}
              onPress={() => (navigation as any).navigate('ProductDetail', { productId: product._id || product.id })}
            >
              {isPriority && (
                <View style={styles.priorityBadge}>
                  <Ionicons name="flash" size={12} color="#fff" />
                  <Text style={styles.priorityBadgeText}>Ưu tiên</Text>
                </View>
              )}
              <View style={styles.productImage}>
                {(() => {
                  const url = getFirstMediaUrl(product);
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
                  return <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />;
                })()}
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
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => toggleWishlist(product._id || product.id)}
                disabled={wishlistLoading === (product._id || product.id)}
              >
                <Ionicons 
                  name={wishlistItems.includes(product._id || product.id) ? "heart" : "heart-outline"} 
                  size={20} 
                  color={wishlistItems.includes(product._id || product.id) ? "#FF6B35" : "#999"} 
                />
                {wishlistLoading === (product._id || product.id) && (
                  <View style={styles.loadingOverlay}>
                    <Ionicons name="refresh" size={12} color="#FF6B35" />
                  </View>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
            );
          })}
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
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  priceInputs: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  priceInputWrap: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    color: '#000',
  },
  typeChips: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF8DC',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  applyButtonText: {
    marginLeft: 6,
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
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
    position: 'relative',
  },
  priorityProductItem: {
    borderWidth: 3,
    borderColor: '#FFD700',
    backgroundColor: '#FFF8DC',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
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
  loadingOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});