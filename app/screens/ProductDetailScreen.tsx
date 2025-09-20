import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

const { width, height } = Dimensions.get('window');

type Product = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  brand?: string;
  model?: string;
  year?: number;
  condition?: string;
  images: string[];
  seller?: { _id: string; name: string; email: string; phone?: string; avatar?: string };
  location?: { city?: string; province?: string; address?: string } | string;
  specifications?: {
    batteryCapacity?: string;
    range?: string;
    chargingTime?: string;
    power?: string;
    weight?: string;
    dimensions?: string;
  };
};

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = (route.params as { productId: string }) || { productId: '' };
  const { accessToken, user, logout } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isFeeModalVisible, setIsFeeModalVisible] = useState(false);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollViewRef = useRef<ScrollView>(null);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  
  React.useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      setIsLoading(true);
      setErrorText(null);
      try {
        const res = await fetch(`${API_URL}/api/products/${productId}`);
        if (res.status === 401) {
          await logout();
          (navigation as any).navigate('Tài khoản');
          return;
        }
        const json = await res.json();
        const p: Product = json.product || json;
        if (mounted) setProduct(p);
      } catch (e) {
        if (mounted) setErrorText('Không tải được sản phẩm');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    if (productId) fetchProduct();
    return () => { mounted = false; };
  }, [productId]);

  const imageUrls = (product?.images || []).map((u: any) => ({ url: typeof u === 'string' ? u : (u?.url || u?.secure_url) }));

  const isVideoUrl = (url?: string | null) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return /(\.mp4|\.mov|\.m4v|\.webm|\.ogg)(\?|$)/.test(u) || u.includes('/video/upload');
  };

  const mediaItems: { type: 'image' | 'video'; url: string }[] = (() => {
    const imgs: any[] = Array.isArray(product?.images) ? product!.images : [];
    const vids: any[] = Array.isArray((product as any)?.videos) ? (product as any).videos : [];
    const toUrl = (x: any) => (typeof x === 'string' ? x : (x?.url || x?.secure_url));
    const imgItems = imgs
      .map((x: any) => {
        const url = toUrl(x);
        const type = isVideoUrl(url) ? 'video' : 'image';
        return { type, url } as { type: 'image' | 'video'; url: string };
      })
      .filter((m: any) => !!m.url);
    const vidItems = vids.map((x: any) => ({ type: 'video' as const, url: toUrl(x) })).filter((m: any) => !!m.url);
    // Put images first, then explicit videos (some images may already be videos by detection)
    return [...imgItems, ...vidItems];
  })();

  const getVideoPoster = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      if (!url.includes('/upload/')) return undefined;
      // Force resource type to /video/upload for video frame extraction
      const urlFixedType = url.replace('/image/upload/', '/video/upload/');
      const [left, rightOrig] = urlFixedType.split('/upload/');
      const right = rightOrig || '';
      // Insert so_0 as a chained transformation if not present
      const hasSo = right.startsWith('so_') || right.includes('/so_') || right.includes(',so_');
      const rightWithSo = hasSo ? right : `so_0/${right}`;
      const recomposed = `${left}/upload/${rightWithSo}`;
      // Ensure .jpg extension and keep any query string
      const poster = recomposed.replace(/\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i, '.jpg$2');
      return poster;
    } catch {
      return undefined;
    }
  };

  const getPlayableVideoUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      const isCloudinary = /res\.cloudinary\.com|\.cloudinary\.com/.test(url);
      if (!isCloudinary) return url;
      const withCodec = url.replace('/upload/', '/upload/f_mp4,vc_h264,ac_aac/');
      if (!/\.mp4(\?|$)/i.test(withCodec)) {
        return withCodec.replace(/(\/v\d+\/[^.?]+)(\?.*)?$/i, '$1.mp4$2');
      }
      return withCodec;
    } catch {
      return url || undefined;
    }
  };

  const playableUrl = React.useMemo(() => {
    const u = getPlayableVideoUrl(currentVideoUrl) || '';
    try { console.log('ProductDetail: playableUrl =', u); } catch {}
    return u;
  }, [currentVideoUrl]);
  const player = useVideoPlayer(playableUrl);
  React.useEffect(() => {
    try {
      const poster = getVideoPoster(currentVideoUrl);
      console.log('ProductDetail: posterUrl =', poster);
    } catch {}
    try {
      if (isVideoModalVisible && playableUrl) {
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [isVideoModalVisible, playableUrl]);

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '';
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    } catch {
      return `${price} VNĐ`;
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleImageScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentImageIndex(index);
  };

  const handleCallPress = () => {
    Alert.alert(
      'Gọi điện thoại',
      `Số điện thoại: ${product?.seller?.phone || 'N/A'}\n\nBạn có muốn gọi điện cho người bán không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gọi ngay',
          onPress: () => {
            const phoneUrl = `tel:${(product?.seller?.phone || '').replace(/\*/g, '')}`;
            Linking.openURL(phoneUrl).catch(() => {
              Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
            });
          }
        }
      ]
    );
  };

  const handlePhonePress = () => {
    const phoneUrl = `tel:${(product?.seller?.phone || '').replace(/\*/g, '')}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
    });
  };

  const fetchBuyerAddress = async (): Promise<any | null> => {
    try {
      const cached: any = (user as any)?.profile?.address;
      if (cached?.districtCode && cached?.wardCode) return cached;
      if (!accessToken) return null;
      const res = await fetch(`${API_URL}/api/profile/profile`, {
        headers: { 'Accept': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.profile?.address || null;
    } catch {
      return null;
    }
  };

  const handleBuyPress = async () => {
    try {
      if (isCalculatingFee || isCreatingOrder) return;
      setIsCalculatingFee(true);
      if (!product) return;
      const sellerAddr: any = (product as any)?.seller?.profile?.address || (product as any)?.seller?.address;
      let buyerAddr: any = (user as any)?.profile?.address;
      if (!buyerAddr?.districtCode || !buyerAddr?.wardCode) {
        buyerAddr = await fetchBuyerAddress();
      }
      if (!sellerAddr?.districtCode || !sellerAddr?.wardCode) {
        Alert.alert('Lỗi', 'Thiếu địa chỉ người bán (mã quận/huyện hoặc phường/xã).');
        return;
      }
      if (!buyerAddr?.districtCode || !buyerAddr?.wardCode) {
        Alert.alert('Lỗi', 'Vui lòng cập nhật địa chỉ của bạn trong hồ sơ trước khi mua.');
        return;
      }

      const payload = {
        service_type_id: 2,
        from_district_id: Number(sellerAddr.districtCode) || 0,
        from_ward_code: String(sellerAddr.wardCode || ''),
        to_district_id: Number(buyerAddr.districtCode) || 0,
        to_ward_code: String(buyerAddr.wardCode || ''),
        length: (product as any)?.length || 30,
        width: (product as any)?.width || 40,
        height: (product as any)?.height || 20,
        weight: (product as any)?.weight || 3000,
        insurance_value: 0,
        cod_value: 0,
        coupon: null as any
      };

      const res = await fetch(`${API_URL}/api/shipping/fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
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
        const msg = data?.error || data?.message || (typeof data === 'string' ? data : 'Không tính được phí ship');
        throw new Error(msg);
      }
      const feeData = data?.data || data;
      const totalFee = Number(feeData?.total ?? feeData?.service_fee ?? feeData?.fee ?? 0);
      setShippingFee(totalFee);
      setIsFeeModalVisible(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tính phí vận chuyển');
    }
    finally {
      setIsCalculatingFee(false);
    }
  };

  const fetchBuyerProfile = async (): Promise<any | null> => {
    try {
      if (!accessToken) return null;
      const res = await fetch(`${API_URL}/api/profile/profile`, {
        headers: { 'Accept': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json || null;
    } catch {
      return null;
    }
  };

  const createOrder = async () => {
    try {
      if (!shippingFee || Number(shippingFee) <= 0) {
        Alert.alert('Lỗi', 'Phí vận chuyển không hợp lệ. Vui lòng tính phí trước.');
        return;
      }
      if (isCreatingOrder || isCalculatingFee) return;
      setIsCreatingOrder(true);
      if (!product) return;
      const sellerAddr: any = (product as any)?.seller?.profile?.address || (product as any)?.seller?.address || {};

      // Always refresh buyer profile to get name/phone/address
      const profile = await fetchBuyerProfile();
      const buyerAddr: any = profile?.profile?.address || {};
      const to_name = (profile?.name as any) || (user as any)?.name || '';
      const to_phone = (profile?.phone as any) || '';
      const to_address = buyerAddr?.houseNumber || '';
      const to_ward_name = buyerAddr?.ward || '';
      const to_district_name = buyerAddr?.district || '';
      const to_province_name = buyerAddr?.province || '';

      // Validate required receiver fields with explicit missing list
      const missing: string[] = [];
      if (!to_name.trim()) missing.push('Họ tên người nhận');
      if (!to_phone.trim()) missing.push('SĐT người nhận');
      if (!to_address.trim()) missing.push('Địa chỉ người nhận');
      if (!to_ward_name.trim()) missing.push('Phường/Xã người nhận');
      if (!to_district_name.trim()) missing.push('Quận/Huyện người nhận');
      if (!to_province_name.trim()) missing.push('Tỉnh/Thành người nhận');
      if (missing.length > 0) {
        Alert.alert('Thiếu thông tin', `Vui lòng bổ sung:\n- ${missing.join('\n- ')}`);
        return;
      }

      const body: any = {
        // Receiver (required)
        to_name: to_name.trim(),
        to_phone: to_phone.trim(),
        to_address: to_address.trim(),
        to_ward_name: to_ward_name.trim(),
        to_district_name: to_district_name.trim(),
        to_province_name: to_province_name.trim(),
        // Package
        length: (product as any)?.length || 30,
        width: (product as any)?.width || 40,
        height: (product as any)?.height || 20,
        weight: (product as any)?.weight || 3000,
        service_type_id: 2,
        payment_type_id: 2,
        insurance_value: 0,
        cod_amount: 0,
        required_note: 'KHONGCHOXEMHANG',
        // Product content/name for GHN
        content: (product as any)?.title || 'Hàng hóa',
        // Commerce fields for server wallet check and order creation
        product_id: (product as any)?._id,
        seller_id: (product as any)?.seller?._id,
        unit_price: Number((product as any)?.price) || 0,
        shipping_fee: Number(shippingFee) || 0,
        items: [
          {
            name: (product as any)?.title || 'Hàng hóa',
            code: (product as any)?._id || undefined,
            quantity: 1,
            price: Number((product as any)?.price) || 0,
            length: (product as any)?.length || undefined,
            width: (product as any)?.width || undefined,
            height: (product as any)?.height || undefined,
            weight: (product as any)?.weight || undefined,
            category: { level1: (product as any)?.category || undefined }
          }
        ],
      };

      // Sender (optional) - only include if present to avoid nulls
      const from_name = (product as any)?.seller?.name;
      const from_phone = (product as any)?.seller?.phone;
      const from_address = sellerAddr?.houseNumber;
      const from_ward_name = sellerAddr?.ward;
      const from_district_name = sellerAddr?.district;
      const from_province_name = sellerAddr?.province;
      if (from_name) body.from_name = from_name;
      if (from_phone) body.from_phone = from_phone;
      if (from_address) body.from_address = from_address;
      if (from_ward_name) body.from_ward_name = from_ward_name;
      if (from_district_name) body.from_district_name = from_district_name;
      if (from_province_name) body.from_province_name = from_province_name;

      const res = await fetch(`${API_URL}/api/shipping/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
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
        const msg = data?.error || data?.message || (typeof data === 'string' ? data : 'Không thể tạo đơn hàng');
        throw new Error(msg);
      }
      const order = data?.data || data;
      setIsFeeModalVisible(false);
      Alert.alert('Thành công', `Đã tạo đơn hàng. Mã: ${order?.order_code || order?.data?.order_code || 'N/A'}`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo đơn hàng');
    }
    finally {
      setIsCreatingOrder(false);
    }
  };

  const handleChatPress = async () => {
    try {
      if (!product?._id || !product?.seller?._id) {
        Alert.alert('Lỗi', 'Thiếu thông tin sản phẩm hoặc người bán');
        return;
      }
      const res = await fetch(`${API_URL}/api/chat/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ productId: product._id, sellerId: product.seller._id }),
        });
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();
      let data: any;
      try {
        data = contentType.includes('application/json') ? JSON.parse(raw) : JSON.parse(raw);
      } catch {
        throw new Error(raw?.slice(0, 200) || 'Server returned non-JSON');
      }
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể bắt đầu cuộc trò chuyện');
      }
      const conversationId = data.conversationId || data._id || data.id || data.conversation?._id;
      try {
        await AsyncStorage.setItem('pending_conversation_id', conversationId || '');
        await AsyncStorage.setItem('pending_conversation_peer_name', product.seller?.name || '');
      } catch {}
      (navigation as any).navigate('Chat', { conversationId, peerName: product.seller?.name });
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể mở chat');
    }
  };

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    setIsImageViewerVisible(true);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={{ padding: 16 }}>Đang tải sản phẩm...</Text>
      </View>
    );
  }

  if (errorText || !product) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={{ padding: 16 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={{ paddingHorizontal: 16, color: '#d00' }}>{errorText || 'Không tìm thấy sản phẩm'}</Text>
      </View>
    );
  }

  const isOwner = !!(user?._id && product?.seller?._id && user._id === product.seller._id);

  return (
    <View style={styles.container}>
      {/* Image Viewer Modal */}
      <Modal visible={isImageViewerVisible} transparent={true}>
        <ImageViewer
          imageUrls={imageUrls}
          index={currentImageIndex}
          onCancel={() => setIsImageViewerVisible(false)}
          enableSwipeDown
          onSwipeDown={() => setIsImageViewerVisible(false)}
          renderHeader={() => (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsImageViewerVisible(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        />
      </Modal>

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.title}
        </Text>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => setIsFavorited(!isFavorited)}
        >
          <Ionicons 
            name={isFavorited ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorited ? "#FF6B35" : "#000"} 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Floating Back Button */}
      <TouchableOpacity 
        style={styles.floatingBackButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Floating Share Button */}
      <TouchableOpacity style={styles.floatingShareButton}>
        <Ionicons name="share-outline" size={24} color="#fff" />
      </TouchableOpacity>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            ref={imageScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
          >
            {(mediaItems.length > 0 ? mediaItems : [{ type: 'image', url: null } as any]).map((m: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={styles.imageSlide}
                onPress={() => {
                  if (m?.type === 'image' && m?.url) return handleImagePress(index);
                  if (m?.type === 'video' && m?.url) {
                    setCurrentVideoUrl(m.url);
                    setIsVideoModalVisible(true);
                  }
                }}
                activeOpacity={0.9}
              >
                {m?.type === 'video' && m?.url ? (
                  <View style={[styles.productImage, { overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}> 
                    {(() => { const p = getVideoPoster(m.url); return p ? <Image source={{ uri: p }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null; })()}
                    <View style={{ position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="play" size={28} color="#fff" />
                    </View>
                  </View>
                ) : m?.url ? (
                  <Image source={{ uri: m.url }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={48} color="#bbb" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {Math.min(currentImageIndex + 1, mediaItems.length || 1)}/{mediaItems.length || 1}
            </Text>
          </View>

          {/* Image Dots */}
          <View style={styles.dotsContainer}>
            {(mediaItems.length > 0 ? mediaItems : [0]).map((_: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentImageIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</Text>
          
          {/* Key Features */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
            
            <View style={styles.featuresList}>
              {(product.description ? product.description.split('\n\n') : []).map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="diamond" size={12} color="#4A90E2" style={styles.featureIcon} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Seller Contact */}
          {!isOwner && (
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Thông tin người bán</Text>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{product.seller?.name || 'Người bán'}</Text>
                <TouchableOpacity onPress={handlePhonePress}>
                  <Text style={styles.sellerPhone}>{product.seller?.phone || '---'}</Text>
                </TouchableOpacity>
                <Text style={styles.sellerLocation}>{(() => {
                  const addr = (product as any)?.seller?.profile?.address || (product as any)?.seller?.address;
                  if (addr && (addr.province || addr.district || addr.ward || addr.houseNumber)) {
                    const parts = [addr.houseNumber, addr.ward, addr.district, addr.province].filter(Boolean);
                    return parts.join(', ');
                  }
                  if (typeof product.location === 'string') return product.location as any;
                  if (product.location && typeof product.location === 'object') {
                    const a: any = product.location;
                    const parts = [a.address, a.city, a.province].filter(Boolean);
                    return parts.join(', ');
                  }
                  return '';
                })()}</Text>
              </View>
              <View style={styles.sellerActions}>
              <TouchableOpacity style={styles.chatIconButton} onPress={handleChatPress}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
                <TouchableOpacity style={styles.buyInlineButton} onPress={handleBuyPress}>
                  <Ionicons name="cart" size={20} color="#fff" />
                  <Text style={styles.buyInlineText}>Mua</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
          )}

          {/* Vehicle Info */}
          <View style={styles.vehicleInfoContainer}>
            <Text style={styles.sectionTitle}>Thông số chi tiết</Text>
            
            <View style={styles.specSection}>
              <Text style={styles.specSectionTitle}>Tổng quan</Text>
              {!!product.brand && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Thương hiệu</Text>
                  <Text style={styles.specValue}>{product.brand}</Text>
                </View>
              )}
              {!!product.model && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Mẫu</Text>
                  <Text style={styles.specValue}>{product.model}</Text>
                </View>
              )}
              {!!product.year && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Năm</Text>
                  <Text style={styles.specValue}>{product.year}</Text>
                </View>
              )}
              {!!product.condition && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Tình trạng</Text>
                  <Text style={styles.specValue}>{product.condition}</Text>
                </View>
              )}
            </View>

            <View style={styles.specSection}>
              <Text style={styles.specSectionTitle}>Thông số kỹ thuật</Text>
              {!!product.specifications?.batteryCapacity && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Dung lượng pin</Text>
                  <Text style={styles.specValue}>{product.specifications.batteryCapacity}</Text>
                </View>
              )}
              {!!product.specifications?.range && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Quãng đường</Text>
                  <Text style={styles.specValue}>{product.specifications.range}</Text>
                </View>
              )}
              {!!product.specifications?.chargingTime && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Thời gian sạc</Text>
                  <Text style={styles.specValue}>{product.specifications.chargingTime}</Text>
                </View>
              )}
              {!!product.specifications?.power && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Công suất</Text>
                  <Text style={styles.specValue}>{product.specifications.power}</Text>
                </View>
              )}
              {/* Shipping dimensions/weight at top-level */}
              {typeof (product as any)?.length === 'number' && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Chiều dài</Text>
                  <Text style={styles.specValue}>{(product as any).length} cm</Text>
                </View>
              )}
              {typeof (product as any)?.width === 'number' && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Chiều rộng</Text>
                  <Text style={styles.specValue}>{(product as any).width} cm</Text>
                </View>
              )}
              {typeof (product as any)?.height === 'number' && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Chiều cao</Text>
                  <Text style={styles.specValue}>{(product as any).height} cm</Text>
                </View>
              )}
              {typeof (product as any)?.weight === 'number' && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Khối lượng</Text>
                  <Text style={styles.specValue}>{(product as any).weight} g</Text>
                </View>
              )}
            </View>
          </View>


          {/* Spacing for bottom buttons */}
          <View style={styles.bottomSpacing} />
        </View>
      </Animated.ScrollView>
      {/* Shipping fee confirmation modal */}
      <Modal visible={isFeeModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 8 }}>Xác nhận phí vận chuyển</Text>
            <Text style={{ fontSize: 14, color: '#333', marginBottom: 16 }}>
              Tổng phí: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(shippingFee) || 0)}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity disabled={isCreatingOrder} onPress={() => setIsFeeModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, marginRight: 8, opacity: isCreatingOrder ? 0.6 : 1 }}>
                <Text style={{ color: '#666', fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isCreatingOrder} onPress={createOrder} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFD700', borderRadius: 8, flexDirection: 'row', alignItems: 'center', opacity: isCreatingOrder ? 0.7 : 1 }}>
                {isCreatingOrder ? <ActivityIndicator size="small" color="#000" /> : null}
                <Text style={{ color: '#000', fontWeight: '700', marginLeft: isCreatingOrder ? 8 : 0 }}>Mua</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Player Modal */}
      <Modal visible={isVideoModalVisible} transparent animationType="fade" onRequestClose={() => setIsVideoModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, padding: 8 }} onPress={() => setIsVideoModalVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: '100%', aspectRatio: 9/16, maxWidth: 600, justifyContent: 'center', alignItems: 'center' }}>
            {currentVideoUrl ? (
              <>
                {(() => { const p = getVideoPoster(currentVideoUrl); return (
                  <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
                    {p ? <Image source={{ uri: p }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                  </View>
                ); })()}
                <VideoView
                  player={player}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  nativeControls
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingTop: 10,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
    marginRight: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  floatingShareButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
    position: 'relative',
    paddingTop: 10,
  },
  imageSlide: {
    width: width,
    height: 300,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 20,
  },
  productInfo: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    lineHeight: 28,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  installmentPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  featuresSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  sellerContainer: {
    marginBottom: 24,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sellerPhone: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 4,
    textDecorationLine: 'underline',
  },
  sellerLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  chatIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  sellerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e67e22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  buyInlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  vehicleInfoContainer: {
    marginBottom: 24,
  },
  specSection: {
    marginBottom: 20,
  },
  specSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  specLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
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
  buyButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  zaloButton: {
    flex: 1,
    backgroundColor: '#0084ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  zaloButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: {
    marginRight: 8,
  },
  callButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
});

