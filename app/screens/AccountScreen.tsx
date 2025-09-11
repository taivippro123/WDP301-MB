import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface AccountScreenProps {
  onLogout: () => void;
}

export default function AccountScreen({ onLogout }: AccountScreenProps) {
  const menuItems = [
    {
      section: 'Tiện ích',
      items: [
        { icon: 'heart', title: 'Tin đăng đã lưu', hasArrow: true },
        { icon: 'bookmark', title: 'Tìm kiếm đã lưu', hasArrow: true },
        { icon: 'star', title: 'Đánh giá từ tôi', hasArrow: true }
      ]
    },
    {
      section: 'Dịch vụ trả phí',
      items: [
        { icon: 'diamond', title: 'Đồng Tốt', hasArrow: true, badge: 'ĐT' },
        { icon: 'shield-checkmark', title: 'Gói Pro', hasArrow: true, badge: 'PRO' }
      ]
    },
    {
      section: 'Khác',
      items: [
        { icon: 'time', title: 'Lịch sử giao dịch', hasArrow: true },
        { icon: 'storefront', title: 'Cửa hàng / chuyên trang', hasArrow: true, subtitle: 'Tạo ngay' }
      ]
    },
    {
      section: 'Ưu đãi, khuyến mãi',
      items: [
        { icon: 'diamond', title: 'Chợ Tốt Ưu Đãi', hasArrow: true },
        { icon: 'pricetag', title: 'Ưu Đãi của tôi', hasArrow: true }
      ]
    },
    {
      section: 'Khác',
      items: [
        { icon: 'settings', title: 'Cài đặt tài khoản', hasArrow: true },
        { icon: 'desktop', title: 'Quản lý lịch sử đăng nhập', hasArrow: true },
        { icon: 'headset', title: 'Trợ giúp', hasArrow: true },
        { icon: 'chatbubbles', title: 'Đóng góp ý kiến', hasArrow: true },
        { icon: 'log-out', title: 'Đăng xuất', hasArrow: false, isLogout: true, action: 'logout' }
      ]
    }
  ];

  const handleMenuItemPress = (item) => {
    if (item.action === 'logout') {
      Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng xuất', style: 'destructive', onPress: onLogout }
        ]
      );
    } else {
      Alert.alert('Thông báo', `Tính năng "${item.title}" sẽ được phát triển trong tương lai`);
    }
  };

  const renderMenuItem = (item, index) => (
    <TouchableOpacity 
      key={index} 
      style={styles.menuItem}
      onPress={() => handleMenuItemPress(item)}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, item.isLogout && styles.logoutIcon]}>
          <Ionicons 
            name={item.icon} 
            size={20} 
            color={item.isLogout ? '#FF6B6B' : '#666'} 
          />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, item.isLogout && styles.logoutText]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.menuItemRight}>
        {item.badge && (
          <View style={[styles.badge, item.badge === 'PRO' && styles.proBadge]}>
            <Text style={[styles.badgeText, item.badge === 'PRO' && styles.proBadgeText]}>
              {item.badge}
            </Text>
          </View>
        )}
        {item.hasArrow && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section, index) => (
    <View key={index} style={styles.section}>
      {section.section && (
        <Text style={styles.sectionTitle}>{section.section}</Text>
      )}
      <View style={styles.sectionContent}>
        {section.items.map((item, itemIndex) => renderMenuItem(item, itemIndex))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView style={styles.headerSafeArea}>
          <Text style={styles.headerTitle}>Tài khoản</Text>
        </SafeAreaView>
      </View>
      
      <SafeAreaView style={styles.safeArea}>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color="#ccc" />
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="create" size={16} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>Thành Tài</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Người theo dõi</Text>
                  <Text style={styles.statValue}>0</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Đang theo dõi</Text>
                  <Text style={styles.statValue}>2</Text>
                </View>
              </View>
              
              <View style={styles.userInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>TK Định danh:</Text>
                  <Ionicons name="information-circle" size={16} color="#666" />
                  <Text style={styles.infoValue}>V088810013709</Text>
                  <TouchableOpacity>
                    <Ionicons name="copy" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dongTotRow}>
                  <Text style={styles.dongTotLabel}>Đồng Tốt</Text>
                  <View style={styles.dongTotBadge}>
                    <Text style={styles.dongTotValue}>0</Text>
                    <View style={styles.dongTotIcon}>
                      <Text style={styles.dongTotIconText}>ĐT</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity style={styles.topUpButton}>
                <Text style={styles.topUpButtonText}>Nạp ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, index) => renderSection(section, index))}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  headerSafeArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingBottom: 15,
    paddingTop: 10,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileAvatar: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  profileDetails: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
  },
  userInfo: {
    width: '100%',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
    marginRight: 8,
  },
  dongTotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dongTotLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  dongTotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dongTotValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 4,
  },
  dongTotIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dongTotIconText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  topUpButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionContent: {
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutIcon: {
    backgroundColor: '#ffe6e6',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  logoutText: {
    color: '#FF6B6B',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    marginRight: 8,
  },
  proBadge: {
    backgroundColor: '#000',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  proBadgeText: {
    color: '#fff',
  },
});
