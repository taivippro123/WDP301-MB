import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

interface AccountScreenProps {
  onLogout: () => void;
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hasArrow: boolean;
  badge?: string;
  isLogout?: boolean;
  action?: string;
  subtitle?: string;
};

type MenuSection = {
  section?: string;
  items: MenuItem[];
};

export default function AccountScreen({ onLogout }: AccountScreenProps) {
  const navigation = useNavigation();
  const { user, accessToken, logout } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>((user as any)?.avatar || null);
  const [uploading, setUploading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const menuItems: MenuSection[] = [
    {
      section: 'Tiện ích',
      items: [
        { icon: 'heart', title: 'Tin đăng đã lưu', hasArrow: true },
        { icon: 'star', title: 'Đánh giá từ tôi', hasArrow: true }
      ]
    },
    {
      section: 'Dịch vụ trả phí',
      items: [
        { icon: 'shield-checkmark', title: 'Gói Pro', hasArrow: true, badge: 'PRO' }
      ]
    },
    {
      section: 'Khác',
      items: [
        { icon: 'time', title: 'Lịch sử giao dịch', hasArrow: true, action: 'open_orders' },
        { icon: 'settings', title: 'Cài đặt địa chỉ', hasArrow: true, action: 'open_profile' },
        { icon: 'desktop', title: 'Quản lý lịch sử đăng nhập', hasArrow: true },
        { icon: 'headset', title: 'Trợ giúp', hasArrow: true },
        { icon: 'chatbubbles', title: 'Đóng góp ý kiến', hasArrow: true },
        { icon: 'log-out', title: 'Đăng xuất', hasArrow: false, isLogout: true, action: 'logout' }
      ]
    }
  ];

  const uploadAvatar = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await fetch(`${API_URL}/api/upload/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setAvatarUri(result.url || result.avatar);
        Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');
      } else {
        throw new Error(result.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chụp ảnh mới hay chọn từ thư viện?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chụp ảnh', onPress: () => pickImage('camera') },
        { text: 'Thư viện', onPress: () => pickImage('library') },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      let result;
      if (source === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.granted === false) {
          Alert.alert('Lỗi', 'Cần quyền truy cập camera');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.action === 'logout') {
      Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng xuất', style: 'destructive', onPress: async () => {
              try {
                await fetch(`${API_URL}/api/auth/logout`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  },
                  body: JSON.stringify({}),
                });
              } catch (e) {
                // ignore network errors on logout
              } finally {
                await logout();
                onLogout();
              }
            } }
        ]
      );
    } else {
      if (item.action === 'open_profile') {
        (navigation as any).navigate('Profile');
      } else if (item.action === 'open_orders') {
        (navigation as any).navigate('OrderHistory');
      } else {
        Alert.alert('Thông báo', `Tính năng "${item.title}" sẽ được phát triển trong tương lai`);
      }
    }
  };

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/profile/wallet`, {
        headers: {
          'Accept': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        }
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (res.ok) {
        const bal = data?.wallet?.balance ?? data?.balance ?? 0;
        setWalletBalance(Number(bal) || 0);
      }
    } catch {}
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;
    fetchWallet();
    return () => { mounted = false; };
  }, [accessToken, fetchWallet]);

  const renderMenuItem = (item: MenuItem, index: number) => (
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

  const renderSection = (section: MenuSection, index: number) => (
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
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={fetchWallet}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <TouchableOpacity style={styles.avatar} onPress={handleAvatarPress} disabled={uploading}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={32} color="#ccc" />
                )}
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={handleAvatarPress} disabled={uploading}>
                <Ionicons name="create" size={16} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user?.name || 'Người dùng'}</Text>
              
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
                  <Text style={styles.dongTotLabel}>Ví Ecoin:</Text>
                  <View style={styles.dongTotBadge}>
                    <Text style={styles.dongTotValue}>{(walletBalance ?? 0).toLocaleString('vi-VN')}</Text>
                    <View style={styles.dongTotIcon}>
                      <Text style={styles.dongTotIconText}>Xu</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.topUpButton}
                onPress={() => (navigation as any).navigate('TopUp')}
              >
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
