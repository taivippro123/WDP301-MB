import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Sample product data - in a real app, this would come from API or props
const sampleProducts = [
  { 
    id: 1, 
    title: 'Xe máy điện VinFast Klara A2', 
    price: '35,000,000 VNĐ', 
    location: 'Hà Nội',
    brand: 'VinFast',
    year: 2023,
    batteryCapacity: '48V 20Ah',
    batteryCondition: '95%',
    mileage: '1,200 km',
    installmentPrice: '9.98 triệu/tháng',
    description: 'Pin catl - bền bỉ, tối ưu hiệu suất, vận hành mạnh mẽ\n\nHệ thống treo thể thao mới - lái êm ái, thoải mái trên mọi cung đường\n\nCách âm đạt đỉnh - tách biệt khỏi thế giới ồn ào, tận hưởng không gian riêng tư tuyệt đối\n\nÂm thanh vòm 3d sống động - biến mọi hành trình thành một buổi trình diễn âm nhạc cá nhân',
    seller: {
      name: 'Nguyễn Văn A',
      phone: '093806****',
      location: 'Phường Hiệp Phú (Quận 9 cũ), Thành phố Thủ Đức, Tp Hồ Chí Minh',
      postTime: 'Đăng 1 tuần trước'
    },
    specs: {
      origin: 'Việt Nam',
      condition: 'Mới',
      manufacturer: 'VinFast',
      model: 'VF8',
      year: 2025,
      fuel: 'Điện',
      type: 'SUV / Cross over',
      seats: 5,
      weight: '> 1 tấn',
      payload: '> 2 tấn'
    },
    images: [
      require('../../assets/images/adaptive-icon.png'), // Placeholder images
      require('../../assets/images/adaptive-icon.png'),
      require('../../assets/images/adaptive-icon.png'),
    ]
  },
  { 
    id: 2, 
    title: 'Ô tô điện VinFast VF8', 
    price: '1,200,000,000 VNĐ', 
    location: 'TP.HCM',
    brand: 'VinFast',
    year: 2024,
    batteryCapacity: '87.7 kWh',
    batteryCondition: '98%',
    mileage: '5,000 km',
    installmentPrice: '99.8 triệu/tháng',
    description: 'Xe điện cao cấp với công nghệ tiên tiến, tiết kiệm năng lượng và thân thiện với môi trường.',
    seller: {
      name: 'Trần Thị B',
      phone: '091234****',
      location: 'Quận 1, TP.HCM',
      postTime: 'Đăng 3 ngày trước'
    },
    specs: {
      origin: 'Việt Nam',
      condition: 'Mới',
      manufacturer: 'VinFast',
      model: 'VF8',
      year: 2024,
      fuel: 'Điện',
      type: 'SUV / Cross over',
      seats: 7,
      weight: '> 2 tấn',
      payload: '> 2 tấn'
    },
    images: [
      require('../../assets/images/adaptive-icon.png'),
      require('../../assets/images/adaptive-icon.png'),
      require('../../assets/images/adaptive-icon.png'),
    ]
  },
];

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = (route.params as { productId: number }) || { productId: 1 };
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollViewRef = useRef<ScrollView>(null);

  // Find product by ID or use first product as default
  const product = sampleProducts.find(p => p.id === productId) || sampleProducts[0];

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
      `Số điện thoại: ${product.seller.phone}\n\nBạn có muốn gọi điện cho người bán không?`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Gọi ngay',
          onPress: () => {
            const phoneUrl = `tel:${product.seller.phone.replace(/\*/g, '')}`;
            Linking.openURL(phoneUrl).catch(err => {
              Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
            });
          }
        }
      ]
    );
  };

  const handleChatPress = () => {
    // Navigate directly to chat screen
    (navigation as any).navigate('Chat');
  };

  const handlePhonePress = () => {
    const phoneUrl = `tel:${product.seller.phone.replace(/\*/g, '')}`;
    Linking.openURL(phoneUrl).catch(err => {
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
    });
  };

  const handleZaloPress = () => {
    // In a real app, this would open Zalo
    console.log('Opening Zalo chat');
  };

  return (
    <View style={styles.container}>
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
            {product.images.map((image, index) => (
              <View key={index} style={styles.imageSlide}>
                <Image source={image} style={styles.productImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
          
          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1}/{product.images.length}
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
          <Text style={styles.productPrice}>{product.price}</Text>
          <Text style={styles.installmentPrice}>
            (Trả góp từ {product.installmentPrice})
          </Text>
          
          {/* Key Features */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
            <Text style={styles.featuresSubtitle}>Đẳng cấp đến từ sự khác biệt</Text>
            
            <View style={styles.featuresList}>
              {product.description.split('\n\n').map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="diamond" size={12} color="#4A90E2" style={styles.featureIcon} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Seller Contact */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{product.seller.name}</Text>
                <TouchableOpacity onPress={handlePhonePress}>
                  <Text style={styles.sellerPhone}>{product.seller.phone}</Text>
                </TouchableOpacity>
                <Text style={styles.sellerLocation}>{product.seller.location}</Text>
                <Text style={styles.postTime}>{product.seller.postTime}</Text>
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
              <Text style={styles.specSectionTitle}>Tình trạng xe</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Xuất xứ</Text>
                <Text style={styles.specValue}>{product.specs.origin}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Tình trạng</Text>
                <Text style={styles.specValue}>{product.specs.condition}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Chính sách bảo hành</Text>
                <Text style={styles.specValue}>Bảo hành hãng</Text>
              </View>
            </View>

            <View style={styles.specSection}>
              <Text style={styles.specSectionTitle}>Thông số kỹ thuật</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Hãng xe</Text>
                <Text style={styles.specValue}>{product.specs.manufacturer}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Dòng xe</Text>
                <Text style={styles.specValue}>{product.specs.model}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Năm sản xuất</Text>
                <Text style={styles.specValue}>{product.specs.year}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Nhiên liệu</Text>
                <Text style={styles.specValue}>{product.specs.fuel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Kiểu dáng</Text>
                <Text style={styles.specValue}>{product.specs.type}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Số chỗ</Text>
                <Text style={styles.specValue}>{product.specs.seats}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Trọng lượng</Text>
                <Text style={styles.specValue}>{product.specs.weight}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Trọng tải</Text>
                <Text style={styles.specValue}>{product.specs.payload}</Text>
              </View>
            </View>
          </View>


          {/* Spacing for bottom buttons */}
          <View style={styles.bottomSpacing} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zaloButton} onPress={handleZaloPress}>
          <Text style={styles.zaloButtonText}>Zalo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
          <Ionicons name="call" size={20} color="#fff" style={styles.callIcon} />
          <Text style={styles.callButtonText}>Gọi</Text>
        </TouchableOpacity>
      </View>
    </View>
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

