import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Notification {
  id: string;
  type: 'like' | 'view' | 'comment' | 'message' | 'system';
  title: string;
  message: string;
  productName?: string;
  time: string;
  isRead: boolean;
  data?: {
    likes?: number;
    views?: number;
    comments?: number;
  };
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    title: 'Sản phẩm được yêu thích',
    message: 'Sản phẩm Xe điện VinFast VF5 của bạn có 5 lượt tim mới',
    productName: 'Xe điện VinFast VF5',
    time: '2 giờ trước',
    isRead: false,
    data: { likes: 5 }
  },
  {
    id: '2',
    type: 'view',
    title: 'Sản phẩm được xem',
    message: 'Sản phẩm Xe máy điện VinFast Klara A2 của bạn có 200 lượt xem mới',
    productName: 'Xe máy điện VinFast Klara A2',
    time: '4 giờ trước',
    isRead: false,
    data: { views: 200 }
  },
  {
    id: '3',
    type: 'comment',
    title: 'Bình luận mới',
    message: 'Có 3 bình luận mới trên sản phẩm Ô tô điện VinFast VF8',
    productName: 'Ô tô điện VinFast VF8',
    time: '6 giờ trước',
    isRead: true,
    data: { comments: 3 }
  },
  {
    id: '4',
    type: 'message',
    title: 'Tin nhắn mới',
    message: 'Bạn có tin nhắn mới từ người mua về sản phẩm Pin xe máy điện Lithium',
    productName: 'Pin xe máy điện Lithium 60V 32Ah',
    time: '1 ngày trước',
    isRead: true
  },
  {
    id: '5',
    type: 'like',
    title: 'Sản phẩm được yêu thích',
    message: 'Sản phẩm Xe đạp điện Yamaha PAS của bạn có 12 lượt tim mới',
    productName: 'Xe đạp điện Yamaha PAS',
    time: '1 ngày trước',
    isRead: true,
    data: { likes: 12 }
  },
  {
    id: '6',
    type: 'view',
    title: 'Sản phẩm được xem',
    message: 'Sản phẩm Xe máy điện Honda PCX Electric có 150 lượt xem mới',
    productName: 'Xe máy điện Honda PCX Electric',
    time: '2 ngày trước',
    isRead: true,
    data: { views: 150 }
  },
  {
    id: '7',
    type: 'system',
    title: 'Cập nhật hệ thống',
    message: 'Ứng dụng đã được cập nhật với nhiều tính năng mới. Hãy khám phá ngay!',
    time: '3 ngày trước',
    isRead: true
  },
  {
    id: '8',
    type: 'like',
    title: 'Sản phẩm được yêu thích',
    message: 'Sản phẩm Pin ô tô điện Tesla Model 3 có 8 lượt tim mới',
    productName: 'Pin ô tô điện Tesla Model 3',
    time: '3 ngày trước',
    isRead: true,
    data: { likes: 8 }
  }
];

export default function NotificationScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(notif => !notif.isRead);

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'view':
        return 'eye';
      case 'comment':
        return 'chatbubble';
      case 'message':
        return 'mail';
      case 'system':
        return 'notifications';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'like':
        return '#FF6B35';
      case 'view':
        return '#4A90E2';
      case 'comment':
        return '#50C878';
      case 'message':
        return '#FFD700';
      case 'system':
        return '#9B59B6';
      default:
        return '#666';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notification.id 
          ? { ...notif, isRead: true }
          : notif
      )
    );

    // Navigate to product detail if it's product-related
    if (notification.productName && notification.type !== 'system') {
      // In a real app, you would pass the actual productId
      (navigation as any).navigate('ProductDetail', { productId: 1 });
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationIconColor(item.type) + '20' }]}>
        <Ionicons 
          name={getNotificationIcon(item.type) as any} 
          size={24} 
          color={getNotificationIconColor(item.type)} 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        
        <Text style={styles.notificationMessage}>{item.message}</Text>
        
        {item.productName && (
          <Text style={styles.productName}>{item.productName}</Text>
        )}
        
        {item.data && (
          <View style={styles.statsContainer}>
            {item.data.likes && (
              <View style={styles.statItem}>
                <Ionicons name="heart" size={14} color="#FF6B35" />
                <Text style={styles.statText}>{item.data.likes} lượt tim</Text>
              </View>
            )}
            {item.data.views && (
              <View style={styles.statItem}>
                <Ionicons name="eye" size={14} color="#4A90E2" />
                <Text style={styles.statText}>{item.data.views} lượt xem</Text>
              </View>
            )}
            {item.data.comments && (
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={14} color="#50C878" />
                <Text style={styles.statText}>{item.data.comments} bình luận</Text>
              </View>
            )}
          </View>
        )}
      </View>
      
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Text style={styles.markAllButtonText}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
            Tất cả ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.activeFilterTabText]}>
            Chưa đọc ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Không có thông báo</Text>
            <Text style={styles.emptyMessage}>
              {filter === 'unread' 
                ? 'Bạn đã đọc hết tất cả thông báo' 
                : 'Chưa có thông báo nào'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingLeft: 50,
  },
  unreadBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    padding: 4,
  },
  markAllButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeFilterTab: {
    backgroundColor: '#FFD700',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  notificationsList: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
    paddingBottom: 120,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  unreadNotification: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginLeft: 8,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
