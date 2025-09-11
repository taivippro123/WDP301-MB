import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface WishlistProduct {
  id: number;
  title: string;
  price: string;
  location: string;
  brand: string;
  year: number;
  batteryCapacity: string;
  batteryCondition: string;
  mileage: string;
  dateAdded: string;
  isAvailable: boolean;
}

const mockWishlistProducts: WishlistProduct[] = [
  {
    id: 1,
    title: "Xe máy điện VinFast Klara A2",
    price: "35,000,000 VNĐ",
    location: "Hà Nội",
    brand: "VinFast",
    year: 2023,
    batteryCapacity: "48V 20Ah",
    batteryCondition: "95%",
    mileage: "1,200 km",
    dateAdded: "2 ngày trước",
    isAvailable: true,
  },
  {
    id: 2,
    title: "Ô tô điện VinFast VF8",
    price: "1,200,000,000 VNĐ",
    location: "TP.HCM",
    brand: "VinFast",
    year: 2024,
    batteryCapacity: "87.7 kWh",
    batteryCondition: "98%",
    mileage: "5,000 km",
    dateAdded: "5 ngày trước",
    isAvailable: true,
  },
  {
    id: 3,
    title: "Pin xe máy điện Lithium 60V 32Ah",
    price: "8,500,000 VNĐ",
    location: "Đà Nẵng",
    brand: "Samsung",
    year: 2023,
    batteryCapacity: "60V 32Ah",
    batteryCondition: "90%",
    mileage: "N/A",
    dateAdded: "1 tuần trước",
    isAvailable: false,
  },
  {
    id: 4,
    title: "Xe đạp điện Yamaha PAS",
    price: "18,000,000 VNĐ",
    location: "Hà Nội",
    brand: "Yamaha",
    year: 2022,
    batteryCapacity: "36V 15Ah",
    batteryCondition: "85%",
    mileage: "3,500 km",
    dateAdded: "1 tuần trước",
    isAvailable: true,
  },
  {
    id: 5,
    title: "Xe máy điện Honda PCX Electric",
    price: "75,000,000 VNĐ",
    location: "Hà Nội",
    brand: "Honda",
    year: 2024,
    batteryCapacity: "50.4V 30Ah",
    batteryCondition: "100%",
    mileage: "500 km",
    dateAdded: "2 tuần trước",
    isAvailable: true,
  },
  {
    id: 6,
    title: "Pin ô tô điện Tesla Model 3",
    price: "450,000,000 VNĐ",
    location: "TP.HCM",
    brand: "Tesla",
    year: 2023,
    batteryCapacity: "75 kWh",
    batteryCondition: "92%",
    mileage: "N/A",
    dateAdded: "3 tuần trước",
    isAvailable: true,
  },
];

export default function WishlistScreen() {
  const navigation = useNavigation();
  const [wishlistProducts, setWishlistProducts] =
    useState(mockWishlistProducts);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortFilter, setSortFilter] = useState<
    "all" | "available" | "sold_out"
  >("all");

  const handleProductPress = (productId: number) => {
    if (isSelectionMode) {
      toggleSelection(productId);
    } else {
      (navigation as any).navigate("ProductDetail", { productId });
    }
  };

  const toggleSelection = (productId: number) => {
    setSelectedItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleRemoveFromWishlist = (productId: number) => {
    Alert.alert(
      "Xóa khỏi danh sách yêu thích",
      "Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setWishlistProducts((prev) =>
              prev.filter((product) => product.id !== productId)
            );
            setSelectedItems((prev) => prev.filter((id) => id !== productId));
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
          onPress: () => {
            setWishlistProducts((prev) =>
              prev.filter((product) => !selectedItems.includes(product.id))
            );
            setSelectedItems([]);
            setIsSelectionMode(false);
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
      setSelectedItems(filteredProducts.map((product) => product.id));
    }
  };

  const getFilteredProducts = () => {
    switch (sortFilter) {
      case "available":
        return wishlistProducts.filter((product) => product.isAvailable);
      case "sold_out":
        return wishlistProducts.filter((product) => !product.isAvailable);
      default:
        return wishlistProducts;
    }
  };

  const renderProductItem = ({ item }: { item: WishlistProduct }) => (
    <TouchableOpacity
      style={[
        styles.productItem,
        !item.isAvailable && styles.unavailableProduct,
        selectedItems.includes(item.id) && styles.selectedProduct,
      ]}
      onPress={() => handleProductPress(item.id)}
      onLongPress={() => {
        setIsSelectionMode(true);
        toggleSelection(item.id);
      }}
    >
      {isSelectionMode && (
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => toggleSelection(item.id)}
        >
          <View
            style={[
              styles.checkbox,
              selectedItems.includes(item.id) && styles.checkedBox,
            ]}
          >
            {selectedItems.includes(item.id) && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.productImage}>
        <Ionicons name="image-outline" size={40} color="#ccc" />
        {!item.isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Không còn bán</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <View style={styles.productDetails}>
          <Text style={styles.productDetail}>
            {item.brand} • {item.year}
          </Text>
          <Text style={styles.productDetail}>Pin: {item.batteryCapacity}</Text>
          <Text style={styles.productDetail}>
            Tình trạng: {item.batteryCondition}
          </Text>
          {item.mileage !== "N/A" && (
            <Text style={styles.productDetail}>Đã đi: {item.mileage}</Text>
          )}
        </View>
        <View style={styles.productFooter}>
          <Text style={styles.productLocation}>{item.location}</Text>
          <Text style={styles.dateAdded}>Đã lưu {item.dateAdded}</Text>
        </View>
      </View>

      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromWishlist(item.id)}
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
            Có sẵn ({wishlistProducts.filter((p) => p.isAvailable).length})
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
            Hết hàng ({wishlistProducts.filter((p) => !p.isAvailable).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={getFilteredProducts()}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.productsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
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
    paddingBottom: 120,
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
