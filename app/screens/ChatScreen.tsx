import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
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

export default function ChatScreen() {
  const navigation = useNavigation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState({});
  const flatListRef = useRef(null);

  // Mock chat data
  const chatList = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      lastMessage: 'Xe còn không bạn?',
      time: '14:30',
      unread: 2,
      avatar: 'A',
      online: true,
      product: 'Xe máy điện VinFast Klara A2'
    },
    {
      id: 2,
      name: 'Trần Thị B',
      lastMessage: 'Giá này có thương lượng được không?',
      time: '12:15',
      unread: 0,
      avatar: 'B',
      online: false,
      product: 'Pin xe máy điện Lithium 60V'
    },
    {
      id: 3,
      name: 'Lê Văn C',
      lastMessage: 'Tôi muốn xem xe trực tiếp',
      time: '10:45',
      unread: 1,
      avatar: 'C',
      online: true,
      product: 'Ô tô điện VinFast VF8'
    }
  ];

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

  const sendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      const currentMessages = chatMessages[selectedChat.id] || [];
      const message = {
        id: currentMessages.length + 1,
        text: newMessage.trim(),
        sender: 'me',
        time: new Date().toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      
      setChatMessages(prev => ({
        ...prev,
        [selectedChat.id]: [...currentMessages, message]
      }));
      
      setNewMessage('');
      
      // Auto scroll to bottom after sending
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 10);
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

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => {
        initializeMessages();
        setSelectedChat(item);
        // Hide bottom navigation
        navigation.getParent()?.setOptions({
          tabBarStyle: { display: 'none' }
        });
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
      <Text style={[
        styles.messageText,
        item.sender === 'me' ? styles.myMessageText : styles.otherMessageText
      ]}>
        {item.text}
      </Text>
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

  const handleImagePicker = () => {
    const options = ['Chụp ảnh', 'Chọn từ thư viện', 'Hủy'];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          title: 'Chọn ảnh'
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            // Camera
            Alert.alert('Camera', 'Mở camera để chụp ảnh');
          } else if (buttonIndex === 1) {
            // Gallery
            Alert.alert('Thư viện', 'Mở thư viện ảnh');
          }
        }
      );
    } else {
      Alert.alert(
        'Chọn ảnh',
        'Bạn muốn chụp ảnh mới hay chọn từ thư viện?',
        [
          { text: 'Chụp ảnh', onPress: () => Alert.alert('Camera', 'Mở camera để chụp ảnh') },
          { text: 'Thư viện', onPress: () => Alert.alert('Thư viện', 'Mở thư viện ảnh') },
          { text: 'Hủy', style: 'cancel' }
        ]
      );
    }
  };

  const handleMicPress = () => {
    Alert.alert('Ghi âm', 'Tính năng ghi âm sẽ được phát triển trong tương lai');
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
              style={styles.attachButton}
              onPress={handleImagePicker}
            >
              <Ionicons name="image" size={20} color="#666" />
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
            
            {newMessage.trim() ? (
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={sendMessage}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.micButton}
                onPress={handleMicPress}
              >
                <Ionicons name="mic" size={20} color="#666" />
              </TouchableOpacity>
            )}
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
    alignItems: 'space-around',
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
  micButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
