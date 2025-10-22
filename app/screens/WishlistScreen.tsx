import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../config/api";
import { useAuth } from "../AuthContext";

interface WishlistItem {
  _id: string;
  userId: string;
  productId: string;
  addedAt: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Product {
  _id: string;
  title: string;
  price: number;
  location?: any;
  brand?: string;
  year?: number;
  images?: string[];
  isAvailable?: boolean;
  condition?: string;
  specifications?: {
    batteryCapacity?: string;
    mileage?: string;
  };
  seller?: {
    address?: {
      province?: string;
      city?: string;
    };
  };
}

interface WishlistProduct extends WishlistItem {
  product: Product;
}

// Mock data removed - will use API data

export default function WishlistScreen() {
  const navigation = useNavigation();
  const { accessToken, logout } = useAuth();
  const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortFilter, setSortFilter] = useState<
    "all" | "available" | "sold_out"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Fetch wishlist from API
  const fetchWishlist = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setErrorText(null);
    try {
      // First, get wishlist items
      const wishlistRes = await fetch(`${API_URL}/api/profile/wishlist`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (wishlistRes.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      
      if (!wishlistRes.ok) {
        setErrorText('Không tải được danh sách yêu thích');
        return;
      }
      
      const wishlistJson = await wishlistRes.json();
      console.log('Wishlist API Response:', wishlistJson); // Debug log
      
      // API returns array directly, not wrapped in items property
      const wishlistItems = Array.isArray(wishlistJson) ? wishlistJson : (wishlistJson.items || []);
      
      if (wishlistItems.length === 0) {
        setWishlistProducts([]);
        return;
      }
      
      // Since API returns products directly, we don't need to fetch products separately
      const wishlistWithProducts = wishlistItems.map((product: any) => ({
        _id: `wishlist_${product._id}`,
        userId: 'current_user', // This would come from auth context
        productId: product._id,
        addedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __v: 0,
        product: product
      }));
      
      setWishlistProducts(wishlistWithProducts);
    } catch (e) {
      setErrorText('Không tải được danh sách yêu thích');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [accessToken]);

  const handleProductPress = (productId: string) => {
    if (isSelectionMode) {
      toggleSelection(productId);
    } else {
      (navigation as any).navigate("ProductDetail", { productId });
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    Alert.alert(
      "Xóa khỏi danh sách yêu thích",
      "Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/profile/wishlist/${productId}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (res.status === 401) {
                await logout();
                (navigation as any).navigate('Tài khoản');
                return;
              }
              
              if (res.ok) {
                setWishlistProducts((prev) =>
                  prev.filter((item) => item.productId !== productId)
                );
                setSelectedItems((prev) => prev.filter((id) => id !== productId));
              } else {
                Alert.alert('Lỗi', 'Không thể xóa sản phẩm khỏi danh sách yêu thích');
              }
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể xóa sản phẩm khỏi danh sách yêu thích');
            }
          },
        },
      ]
    );
  };

  const handleRemoveSelected = () => {
    Alert.alert(
      "Xóa sản phẩm đã chọn",
      `Bạn có chắc chắn muốn xóa ${selectedItems.length} sản phẩm đã chọn khỏi danh sách yêu thích?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove all selected items
              const deletePromises = selectedItems.map(productId =>
                fetch(`${API_URL}/api/profile/wishlist/${productId}`, {
                  method: 'DELETE',
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                  },
                })
              );
              
              const results = await Promise.all(deletePromises);
              const failedDeletes = results.filter(res => !res.ok);
              
              if (failedDeletes.length === 0) {
                setWishlistProducts((prev) =>
                  prev.filter((item) => !selectedItems.includes(item.productId))
                );
                setSelectedItems([]);
                setIsSelectionMode(false);
              } else {
                Alert.alert('Lỗi', 'Một số sản phẩm không thể xóa');
              }
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể xóa sản phẩm đã chọn');
            }
          },
        },
      ]
    );
  };

  const handleSelectAll = () => {
    const filteredProducts = getFilteredProducts();
    if (selectedItems.length === filteredProducts.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredProducts.map((item) => item.productId));
    }
  };

  const getFilteredProducts = () => {
    switch (sortFilter) {
      case "available":
        return wishlistProducts.filter((item) => item.product?.isAvailable !== false);
      case "sold_out":
        return wishlistProducts.filter((item) => item.product?.isAvailable === false);
      default:
        return wishlistProducts;
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '';
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    } catch {
      return `${price} VNĐ`;
    }
  };

  // Helper function to convert UTC to Vietnam timezone
  const toVietnamTime = (utcDate: Date): Date => {
    return new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
  };

  // Helper function to get start of day in Vietnam timezone
  const getStartOfDayVietnam = (date: Date): Date => {
    const vietnamDate = toVietnamTime(date);
    vietnamDate.setHours(0, 0, 0, 0);
    return vietnamDate;
  };

  const formatDate = (dateString: string) => {
    try {
      const utcDate = new Date(dateString);
      const vietnamTime = toVietnamTime(utcDate);
      
      const now = new Date();
      const vietnamNow = toVietnamTime(now);
      
      // Get start of day in Vietnam timezone
      const vietnamToday = getStartOfDayVietnam(now);
      const vietnamAddedDate = getStartOfDayVietnam(utcDate);
      
      // Calculate difference in days
      const diffTime = vietnamToday.getTime() - vietnamAddedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day - check if it's today
        const today = new Date(vietnamNow);
        const addedDate = new Date(vietnamTime);
        
        if (today.getDate() === addedDate.getDate() && 
            today.getMonth() === addedDate.getMonth() && 
            today.getFullYear() === addedDate.getFullYear()) {
          return 'Đã lưu hôm nay';
        }
      }
      
      if (diffDays === 1) return 'Đã lưu hôm qua';
      if (diffDays < 7) return `Đã lưu ${diffDays} ngày trước`;
      if (diffDays < 30) return `Đã lưu ${Math.ceil(diffDays / 7)} tuần trước`;
      if (diffDays < 365) return `Đã lưu ${Math.ceil(diffDays / 30)} tháng trước`;
      return `Đã lưu ${Math.ceil(diffDays / 365)} năm trước`;
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'Vừa xong';
    }
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

  const renderProductItem = ({ item }: { item: WishlistProduct }) => (
    <TouchableOpacity
      style={[
        styles.productItem,
        item.product?.isAvailable === false && styles.unavailableProduct,
        selectedItems.includes(item.productId) && styles.selectedProduct,
      ]}
      onPress={() => handleProductPress(item.productId)}
      onLongPress={() => {
        setIsSelectionMode(true);
        toggleSelection(item.productId);
      }}
    >
      {isSelectionMode && (
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => toggleSelection(item.productId)}
        >
          <View
            style={[
              styles.checkbox,
              selectedItems.includes(item.productId) && styles.checkedBox,
            ]}
          >
            {selectedItems.includes(item.productId) && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.productImage}>
        {(() => {
          const url = getFirstMediaUrl(item.product);
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
                <View style={{ position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="play" size={16} color="#fff" />
                </View>
              </View>
            );
          }
          return <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />;
        })()}
        {item.product?.isAvailable === false && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Không còn bán</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.product?.title || 'Sản phẩm không xác định'}
        </Text>
        <Text style={styles.productPrice}>{formatPrice(item.product?.price)}</Text>
        <View style={styles.productDetails}>
          {(item.product?.brand || item.product?.year) && (
            <Text style={styles.productDetail}>
              {item.product?.brand}{item.product?.year ? ` • ${item.product.year}` : ''}
            </Text>
          )}
          {item.product?.specifications?.batteryCapacity && (
            <Text style={styles.productDetail}>Pin: {item.product.specifications.batteryCapacity}</Text>
          )}
          {item.product?.condition && (
            <Text style={styles.productDetail}>
              Tình trạng: {item.product.condition}
            </Text>
          )}
          {item.product?.specifications?.mileage && item.product.specifications.mileage !== "N/A" && (
            <Text style={styles.productDetail}>Đã đi: {item.product.specifications.mileage}</Text>
          )}
        </View>
        <View style={styles.productFooter}>
          <Text style={styles.dateAdded}>{formatDate(item.addedAt)}</Text>
        </View>
      </View>

      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromWishlist(item.productId)}
        >
          <Ionicons name="heart" size={20} color="#FF6B35" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isSelectionMode
              ? `Đã chọn ${selectedItems.length}`
              : "Tin đăng đã lưu"}
          </Text>
          <View style={styles.wishlistBadge}>
            <Text style={styles.wishlistBadgeText}>
              {wishlistProducts.length}
            </Text>
          </View>
        </View>
        {isSelectionMode ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              onPress={handleSelectAll}
              style={styles.selectAllButton}
            >
              <Text style={styles.selectAllText}>
                {selectedItems.length === wishlistProducts.length
                  ? "Bỏ chọn"
                  : "Chọn tất cả"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsSelectionMode(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      {/* Selection Actions */}
      {isSelectionMode && (
        <View style={styles.selectionActionBar}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedItems([]);
            }}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.removeSelectedButton,
              selectedItems.length === 0 && styles.disabledButton,
            ]}
            onPress={handleRemoveSelected}
            disabled={selectedItems.length === 0}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.removeSelectedText}>
              Xóa ({selectedItems.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort/Filter Options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortFilter === "all" && styles.activeSortOption,
          ]}
          onPress={() => setSortFilter("all")}
        >
          <Ionicons
            name="list"
            size={16}
            color={sortFilter === "all" ? "#fff" : "#666"}
          />
          <Text
            style={[
              styles.sortOptionText,
              sortFilter === "all" && styles.activeSortOptionText,
            ]}
          >
            Tất cả ({wishlistProducts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortFilter === "available" && styles.activeSortOption,
          ]}
          onPress={() => setSortFilter("available")}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={sortFilter === "available" ? "#fff" : "#4CAF50"}
          />
          <Text
            style={[
              styles.sortOptionText,
              sortFilter === "available" && styles.activeSortOptionText,
            ]}
          >
            Có sẵn ({wishlistProducts.filter((item) => item.product?.isAvailable !== false).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortOption,
            sortFilter === "sold_out" && styles.activeSortOption,
          ]}
          onPress={() => setSortFilter("sold_out")}
        >
          <Ionicons
            name="close-circle"
            size={16}
            color={sortFilter === "sold_out" ? "#fff" : "#FF6B6B"}
          />
          <Text
            style={[
              styles.sortOptionText,
              sortFilter === "sold_out" && styles.activeSortOptionText,
            ]}
          >
            Hết hàng ({wishlistProducts.filter((item) => item.product?.isAvailable === false).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={getFilteredProducts()}
        renderItem={renderProductItem}
        keyExtractor={(item) => item._id}
        style={styles.productsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <>
                <Ionicons name="refresh" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>Đang tải...</Text>
                <Text style={styles.emptyMessage}>Vui lòng chờ trong giây lát</Text>
              </>
            ) : errorText ? (
              <>
                <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
                <Text style={styles.emptyTitle}>Có lỗi xảy ra</Text>
                <Text style={styles.emptyMessage}>{errorText}</Text>
                <TouchableOpacity
                  style={styles.exploreButton}
                  onPress={fetchWishlist}
                >
                  <Text style={styles.exploreButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons
                  name={
                    sortFilter === "available"
                      ? "checkmark-circle-outline"
                      : sortFilter === "sold_out"
                      ? "close-circle-outline"
                      : "heart-outline"
                  }
                  size={48}
                  color="#ccc"
                />
                <Text style={styles.emptyTitle}>
                  {sortFilter === "available"
                    ? "Không có sản phẩm có sẵn"
                    : sortFilter === "sold_out"
                    ? "Không có sản phẩm hết hàng"
                    : "Chưa có sản phẩm yêu thích"}
                </Text>
                <Text style={styles.emptyMessage}>
                  {sortFilter === "available"
                    ? "Tất cả sản phẩm trong danh sách đã hết hàng"
                    : sortFilter === "sold_out"
                    ? "Tất cả sản phẩm trong danh sách vẫn còn có sẵn"
                    : "Hãy thêm sản phẩm vào danh sách yêu thích để dễ dàng theo dõi"}
                </Text>
                {sortFilter === "all" && (
                  <TouchableOpacity
                    style={styles.exploreButton}
                    onPress={() => (navigation as any).navigate("Trang chủ")}
                  >
                    <Text style={styles.exploreButtonText}>Khám phá sản phẩm</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    marginTop: -50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingTop: 50,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  wishlistBadge: {
    backgroundColor: "#FFD700",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: "center",
  },
  wishlistBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  menuButton: {
    padding: 4,
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectAllButton: {
    padding: 4,
  },
  selectAllText: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "500",
  },
  selectionActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  removeSelectedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  removeSelectedText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  sortContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    justifyContent: "space-between",
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  activeSortOption: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  sortOptionText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },
  activeSortOptionText: {
    color: "#000",
    fontWeight: "bold",
  },
  productsList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 100, // Add padding to account for bottom navigation
  },
  productItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unavailableProduct: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  selectedProduct: {
    borderWidth: 2,
    borderColor: "#4A90E2",
    backgroundColor: "#f8f9ff",
  },
  selectionButton: {
    marginRight: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkedBox: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  productImage: {
    width: 100,
    height: 100,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  unavailableOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 107, 107, 0.8)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 8,
  },
  productDetails: {
    marginBottom: 8,
  },
  productDetail: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productLocation: {
    fontSize: 12,
    color: "#666",
  },
  dateAdded: {
    fontSize: 11,
    color: "#999",
  },
  removeButton: {
    padding: 8,
    alignSelf: "flex-start",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
