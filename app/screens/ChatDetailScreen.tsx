// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  AppState,
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
import { io, Socket } from 'socket.io-client';
import API_URL from '../../config/api';
import { useAuth } from '../AuthContext';

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken, user, logout } = useAuth();
  const routeParams: any = (route.params as any) || {};
  const conversationId = routeParams.conversationId;
  const peerName = routeParams.peerName || 'Chat';
  
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any>({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [webSocketFailed, setWebSocketFailed] = useState(false);
  const flatListRef = useRef(null);
  // Track if user is near the bottom to decide auto-scroll behavior
  const isNearBottomRef = useRef(true);
  // Ensure we only auto-scroll once after initial load
  const didInitialAutoScrollRef = useRef(false);
  // Track seen message IDs per conversation to avoid duplicates
  const seenMessageIdsRef = useRef<{ [key: string]: Set<string> }>({});

  const hasSeenMessage = React.useCallback((convId: string, msgId?: string) => {
    if (!msgId) return false;
    const set = seenMessageIdsRef.current[convId];
    return !!set && set.has(msgId);
  }, []);

  const markMessageSeen = React.useCallback((convId: string, ...ids: (string | undefined)[]) => {
    if (!seenMessageIdsRef.current[convId]) seenMessageIdsRef.current[convId] = new Set<string>();
    const set = seenMessageIdsRef.current[convId];
    ids.filter(Boolean).forEach((id) => set.add(id as string));
  }, []);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  // Initialize WebSocket connection for chat detail
  const initializeSocket = React.useCallback(() => {
    if (!accessToken || socket) return;

    const socketUrl = API_URL.replace('/api', '');
    console.log('ChatDetail: Initializing socket with URL:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 20,
      upgrade: true,
      rememberUpgrade: false,
      pingTimeout: 60000,
      pingInterval: 25000,
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('=== CHAT DETAIL: SOCKET CONNECTED ===');
      console.log('Socket ID:', newSocket.id);
      console.log('Connected:', newSocket.connected);
      console.log('ConversationId:', conversationId);
      console.log('User ID:', user?._id);
      console.log('=====================================');
      
      setIsConnected(true);
      setWebSocketFailed(false); // Reset failed flag when connected
      
      // Join conversation room once when connected
      if (conversationId) {
        console.log('ChatDetail: Joining conversation on connect:', conversationId);
        newSocket.emit('join_conversation', conversationId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('ChatDetail: Socket disconnected:', reason);
      setIsConnected(false);
      setWebSocketFailed(true);
      
      // Try to reconnect immediately for real-time messages
      setTimeout(() => {
        if (newSocket && !newSocket.connected) {
          console.log('ChatDetail: Attempting to reconnect WebSocket...');
          newSocket.connect();
        }
      }, 1000); // Giảm delay từ 3s xuống 1s
    });

    newSocket.on('connect_error', (error) => {
      console.error('ChatDetail: Socket connection error:', error);
      setIsConnected(false);
      setWebSocketFailed(true);
      
      // Reconnect will be handled by Socket.IO built-in
    });

    newSocket.on('new_message', (data) => {
      console.log('=== CHAT DETAIL: NEW MESSAGE RECEIVED ===');
      console.log('Data:', data);
      console.log('Current conversationId:', conversationId);
      console.log('Message conversationId:', data.conversationId);
      console.log('Is current conversation?', conversationId === data.conversationId);
      console.log('Socket connected:', isConnected);
      console.log('Socket ID:', newSocket.id);
      console.log('User ID:', user?._id);
      console.log('==========================================');
      
      // Reset WebSocket failed flag when receiving messages
      setWebSocketFailed(false);
      setIsConnected(true);
      
      // Only handle messages for current conversation
      if (data.conversationId === conversationId) {
        console.log('ChatDetail: Processing message for current conversation');
        handleNewMessage(data);
      } else {
        console.log('ChatDetail: Ignoring message for different conversation');
      }
    });

    newSocket.on('message_sent', (data) => {
      console.log('=== CHAT DETAIL: MESSAGE SENT CONFIRMATION ===');
      console.log('Data:', data);
      console.log('Current conversationId:', conversationId);
      console.log('Message conversationId:', data.conversationId);
      console.log('Is current conversation?', conversationId === data.conversationId);
      console.log('===============================================');
      
      const { conversationId: msgConvId, message } = data;
      if (message && msgConvId === conversationId) {
        // Reset WebSocket failed flag when message sent successfully
        setWebSocketFailed(false);
        setIsConnected(true);
        
        setChatMessages((prev: any) => {
          const currentMessages = prev[msgConvId] || [];
          const updatedMessages = currentMessages.map((msg: any) => {
            if (msg.id === message.tempId) {
              console.log('ChatDetail: Updating message status from sending to sent:', msg.id, '->', message._id);
              return { ...msg, id: message._id, isSending: false, serverId: message._id };
            }
            return msg;
          });
          
          // Check if message already exists with server ID
          const messageExists = updatedMessages.some((msg: any) => 
            (message._id && msg.serverId === message._id) ||
            (message._id && msg.id === message._id) ||
            (msg.serverId && msg.serverId === message._id) ||
            (msg.id === message._id && msg.text === message.text)
          );
          
          if (messageExists) {
            console.log('ChatDetail: Message already exists with server ID, skipping duplicate');
            return prev;
          }
          
          console.log('ChatDetail: Updated messages with sent status for conversation:', msgConvId);
          return {
            ...prev,
            [msgConvId]: updatedMessages,
          };
        });
      } else {
        console.log('ChatDetail: Message sent confirmation not for current conversation');
      }
    });

    newSocket.on('conversation_updated', (data) => {
      console.log('ChatDetail: Conversation updated:', data);
      // Reset WebSocket failed flag when conversation updated
      setWebSocketFailed(false);
      setIsConnected(true);
      
      handleConversationUpdate(data);
    });

    newSocket.on('error', (error) => {
      // Only log non-send-message errors to reduce spam
      if (error.message !== 'Failed to send message') {
        console.error('ChatDetail: Socket error:', error);
        setWebSocketFailed(true);
      }
      
      // Try to rejoin conversation after error
      if (conversationId) {
        setTimeout(() => {
          if (newSocket && newSocket.connected) {
            newSocket.emit('join_conversation', conversationId);
            console.log('ChatDetail: Re-joined conversation after error');
          }
        }, 1000);
      }
    });

    // Add reconnection event handlers
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('ChatDetail: Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setWebSocketFailed(false);
      
      // Rejoin conversation after reconnection
      if (conversationId) {
        newSocket.emit('join_conversation', conversationId);
        console.log('ChatDetail: Re-joined conversation after reconnection');
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('ChatDetail: Socket reconnection attempt', attemptNumber);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('ChatDetail: Socket reconnection error:', error);
      setWebSocketFailed(true);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('ChatDetail: Socket reconnection failed');
      setWebSocketFailed(true);
    });

    setSocket(newSocket);
  }, [accessToken]);

  // Handle new message from WebSocket
  const handleNewMessage = React.useCallback((data: any) => {
    const { conversationId: msgConvId, message } = data;
    
    console.log('=== CHAT DETAIL: HANDLING NEW MESSAGE ===');
    console.log('Message data:', message);
    console.log('Message conversationId:', msgConvId);
    console.log('Current conversationId:', conversationId);
    console.log('Message sender:', message.senderId, 'Current user:', user?._id);
    console.log('Is for current conversation?', msgConvId === conversationId);
    console.log('==========================================');
    
    if (message && msgConvId === conversationId) {
      // Skip echoes of my own message; REST already updated UI
      if (message.senderId === user?._id) {
        console.log('ChatDetail: Skipping own-message echo from WS');
        return;
      }
      if (hasSeenMessage(msgConvId, message._id)) {
        console.log('ChatDetail: Already seen serverId, skipping');
        return;
      }
      console.log('ChatDetail: Processing new message for conversation:', msgConvId);
      
      const newMessage = {
        id: message._id || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: message.text || '',
        sender: message.senderId === user?._id ? 'me' : 'other',
        time: message.createdAt ? new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        files: message.files || [],
        type: message.type || 'text',
        serverId: message._id, // Store server ID separately
        isSending: false // New messages are always sent
      };

      console.log('ChatDetail: Created message object:', newMessage);
      // Mark as seen early to avoid racey double-adds
      markMessageSeen(msgConvId, newMessage.serverId, newMessage.id);

      // Update chat messages
      setChatMessages((prev: any) => {
        const currentMessages = prev[msgConvId] || [];
        
        // Check duplicates by serverId or id
        const messageExists = currentMessages.some((msg: any) => 
          (newMessage.serverId && (msg.serverId === newMessage.serverId || msg.id === newMessage.serverId)) ||
          (msg.serverId && msg.serverId === newMessage.id) ||
          (msg.id === newMessage.id)
        );
        
        if (messageExists) {
          console.log('ChatDetail: Message already exists, skipping duplicate');
          return prev;
        }
        
        console.log('ChatDetail: Adding new message to chat messages for conversation:', msgConvId);
        const updatedMessages = [...currentMessages, newMessage];
        console.log('ChatDetail: Updated messages count:', updatedMessages.length);
        
        return {
          ...prev,
          [msgConvId]: updatedMessages,
        };
      });

      // Auto-scroll only if user is already near the bottom
      if (newMessage.sender === 'other' && isNearBottomRef.current) {
        console.log('ChatDetail: Auto-scrolling to bottom for new message from other (user near bottom)');
        setTimeout(() => {
          if (flatListRef.current) {
            (flatListRef.current as any).scrollToEnd({ animated: true });
            console.log('ChatDetail: Auto-scroll completed');
          }
        }, 100);
      }
    } else {
      console.log('ChatDetail: Message not for current conversation. Current:', conversationId, 'Message:', msgConvId);
    }
  }, [conversationId, user?._id]);

  // Handle conversation updates
  const handleConversationUpdate = React.useCallback((data: any) => {
    const { conversationId: msgConvId, lastMessage, unreadCount } = data;
    
    if (msgConvId === conversationId) {
      console.log('ChatDetail: Handling conversation update for current conversation:', { msgConvId, unreadCount, lastMessage });
      
      // Update conversation info if needed
      setSelectedChat((prev: any) => ({
        ...prev,
        lastMessage: lastMessage || prev?.lastMessage,
      }));
    }
  }, [conversationId]);

  // Load messages for current conversation
  const loadMessages = React.useCallback(async () => {
    if (!conversationId) return;
    
    try {
      console.log('ChatDetail: Loading messages for conversation:', conversationId);
      const res = await fetch(`${API_URL}/api/chat/${conversationId}/messages?page=1&limit=50`, { 
        headers: authHeaders() 
      });
      
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      
      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();
      const data = contentType.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
      const list = Array.isArray((data as any).items) ? (data as any).items : (Array.isArray(data) ? data : (data.messages || []));
      
      const messages = list.map((m: any, idx: number) => ({
        id: m._id || `load_${Date.now()}_${idx}`,
        text: m.text || '',
        sender: (m.isMine !== undefined) ? (m.isMine ? 'me' : 'other') : (m.senderId === user?._id ? 'me' : 'other'),
        time: (m.createdAt || m.sentAt) ? new Date(m.createdAt || m.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
        files: m.files || [],
        type: m.type || 'text',
        serverId: m._id // Store server ID separately
      }));
      
      // Always replace messages when loading to prevent duplicates
      setChatMessages((prev: any) => {
        console.log('ChatDetail: Loading messages for conversation:', conversationId);
        console.log('ChatDetail: Previous messages count:', prev[conversationId]?.length || 0);
        console.log('ChatDetail: New messages count:', messages.length);
        
        return {
          ...prev,
          [conversationId]: messages, // Replace instead of merge
        };
      });
      
      // Auto-scroll to bottom after initial load only once per mount/conv
      setTimeout(() => { 
        if (flatListRef.current && !didInitialAutoScrollRef.current) {
          (flatListRef.current as any).scrollToEnd({ animated: false });
          didInitialAutoScrollRef.current = true;
        }
      }, 100);
      // Seed seen ids for loaded list
      try {
        if (messages?.length) {
          markMessageSeen(conversationId, ...messages.map((m: any) => m.serverId || m.id));
        }
      } catch {}
    } catch (e) {
      console.log('ChatDetail: Error loading messages:', e);
    }
  }, [conversationId, user?._id]);

  // Mark conversation as read
  const markConversationAsRead = async (convId: string) => {
    try {
      console.log('ChatDetail: Marking conversation as read:', convId);
      const response = await fetch(`${API_URL}/api/chat/${convId}/read`, {
        method: 'POST',
        headers: authHeaders(),
      });
      
      if (response.ok) {
        console.log('ChatDetail: Successfully marked conversation as read');
        // Emit unread count update
        DeviceEventEmitter.emit('chat_unread_count', 0);
      } else {
        console.log('ChatDetail: Failed to mark conversation as read:', response.status);
      }
    } catch (error) {
      console.log('ChatDetail: Error marking conversation as read:', error);
    }
  };

  // Send message via REST API
  const sendMessageViaREST = React.useCallback(async (convId: string, text: string, tempMessage: any) => {
    try {
      console.log('=== CHAT DETAIL: SENDING MESSAGE VIA REST API ===');
      console.log('ConversationId:', convId);
      console.log('Text:', text);
      console.log('TempMessage:', tempMessage);
      console.log('================================================');
      
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ conversationId: convId, text, files: [] }),
      });
      
      if (res.status === 401) {
        await logout();
        (navigation as any).navigate('Tài khoản');
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();
      const data = contentType.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
      const serverMsg = data.message || data;
      
      console.log('ChatDetail: REST API response:', serverMsg);
      
      const realMessage = {
        id: serverMsg?._id || `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: serverMsg?.text || text,
        sender: 'me',
        time: serverMsg?.createdAt ? new Date(serverMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isSending: false, // Message is sent
        serverId: serverMsg?._id // Store server ID separately
      };
      
      console.log('ChatDetail: Created real message from REST API:', realMessage);
      // Mark as seen to avoid WS echo dup
      markMessageSeen(convId, realMessage.serverId, realMessage.id, tempMessage?.id);
      
      setChatMessages((prev: any) => {
        const currentMessages = prev[convId] || [];
        let replaced = false;
        const updatedMessages = currentMessages.map((msg: any) => {
          if (msg.id === tempMessage.id || (msg.serverId && msg.serverId === realMessage.serverId)) {
            replaced = true;
            return realMessage;
          }
          return msg;
        });
        
        // Check if message already exists with server ID
        const messageExists = updatedMessages.some((msg: any) => 
          (realMessage.serverId && (msg.serverId === realMessage.serverId || msg.id === realMessage.serverId)) ||
          (msg.id === realMessage.id)
        );
        
        if (messageExists) {
          console.log('ChatDetail: Message already exists with server ID, skipping duplicate');
          return { ...prev, [convId]: updatedMessages };
        }
        
        console.log('ChatDetail: Updated message status to sent via REST API');
        return {
          ...prev,
          [convId]: replaced ? updatedMessages : [...updatedMessages, realMessage],
        };
      });
    } catch (e) {
      console.error('ChatDetail: REST API fallback failed:', e);
      setChatMessages((prev: any) => ({
        ...prev,
        [convId]: prev[convId]?.filter((msg: any) => msg.id !== tempMessage.id) || [],
      }));
    }
  }, []);

  // Send message
  const sendMessage = React.useCallback(async () => {
    if (!newMessage.trim() || !conversationId) return;
    
    const text = newMessage.trim();
    
    const tempMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      sender: 'me',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isSending: true
    };
    
    console.log('=== CHAT DETAIL: SENDING MESSAGE ===');
    console.log('ConversationId:', conversationId);
    console.log('Text:', text);
    console.log('TempMessage:', tempMessage);
    console.log('====================================');
    
    setChatMessages((prev: any) => {
      const currentMessages = prev[conversationId] || [];
      
      // Check if message already exists
      const messageExists = currentMessages.some((msg: any) => 
        msg.id === tempMessage.id || 
        (msg.text === tempMessage.text && msg.sender === tempMessage.sender && Math.abs(new Date(msg.time).getTime() - new Date(tempMessage.time).getTime()) < 500)
      );
      
      if (messageExists) {
        console.log('ChatDetail: Message already exists, skipping duplicate');
        return prev;
      }
      
      console.log('ChatDetail: Adding temp message to chat messages');
      return {
        ...prev,
        [conversationId]: [...currentMessages, tempMessage],
      };
    });
    
    setNewMessage('');
    // Auto-scroll after sending my own message (expected behavior)
    setTimeout(() => { 
      if (flatListRef.current) {
        (flatListRef.current as any).scrollToEnd({ animated: true }); 
      }
    }, 100);
    
    try {
      // Always use REST API for sending messages to avoid WebSocket issues
      console.log('ChatDetail: Sending message via REST API:', { conversationId, text, tempId: tempMessage.id });
      await sendMessageViaREST(conversationId, text, tempMessage);
    } catch (e) {
      console.error('ChatDetail: Error sending message:', e);
      setChatMessages((prev: any) => ({
        ...prev,
        [conversationId]: prev[conversationId]?.filter((msg: any) => msg.id !== tempMessage.id) || [],
      }));
      Alert.alert('Lỗi', 'Không gửi được tin nhắn');
    }
  }, [newMessage, conversationId, socket, isConnected, sendMessageViaREST]);

  // Get messages for current chat
  const getCurrentMessages = React.useCallback(() => {
    if (!conversationId) return [];
    return chatMessages[conversationId] || [];
  }, [conversationId, chatMessages]);

  // Render message
  const renderMessage = React.useCallback(({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'me' ? styles.myMessage : styles.otherMessage,
      item.isSending && styles.sendingMessage
    ]}>
      {item.files && item.files.length > 0 && (
        <View style={styles.fileContainer}>
          {item.files.map((file: any, index: number) => (
            <View key={index} style={styles.fileItem}>
              {file.type?.startsWith('image/') ? (
                <Image 
                  source={{ uri: file.url }} 
                  style={styles.fileImage}
                  resizeMode="cover"
                />
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
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>{item.time}</Text>
        {item.sender === 'me' && (
          <View style={styles.messageStatus}>
            {item.isSending ? (
              <Ionicons name="time" size={12} color="#999" />
            ) : (
              <Ionicons name="checkmark" size={12} color="#4CAF50" />
            )}
          </View>
        )}
      </View>
    </View>
  ), []);

  // Handle back to list
  const handleBackToList = React.useCallback(async () => {
    try {
      if (conversationId) {
        // Mark as read when leaving detail
        await markConversationAsRead(conversationId);
      }
      if (conversationId && socket && isConnected) {
        socket.emit('leave_conversation', conversationId);
      }
    } catch {}
    navigation.goBack();
  }, [conversationId, socket, isConnected, navigation]);

  // Handle swipe gesture
  const onSwipeGesture = React.useCallback((event) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationX > 50) {
        handleBackToList();
      }
    }
  }, [handleBackToList]);

  // Dismiss keyboard
  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Initialize chat
  useEffect(() => {
    if (conversationId) {
      console.log('=== CHAT DETAIL: INITIALIZING CHAT ===');
      console.log('ConversationId:', conversationId);
      console.log('PeerName:', peerName);
      console.log('Socket connected:', isConnected);
      console.log('Socket available:', !!socket);
      console.log('=====================================');
      
      setSelectedChat({
        id: conversationId,
        name: peerName,
        avatar: (peerName || 'U')[0]?.toUpperCase() || 'U',
        online: false,
        product: '',
      });
      
      loadMessages();
      markConversationAsRead(conversationId);
      
      // Join sẽ được thực hiện ở effect khi socket connected/conversationId đổi
    }
  }, [conversationId, peerName, socket, isConnected]); // Added socket and isConnected dependencies

  // Initialize WebSocket
  useEffect(() => {
    if (accessToken && !socket) {
      console.log('ChatDetail: Initializing WebSocket for real-time updates');
      initializeSocket();
    }
  }, [accessToken, socket, initializeSocket]);

  // Join conversation once when socket is connected or conversation changes
  useEffect(() => {
    if (socket && isConnected && conversationId) {
      console.log('ChatDetail: Joining conversation (effect):', conversationId);
      socket.emit('join_conversation', conversationId);
    }
  }, [socket, isConnected, conversationId]);

  // Remove redundant multi-emit join logic

  // Focus effect
  useFocusEffect(
    React.useCallback(() => {
      console.log('=== CHAT DETAIL: GAINED FOCUS ===');
      console.log('ConversationId:', conversationId);
      console.log('Socket connected:', isConnected);
      console.log('Socket available:', !!socket);
      console.log('User ID:', user?._id);
      console.log('=================================');
      
      if (conversationId) {
        markConversationAsRead(conversationId);
        if (socket && isConnected) {
          console.log('ChatDetail: Rejoining conversation on focus:', conversationId);
          socket.emit('join_conversation', conversationId);
        }
      }
      
      return () => {};
    }, [conversationId, socket, isConnected, user?._id])
  );

  if (!selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
                  <View style={[styles.connectionStatus, { paddingLeft: 0, marginRight: 0, marginTop: 2 }]}>
                    <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF6B6B' }]} />
                    <Text style={styles.statusText}>{isConnected ? 'Trực tuyến' : 'Ngoại tuyến'}</Text>
                  </View>
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
                  keyExtractor={item => (item.serverId || item.id).toString()}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  removeClippedSubviews={true}
                  initialNumToRender={10}
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                    const threshold = 80; // px
                    isNearBottomRef.current = distanceFromBottom <= threshold;
                  }}
                  onContentSizeChange={() => {
                    // Don't auto-scroll on content size change to prevent scroll issues
                  }}
                  // Avoid auto-scrolling on layout; handled after initial load
                />
              </View>
            </TouchableWithoutFeedback>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TouchableOpacity 
                style={[styles.attachButton, uploadingFiles && styles.uploadingButton]}
                onPress={() => {}}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  chatDetailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 10,
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    paddingLeft: 30,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  statusText: {
    fontSize: 10,
    color: '#666',
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
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageStatus: {
    marginLeft: 4,
  },
  sendingMessage: {
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12, // Normal padding since bottom nav is hidden
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
