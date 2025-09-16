// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  DeviceEventEmitter,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken, user, logout } = useAuth();
  const routeParams: any = (route.params as any) || {};
  const initialConversationId = routeParams.conversationId || routeParams?.params?.conversationId;
  const peerName = routeParams.peerName || routeParams?.params?.peerName;
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any>({});
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const flatListRef = useRef(null);

  // Conversations mapped to list items
  const chatList = conversations.map((c: any) => ({
    id: c._id,
    name: c.peer?.name || 'Người dùng',
    lastMessage: c.lastMessage?.text || '',
    time: (c.lastMessage?.createdAt || c.lastMessage?.sentAt)
      ? new Date(c.lastMessage.createdAt || c.lastMessage.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '',
    unread: c.unread || 0,
    avatar: (c.peer?.name || 'U')[0]?.toUpperCase() || 'U',
    online: false,
    product: (c.product?.title || c.productId?.title || ''),
  }));

  // Calculate total unread count for tab badge
  const totalUnreadCount = conversations.reduce((total, c) => total + (c.unread || 0), 0);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const loadConversations = async () => {
    setIsLoadingList(true);
    try {
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
        // Calculate unread count based on lastMessage sender
        const lastMessageSender = c?.lastMessage?.sentBy || c?.lastMessage?.senderId;
        const isLastMessageFromMe = lastMessageSender === user?._id;
        const unreadCount = isLastMessageFromMe ? 0 : (c?.unreadCount || 1);
        
        return {
          _id: c?._id,
          peer,
          lastMessage: c?.lastMessage || {},
          product,
          unread: unreadCount,
        };
      });
      setConversations(normalized);
      // Emit total unread count for bottom tab badge
      const totalUnread = normalized.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
      DeviceEventEmitter.emit('chat_unread_count', totalUnread);
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingList(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setRefreshing(false);
    }
  };

  const openConversation = async (convId: string, fallbackName?: string) => {
    // Optimistically open the conversation UI even if fetching messages fails
    const found = conversations.find((c: any) => c._id === convId);
    const peerNameSafe = found?.peer?.name || fallbackName || 'Chat';
    const productTitle = (found?.product?.title || found?.productId?.title || '');
    setSelectedChat({
      id: convId,
      name: peerNameSafe,
      avatar: (peerNameSafe || 'U')[0]?.toUpperCase() || 'U',
      online: false,
      product: productTitle,
    });
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    
    // Mark conversation as read when opening
    setConversations((prev: any[]) => {
      const updated = prev.map((c: any) => c._id === convId ? { ...c, unread: 0 } : c);
      const totalUnread = updated.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
      DeviceEventEmitter.emit('chat_unread_count', totalUnread);
      return updated;
    });
    try {
      const urls = [
        `${API_URL}/api/chat/${convId}/messages?page=1&limit=50`,
      ];
      let lastErr: any = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: authHeaders() });
          if (res.status === 401) {
            await logout();
            (navigation as any).navigate('Tài khoản');
            return;
          }
          const contentType = res.headers.get('content-type') || '';
          const raw = await res.text();
          const data = contentType.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
          const list = Array.isArray((data as any).items) ? (data as any).items : (Array.isArray(data) ? data : (data.messages || []));
          setChatMessages((prev: any) => ({ ...prev, [convId]: list.map((m: any, idx: number) => ({
            id: m._id || idx + 1,
            text: m.text,
            sender: (m.isMine !== undefined) ? (m.isMine ? 'me' : 'other') : (m.senderId === user?._id ? 'me' : 'other'),
            time: (m.createdAt || m.sentAt) ? new Date(m.createdAt || m.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          })) }));
          setTimeout(() => { if (flatListRef.current) (flatListRef.current as any).scrollToEnd({ animated: true }); }, 50);
          return;
        } catch (err) {
          lastErr = err;
        }
      }
      if (lastErr) throw lastErr;
    } catch (e) {
      // Keep UI open; messages will be empty or previously cached
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh conversations when screen gains focus
      loadConversations();
      if (initialConversationId) {
        openConversation(initialConversationId, peerName);
      }
      // Fallback: check pending id in storage in case params missing
      (async () => {
        if (!initialConversationId && !selectedChat) {
          try {
            const pendingId = await AsyncStorage.getItem('pending_conversation_id');
            const pendingName = await AsyncStorage.getItem('pending_conversation_peer_name');
            if (pendingId) {
              openConversation(pendingId, pendingName || 'Chat');
              await AsyncStorage.removeItem('pending_conversation_id');
              await AsyncStorage.removeItem('pending_conversation_peer_name');
            }
          } catch {}
        }
      })();
      return () => {};
    }, [initialConversationId, peerName])
  );

  // Ensure opening chat detail immediately if params are present
  useEffect(() => {
    if (initialConversationId && !selectedChat) {
      const name = peerName || 'Chat';
      setSelectedChat({
        id: initialConversationId,
        name,
        avatar: (name || 'U')[0]?.toUpperCase() || 'U',
        online: false,
        product: '',
      });
      // fetch messages in background
      openConversation(initialConversationId, peerName);
    }
  }, [initialConversationId, peerName, selectedChat]);

  useEffect(() => {
    if (initialConversationId) {
      openConversation(initialConversationId, peerName);
    }
  }, [initialConversationId]);

  // Initialize default messages for each chat
  const initializeMessages = () => {
    if (!chatMessages[1]) {
      setChatMessages(prev => ({
        ...prev,
        1: [
          {
            id: 1,
            text: 'Chào bạn, tôi quan tâm đến chiếc xe này',
            sender: 'other',
            time: '14:25'
          },
          {
            id: 2,
            text: 'Chào bạn! Xe vẫn còn bạn nhé',
            sender: 'me',
            time: '14:26'
          },
          {
            id: 3,
            text: 'Xe còn bảo hành không ạ?',
            sender: 'other',
            time: '14:28'
          },
          {
            id: 4,
            text: 'Xe còn bảo hành 2 năm nữa bạn',
            sender: 'me',
            time: '14:29'
          },
          {
            id: 5,
            text: 'Xe còn không bạn?',
            sender: 'other',
            time: '14:30'
          }
        ],
        2: [
          {
            id: 1,
            text: 'Giá này có thương lượng được không?',
            sender: 'other',
            time: '12:15'
          },
          {
            id: 2,
            text: 'Giá này đã tốt rồi bạn ạ',
            sender: 'me',
            time: '12:16'
          }
        ],
        3: [
          {
            id: 1,
            text: 'Tôi muốn xem xe trực tiếp',
            sender: 'other',
            time: '10:45'
          },
          {
            id: 2,
            text: 'Được bạn, bạn có thể đến xem vào cuối tuần',
            sender: 'me',
            time: '10:46'
          }
        ]
      }));
    }
  };

  // Get messages for current chat
  const getCurrentMessages = () => {
    if (!selectedChat) return [];
    return chatMessages[selectedChat.id] || [];
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const convId = (selectedChat as any).id || (selectedChat as any)._id;
    const text = newMessage.trim();
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ conversationId: convId, text }),
      });
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();
      const data = contentType.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
      const serverMsg = data.message || data;
      const message = {
        id: serverMsg?._id || ((chatMessages[convId]?.length || 0) + 1),
        text: serverMsg?.text || text,
        sender: 'me',
        time: serverMsg?.createdAt ? new Date(serverMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev: any) => ({
        ...prev,
        [convId]: [ ...(prev[convId] || []), message ],
      }));
      // Update conversations list: set lastMessage and move to top
      setConversations((prev: any[]) => {
        const updated = prev.map((c: any) => c._id === convId ? ({
          ...c,
          lastMessage: {
            ...(c.lastMessage || {}),
            text: serverMsg?.text || text,
            sentAt: serverMsg?.createdAt || serverMsg?.sentAt || new Date().toISOString(),
            sentBy: user?._id,
          },
        }) : c);
        const getTime = (c: any) => new Date((c.lastMessage && (c.lastMessage.sentAt || c.lastMessage.createdAt)) || c.updatedAt || 0).getTime();
        const sorted = [...updated].sort((a, b) => getTime(b) - getTime(a));
        const totalUnread = sorted.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
        DeviceEventEmitter.emit('chat_unread_count', totalUnread);
        return sorted;
      });
      setNewMessage('');
      setTimeout(() => { if (flatListRef.current) (flatListRef.current as any).scrollToEnd({ animated: true }); }, 10);
    } catch (e) {
      Alert.alert('Lỗi', 'Không gửi được tin nhắn');
    }
  };

  const renderEmptyState = () => (
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
  );

  const renderChatItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => {
        if (item?.id) {
          openConversation(item.id, item.name);
        } else {
          initializeMessages();
          setSelectedChat(item);
          navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
        }
      }}
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
  );

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'me' ? styles.myMessage : styles.otherMessage
    ]}>
      {item.files && item.files.length > 0 && (
        <View style={styles.fileContainer}>
          {item.files.map((file: any, index: number) => (
            <View key={index} style={styles.fileItem}>
              {file.type?.startsWith('image/') ? (
                <Image source={{ uri: file.url }} style={styles.fileImage} />
              ) : (
                <View style={styles.fileIcon}>
                  <Ionicons name="document" size={24} color="#666" />
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {item.text && (
        <Text style={[
          styles.messageText,
          item.sender === 'me' ? styles.myMessageText : styles.otherMessageText
        ]}>
          {item.text}
        </Text>
      )}
      <Text style={styles.messageTime}>{item.time}</Text>
    </View>
  );

  const handleBackToList = () => {
    setSelectedChat(null);
    // Show bottom navigation again
    navigation.getParent()?.setOptions({
      tabBarStyle: {
        backgroundColor: 'white',
        height: 90,
        paddingBottom: 2,
        paddingTop: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E7',
      }
    });
  };

  const onSwipeGesture = (event) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationX > 50) { // Swipe right more than 50px
        handleBackToList();
      }
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const uploadChatFiles = async (files: any[]) => {
    if (!selectedChat) return;
    
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          type: file.type || 'application/octet-stream',
          name: file.name || `file_${index}`,
        } as any);
      });
      formData.append('conversationId', selectedChat.id);
      if (newMessage.trim()) {
        formData.append('text', newMessage.trim());
      }

      const response = await fetch(`${API_URL}/api/chat/messages/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        // Add file message to chat
        const fileMessage = {
          id: result.message?._id || Date.now(),
          text: result.message?.text || `Đã gửi ${files.length} file`,
          sender: 'me',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          files: result.message?.files || files.map(f => ({ url: f.uri, name: f.name, type: f.type }))
        };
        
        setChatMessages((prev: any) => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), fileMessage],
        }));
        
        setNewMessage('');
        setTimeout(() => { if (flatListRef.current) (flatListRef.current as any).scrollToEnd({ animated: true }); }, 10);
        Alert.alert('Thành công', `Đã gửi ${files.length} file`);
      } else {
        throw new Error(result.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi file');
    } finally {
      setUploadingFiles(false);
    }
  };

  const pickImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets.length > 0) {
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`,
        }));
        await uploadChatFiles(files);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name || `document_${Date.now()}`,
        }));
        await uploadChatFiles(files);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn tài liệu');
    }
  };

  const handleImagePicker = () => {
    const options = ['Chụp ảnh', 'Chọn từ thư viện', 'Chọn tài liệu', 'Hủy'];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          title: 'Chọn file'
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            // Camera
            pickImages();
          } else if (buttonIndex === 1) {
            // Gallery
            pickImages();
          } else if (buttonIndex === 2) {
            // Documents
            pickDocuments();
          }
        }
      );
    } else {
      Alert.alert(
        'Chọn file',
        'Bạn muốn chọn loại file nào?',
        [
          { text: 'Chụp ảnh', onPress: pickImages },
          { text: 'Thư viện ảnh', onPress: pickImages },
          { text: 'Tài liệu', onPress: pickDocuments },
          { text: 'Hủy', style: 'cancel' }
        ]
      );
    }
  };


  const renderChatDetail = () => (
    <KeyboardAvoidingView 
      style={styles.chatDetailContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <PanGestureHandler onHandlerStateChange={onSwipeGesture}>
        <View style={styles.chatDetailContainer}>
          {/* Chat Header */}
          <View style={styles.chatDetailHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToList}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            
            <View style={styles.chatDetailInfo}>
              <View style={styles.chatDetailAvatar}>
                <Text style={styles.avatarText}>{selectedChat.avatar}</Text>
              </View>
              <View>
                <Text style={styles.chatDetailName}>{selectedChat.name}</Text>
                <Text style={styles.chatDetailProduct} numberOfLines={1}>
                  {selectedChat.product}
                </Text>
              </View>
            </View>
            
            <View style={styles.chatDetailActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="call" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="ellipsis-vertical" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.messagesContainer}>
              <FlatList
                ref={flatListRef}
                data={getCurrentMessages()}
                renderItem={renderMessage}
                keyExtractor={item => item.id.toString()}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: true });
                  }
                }}
                onLayout={() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: false });
                  }
                }}
              />
            </View>
          </TouchableWithoutFeedback>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={[styles.attachButton, uploadingFiles && styles.uploadingButton]}
              onPress={handleImagePicker}
              disabled={uploadingFiles}
            >
              {uploadingFiles ? (
                <Ionicons name="cloud-upload" size={20} color="#FFD700" />
              ) : (
                <Ionicons name="attach" size={20} color="#666" />
              )}
            </TouchableOpacity>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
              selectionColor="#000"
              autoCorrect={false}
            />
            
            <TouchableOpacity 
              style={[styles.sendButton, !newMessage.trim() && styles.disabledButton]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color={!newMessage.trim() ? "#ccc" : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>
      </PanGestureHandler>
    </KeyboardAvoidingView>
  );

  if (selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        {renderChatDetail()}
      </SafeAreaView>
    );
  }

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
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
  // Chat Detail Styles
  chatDetailContainer: {
    flex: 1,
  },
  chatDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  chatDetailInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatDetailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatDetailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chatDetailProduct: {
    fontSize: 12,
    color: '#666',
    maxWidth: 150,
  },
  chatDetailActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFD700',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attachButton: {
    padding: 10,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 8,
    color: '#000000',
    backgroundColor: '#ffffff',
    fontWeight: '400',
  },
  sendButton: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  fileContainer: {
    marginBottom: 8,
  },
  fileItem: {
    marginBottom: 4,
  },
  fileImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  fileIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    maxWidth: 200,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  uploadingButton: {
    opacity: 0.7,
  },
});
