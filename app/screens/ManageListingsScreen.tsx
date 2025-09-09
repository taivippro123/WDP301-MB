import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function ManageListingsScreen() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, title: 'ĐANG HIỂN THỊ', count: 3 },
    { id: 1, title: 'HẾT HẠN', count: 1 },
    { id: 2, title: 'BỊ TỪ CHỐI', count: 0 },
    { id: 3, title: 'TIN NHÁP', count: 0 },
    { id: 4, title: 'CHỜ DUYỆT', count: 0 },
    { id: 5, title: 'ĐÃ ẨN', count: 0 },
    
  ];

  const listings = [
    {
      id: 1,
      title: 'Xe máy điện VinFast Klara A2',
      price: '35,000,000 VNĐ',
      location: 'Hà Nội',
      status: 'active',
      views: 156,
      favorites: 12,
      postedDate: '3 ngày trước',
      expiryDate: '27 ngày còn lại'
    },
    {
      id: 2,
      title: 'Pin xe máy điện Lithium 60V 32Ah',
      price: '8,500,000 VNĐ',
      location: 'Đà Nẵng',
      status: 'active',
      views: 89,
      favorites: 5,
      postedDate: '1 tuần trước',
      expiryDate: '23 ngày còn lại'
    },
    {
      id: 3,
      title: 'Xe đạp điện Yamaha PAS',
      price: '18,000,000 VNĐ',
      location: 'Hà Nội',
      status: 'active',
      views: 234,
      favorites: 18,
      postedDate: '2 tuần trước',
      expiryDate: '16 ngày còn lại'
    }
  ];

  const expiredListings = [
    {
      id: 4,
      title: 'Ô tô điện VinFast VF8',
      price: '1,200,000,000 VNĐ',
      location: 'TP.HCM',
      status: 'expired',
      views: 445,
      favorites: 28,
      postedDate: '2 tháng trước',
      expiryDate: 'Đã hết hạn'
    }
  ];

  const getCurrentListings = () => {
    switch (activeTab) {
      case 0:
        return listings;
      case 1:
        return expiredListings;
      case 2:
      case 3:
      case 4:
      case 5:
        return [];
      default:
        return [];
    }
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

  const renderListingItem = (item) => (
    <View key={item.id} style={styles.listingCard}>
      <View style={styles.listingImage}>
        <Ionicons name="image-outline" size={40} color="#ccc" />
      </View>
      
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingPrice}>{item.price}</Text>
        <Text style={styles.listingLocation}>{item.location}</Text>
        
        <View style={styles.listingStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color="#666" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={16} color="#666" />
            <Text style={styles.statText}>{item.favorites}</Text>
          </View>
        </View>
        
        <View style={styles.listingDates}>
          <Text style={styles.dateText}>{item.postedDate}</Text>
          <Text style={[
            styles.expiryText, 
            item.status === 'expired' && styles.expiredText
          ]}>
            {item.expiryDate}
          </Text>
        </View>
      </View>
      
      <View style={styles.listingActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create-outline" size={20} color="#FFD700" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="copy-outline" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
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
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.title} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {getCurrentListings().length === 0 ? (
          renderEmptyState()
        ) : (
          getCurrentListings().map(renderListingItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  userStats: {
    marginRight: 16,
  },
  userStatsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 120,
  },
  activeTab: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  postButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
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
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  listingLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  listingStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  listingDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
  },
  expiryText: {
    fontSize: 11,
    color: '#4CAF50',
  },
  expiredText: {
    color: '#FF6B6B',
  },
  listingActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    marginVertical: 2,
  },
});
