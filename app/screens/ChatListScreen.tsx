// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  DeviceEventEmitter,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken, user, logout } = useAuth();
  const routeParams: any = (route.params as any) || {};
  const initialConversationId = routeParams.conversationId || routeParams?.params?.conversationId;
  const peerName = routeParams.peerName || routeParams?.params?.peerName;
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isRefreshingConversations, setIsRefreshingConversations] = useState(false);
  const [lastUnreadCount, setLastUnreadCount] = useState(0);

  // Conversations mapped to list items
  const chatList = conversations.map((c: any) => {
    const lastMessageTime = c.lastMessage?.createdAt || c.lastMessage?.sentAt || c.updatedAt;
    const timeString = lastMessageTime 
      ? new Date(lastMessageTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '';
    
    return {
      id: c._id,
      name: c.peer?.name || 'Người dùng',
      lastMessage: c.lastMessage?.text || '',
      time: timeString,
      unread: c.unread || 0,
      avatar: (c.peer?.name || 'U')[0]?.toUpperCase() || 'U',
      online: false,
      product: (c.product?.title || c.productId?.title || ''),
    };
  });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  // Initialize WebSocket connection for real-time updates
  const initializeSocket = React.useCallback(() => {
    if (!accessToken || socket) return;

    const socketUrl = API_URL.replace('/api', '');
    console.log('ChatList: Initializing socket with URL:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 20,
    });

    newSocket.on('connect', () => {
      console.log('ChatList: Socket connected successfully');
      setIsConnected(true);
      stopPolling();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('ChatList: Socket disconnected:', reason);
      setIsConnected(false);
      startPolling();
    });

    newSocket.on('connect_error', (error) => {
      console.error('ChatList: Socket connection error:', error);
      setIsConnected(false);
      startPolling();
    });

    newSocket.on('conversation_updated', (data) => {
      console.log('ChatList: Conversation updated:', data);
      handleConversationUpdate(data);
    });

    setSocket(newSocket);
  }, [accessToken, socket]);

  // Handle conversation updates
  const handleConversationUpdate = React.useCallback((data: any) => {
    const { conversationId, lastMessage, unreadCount } = data;
    
    console.log('ChatList: Handling conversation update:', { conversationId, unreadCount, lastMessage });
    
    setConversations((prev: any[]) => {
      const updated = prev.map((c: any) => 
        c._id === conversationId ? {
          ...c,
          lastMessage: lastMessage || c.lastMessage,
          unread: unreadCount !== undefined ? unreadCount : c.unread,
          updatedAt: new Date().toISOString()
        } : c
      );
      
      // Sort by last message time
      const sorted = [...updated].sort((a, b) => {
        const getTime = (c: any) => new Date((c.lastMessage && (c.lastMessage.sentAt || c.lastMessage.createdAt)) || c.updatedAt || 0).getTime();
        return getTime(b) - getTime(a);
      });
      
      const totalUnread = sorted.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
      console.log('ChatList: Updated total unread count:', totalUnread);
      
      // Only emit if count actually changed
      if (totalUnread !== lastUnreadCount) {
        console.log('ChatList: Unread count changed from', lastUnreadCount, 'to', totalUnread);
        setLastUnreadCount(totalUnread);
        
        // Emit with delay to prevent flickering
        setTimeout(() => {
          DeviceEventEmitter.emit('chat_unread_count', totalUnread);
          console.log('ChatList: Emitted unread count:', totalUnread);
        }, 200);
      }
      
      return sorted;
    });
  }, [lastUnreadCount]);

  // Fallback polling for when WebSocket is not available
  const startPolling = React.useCallback(() => {
    if (pollingInterval || isConnected) return;
    
    console.log('ChatList: Starting polling fallback');
    const interval = setInterval(async () => {
      if (!isConnected && accessToken && !isRefreshingConversations) {
        try {
          console.log('ChatList: Polling for new messages...');
          loadConversations();
        } catch (e) {
          console.log('ChatList: Polling error:', e);
        }
      }
    }, 15000);
    
    setPollingInterval(interval);
  }, [pollingInterval, isConnected, accessToken, isRefreshingConversations]);

  const stopPolling = React.useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  const loadConversations = React.useCallback(async () => {
    if (isRefreshingConversations) {
      console.log('ChatList: Already refreshing conversations, skipping...');
      return;
    }
    
    setIsRefreshingConversations(true);
    setIsLoadingList(true);
    try {
      console.log('ChatList: Loading conversations...');
      const res = await fetch(`${API_URL}/api/chat`, { headers: authHeaders() });
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();
      const data = contentType.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
      const items = Array.isArray((data as any).items) ? (data as any).items : (Array.isArray(data) ? data : []);
      const normalized = items.map((c: any) => {
        const isBuyer = c?.buyerId?._id === user?._id;
        const peer = isBuyer ? c?.sellerId : c?.buyerId;
        const product = c?.productId;
        const unreadCount = c?.unreadCount || 0;
        
        return {
          _id: c?._id,
          peer,
          lastMessage: c?.lastMessage || {},
          product,
          unread: unreadCount,
        };
      });
      setConversations(normalized);
      
      const totalUnread = normalized.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
      console.log('ChatList: Total unread count:', totalUnread);
      
      // Always emit on load to ensure badge is current
      console.log('ChatList: Emitting unread count from loadConversations:', totalUnread);
      DeviceEventEmitter.emit('chat_unread_count', totalUnread);
      
      // Update last unread count
      if (totalUnread !== lastUnreadCount) {
        console.log('ChatList: Unread count changed from', lastUnreadCount, 'to', totalUnread);
        setLastUnreadCount(totalUnread);
      }
    } catch (e) {
      console.log('ChatList: Error loading conversations:', e);
    } finally {
      setIsLoadingList(false);
      setIsRefreshingConversations(false);
    }
  }, [accessToken, user?._id, logout, navigation, isRefreshingConversations, lastUnreadCount]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations]);

  const openConversation = React.useCallback((convId: string, fallbackName?: string) => {
    console.log('ChatList: Opening conversation:', convId);
    // Navigate to chat detail screen in the same stack
    (navigation as any).navigate('ChatDetail', { 
      conversationId: convId, 
      peerName: fallbackName 
    });
  }, [navigation]);

  const renderEmptyState = React.useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <View style={styles.chatBubble}>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
        <View style={styles.colorfulDots}>
          <View style={[styles.colorDot, { backgroundColor: '#4285F4' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#34A853' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#FBBC04' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#EA4335' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#9C27B0' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#FF9800' }]} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Hãy tìm tin rao bạn muốn và bấm</Text>
      <Text style={styles.emptyTitle}>vào nút Chat để liên hệ với người</Text>
      <Text style={styles.emptyTitle}>bán</Text>
    </View>
  ), []);

  const renderChatItem = React.useCallback(({ item }: any) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => openConversation(item.id, item.name)}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, item.online && styles.onlineAvatar]}>
          <Text style={styles.avatarText}>{item.avatar}</Text>
        </View>
        {item.online && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={1}>{item.product}</Text>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [openConversation]);

  useEffect(() => {
    console.log('ChatList: useEffect - accessToken:', !!accessToken);
    
    setTimeout(() => {
      loadConversations();
      initializeSocket();
      startPolling();
    }, 0);
    
    return () => {
      console.log('ChatList: cleanup');
      stopPolling();
    };
  }, [accessToken]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('ChatList: App became active, refreshing conversations');
        if (!isRefreshingConversations) {
          loadConversations();
        }
        if (socket && !isConnected) {
          console.log('ChatList: Reconnecting WebSocket');
          socket.connect();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [socket, isConnected, loadConversations, isRefreshingConversations]);

  // Stop polling when WebSocket connects
  useEffect(() => {
    if (isConnected) {
      console.log('ChatList: WebSocket connected, stopping polling');
      stopPolling();
    }
  }, [isConnected, stopPolling]);

  // Ensure WebSocket is always connected for real-time updates
  useEffect(() => {
    if (accessToken && !socket) {
      console.log('ChatList: Initializing WebSocket for real-time updates');
      initializeSocket();
    }
  }, [accessToken, socket, initializeSocket]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('ChatList: gained focus, refreshing...');
      loadConversations();
      
      // Force emit current unread count when screen gains focus
      setTimeout(() => {
        const currentTotal = conversations.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
        console.log('ChatList: Screen focused, emitting unread count:', currentTotal);
        DeviceEventEmitter.emit('chat_unread_count', currentTotal);
      }, 100);
      
      if (initialConversationId) {
        openConversation(initialConversationId, peerName);
      }
      
      return () => {};
    }, [initialConversationId, peerName, loadConversations, openConversation, conversations])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      {chatList.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={chatList}
          renderItem={renderChatItem}
          keyExtractor={item => item.id.toString()}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={20}
          windowSize={10}
          getItemLayout={(data, index) => {
            const item = data[index];
            const hasUnread = item?.unread > 0;
            const height = hasUnread ? 85 : 80;
            return {
              length: height,
              offset: height * index,
              index,
            };
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingLeft: 150,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f5',
  },
  emptyIcon: {
    marginBottom: 32,
    alignItems: 'center',
  },
  chatBubble: {
    width: 120,
    height: 80,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  colorfulDots: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
  },
  emptyTitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingBottom: 100, // Add padding to content container for bottom navigation
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineAvatar: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  productName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});
