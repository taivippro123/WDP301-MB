import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import {
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
  const { accessToken } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollViewRef = useRef<ScrollView>(null);
  
  React.useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      setIsLoading(true);
      setErrorText(null);
      try {
        const res = await fetch(`${API_URL}/api/products/${productId}`);
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

  const imageUrls = (product?.images || []).map((u) => ({ url: u }));

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
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Gọi ngay',
          onPress: () => {
            const phoneUrl = `tel:${(product?.seller?.phone || '').replace(/\*/g, '')}`;
            Linking.openURL(phoneUrl).catch(err => {
              Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
            });
          }
        }
      ]
    );
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

  const handlePhonePress = () => {
    const phoneUrl = `tel:${(product?.seller?.phone || '').replace(/\*/g, '')}`;
    Linking.openURL(phoneUrl).catch(err => {
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
    });
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
            {(product.images && product.images.length > 0 ? product.images : [null]).map((image, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.imageSlide}
                onPress={() => handleImagePress(index)}
              >
                {image ? (
                  <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
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
              {Math.min(currentImageIndex + 1, product.images?.length || 1)}/{product.images?.length || 1}
            </Text>
          </View>

          {/* Image Dots */}
          <View style={styles.dotsContainer}>
            {product.images.map((_, index) => (
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
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Thông tin người bán</Text>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{product.seller?.name || 'Người bán'}</Text>
                <TouchableOpacity onPress={handlePhonePress}>
                  <Text style={styles.sellerPhone}>{product.seller?.phone || '---'}</Text>
                </TouchableOpacity>
                <Text style={styles.sellerLocation}>
                  {typeof product.location === 'string' ? product.location : `${product.location?.address || ''}${product.location?.city ? `, ${product.location.city}` : ''}${product.location?.province ? `, ${product.location.province}` : ''}`}
                </Text>
              </View>
              <TouchableOpacity style={styles.chatIconButton} onPress={handleChatPress}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>

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
              {!!product.specifications?.weight && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Khối lượng</Text>
                  <Text style={styles.specValue}>{product.specifications.weight}</Text>
                </View>
              )}
              {!!product.specifications?.dimensions && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Kích thước</Text>
                  <Text style={styles.specValue}>{product.specifications.dimensions}</Text>
                </View>
              )}
            </View>
          </View>


          {/* Spacing for bottom buttons */}
          <View style={styles.bottomSpacing} />
        </View>
      </Animated.ScrollView>
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

