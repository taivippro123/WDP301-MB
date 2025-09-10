import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const compactOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);
  const compactSearchInputRef = useRef(null);
  
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

  const products = [
    { 
      id: 1, 
      title: 'Xe máy điện VinFast Klara A2', 
      price: '35,000,000 VNĐ', 
      location: 'Hà Nội',
      brand: 'VinFast',
      year: 2023,
      batteryCapacity: '48V 20Ah',
      batteryCondition: '95%',
      mileage: '1,200 km'
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
      mileage: '5,000 km'
    },
    { 
      id: 3, 
      title: 'Pin xe máy điện Lithium 60V 32Ah', 
      price: '8,500,000 VNĐ', 
      location: 'Đà Nẵng',
      brand: 'Samsung',
      year: 2023,
      batteryCapacity: '60V 32Ah',
      batteryCondition: '90%',
      mileage: 'N/A'
    },
    { 
      id: 4, 
      title: 'Xe đạp điện Yamaha PAS', 
      price: '18,000,000 VNĐ', 
      location: 'Hà Nội',
      brand: 'Yamaha',
      year: 2022,
      batteryCapacity: '36V 15Ah',
      batteryCondition: '85%',
      mileage: '3,500 km'
    },
    { 
      id: 5, 
      title: 'Xe máy điện Honda PCX Electric', 
      price: '75,000,000 VNĐ', 
      location: 'Hà Nội',
      brand: 'Honda',
      year: 2024,
      batteryCapacity: '50.4V 30Ah',
      batteryCondition: '100%',
      mileage: '500 km'
    },
    { 
      id: 6, 
      title: 'Pin ô tô điện Tesla Model 3', 
      price: '450,000,000 VNĐ', 
      location: 'TP.HCM',
      brand: 'Tesla',
      year: 2023,
      batteryCapacity: '75 kWh',
      batteryCondition: '92%',
      mileage: 'N/A'
    },
    { 
      id: 7, 
      title: 'Xe tải điện Hyundai Porter Electric', 
      price: '850,000,000 VNĐ', 
      location: 'Đà Nẵng',
      brand: 'Hyundai',
      year: 2023,
      batteryCapacity: '72.6 kWh',
      batteryCondition: '96%',
      mileage: '8,000 km'
    },
    { 
      id: 8, 
      title: 'Xe đạp điện Giant Explore E+', 
      price: '45,000,000 VNĐ', 
      location: 'Hải Phòng',
      brand: 'Giant',
      year: 2023,
      batteryCapacity: '36V 17.5Ah',
      batteryCondition: '88%',
      mileage: '2,800 km'
    },
    { 
      id: 9, 
      title: 'Pin xe máy điện LiFePO4 72V 40Ah', 
      price: '12,500,000 VNĐ', 
      location: 'Cần Thơ',
      brand: 'BYD',
      year: 2024,
      batteryCapacity: '72V 40Ah',
      batteryCondition: '100%',
      mileage: 'N/A'
    },
    { 
      id: 10, 
      title: 'Xe máy điện Pega Cap A Plus', 
      price: '28,000,000 VNĐ', 
      location: 'Vũng Tàu',
      brand: 'Pega',
      year: 2022,
      batteryCapacity: '60V 28Ah',
      batteryCondition: '85%',
      mileage: '4,200 km'
    },
    { 
      id: 11, 
      title: 'Ô tô điện BYD Tang EV', 
      price: '1,890,000,000 VNĐ', 
      location: 'Hà Nội',
      brand: 'BYD',
      year: 2024,
      batteryCapacity: '108.8 kWh',
      batteryCondition: '99%',
      mileage: '2,500 km'
    },
    { 
      id: 12, 
      title: 'Xe đạp điện Merida eONE-SIXTY', 
      price: '85,000,000 VNĐ', 
      location: 'TP.HCM',
      brand: 'Merida',
      year: 2023,
      batteryCapacity: '36V 21Ah',
      batteryCondition: '94%',
      mileage: '1,800 km'
    },
  ];

  const tabs = ['Dành cho bạn', 'Gần bạn', 'Mới nhất'];

  // Chiều cao header khi đầy đủ
  const HEADER_MAX_HEIGHT = 220;
  const HEADER_MIN_HEIGHT = 70; // Chiều cao compact search
  const SCROLL_THRESHOLD = 120;

  const handleScroll = (event) => {
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
              <TouchableOpacity style={styles.headerIcon}>
                <Ionicons name="heart-outline" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon}>
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
          <TouchableOpacity style={styles.compactIcon}>
            <Ionicons name="heart-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactIcon}>
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
          {products.map((product) => (
            <TouchableOpacity 
              key={product.id} 
              style={styles.productItem}
              onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
            >
              <View style={styles.productImage}>
                <Ionicons name="image-outline" size={40} color="#ccc" />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                <Text style={styles.productPrice}>{product.price}</Text>
                <View style={styles.productDetails}>
                  <Text style={styles.productDetail}>{product.brand} • {product.year}</Text>
                  <Text style={styles.productDetail}>Pin: {product.batteryCapacity}</Text>
                  <Text style={styles.productDetail}>Tình trạng: {product.batteryCondition}</Text>
                  {product.mileage !== 'N/A' && (
                    <Text style={styles.productDetail}>Đã đi: {product.mileage}</Text>
                  )}
                </View>
                <Text style={styles.productLocation}>{product.location}</Text>
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