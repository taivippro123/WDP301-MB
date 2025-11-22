# HƯỚNG DẪN CHI TIẾT VỀ CODEBASE - PHẦN 2

## 📋 MỤC LỤC
1. [API và HTTP Requests](#1-api-và-http-requests)
2. [Authentication và Context API](#2-authentication-và-context-api)
3. [Các tính năng chính](#3-các-tính-năng-chính)
4. [Các thư viện quan trọng](#4-các-thư-viện-quan-trọng)
5. [Câu hỏi thường gặp khi thuyết trình](#5-câu-hỏi-thường-gặp-khi-thuyết-trình)

---

## 1. API VÀ HTTP REQUESTS

### 1.1. API là gì?

**API (Application Programming Interface)** là cách ứng dụng giao tiếp với server để:
- Lấy dữ liệu (GET)
- Gửi dữ liệu mới (POST)
- Cập nhật dữ liệu (PUT/PATCH)
- Xóa dữ liệu (DELETE)

**Trong dự án:**
- Server API: `https://electric-vehicle-marketplace.onrender.com`
- File cấu hình: `config/api.js`

```javascript
// File: config/api.js
const API_URL = 'https://electric-vehicle-marketplace.onrender.com'
export default API_URL;
```

---

### 1.2. Fetch API - Gọi API

**Fetch là gì?**
- `fetch()` là hàm JavaScript để gọi HTTP requests
- Trả về Promise (bất đồng bộ)

**Cú pháp cơ bản:**
```tsx
const response = await fetch(url, options);
const data = await response.json();
```

**Ví dụ GET - Lấy danh sách sản phẩm:**
```tsx
// File: app/screens/HomeScreen.tsx
const fetchProducts = async () => {
  setIsLoading(true);
  try {
    const url = `${API_URL}/api/products?status=active&sort=priority`;
    const res = await fetch(url);
    
    if (res.ok) {
      const json = await res.json();
      setProducts(json);
    } else {
      setErrorText('Không tải được danh sách');
    }
  } catch (e) {
    setErrorText('Lỗi kết nối');
  } finally {
    setIsLoading(false);
  }
};
```

**Giải thích:**
- `fetch(url)`: Gọi GET request đến URL
- `res.ok`: Kiểm tra status code 200-299 (thành công)
- `res.json()`: Parse response thành JavaScript object
- `try/catch`: Xử lý lỗi
- `finally`: Luôn chạy (dù thành công hay lỗi)

**Ví dụ POST - Đăng nhập:**
```tsx
// File: app/screens/LoginScreen.tsx
const handleLogin = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.phoneOrEmail,
        password: formData.password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Đăng nhập thành công
      await login({
        _id: data._id,
        name: data.name,
        email: data.email,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } else {
      Alert.alert('Lỗi', data.message || 'Đăng nhập thất bại');
    }
  } catch (error) {
    Alert.alert('Lỗi', 'Không thể kết nối đến server');
  } finally {
    setIsLoading(false);
  }
};
```

**Giải thích:**
- `method: 'POST'`: Phương thức HTTP
- `headers`: Thông tin bổ sung (Content-Type cho JSON)
- `body: JSON.stringify(...)`: Dữ liệu gửi lên (phải stringify object)

**Ví dụ với Authorization header:**
```tsx
// File: app/screens/HomeScreen.tsx
const fetchWishlist = async () => {
  if (!accessToken) return;
  
  try {
    const res = await fetch(`${API_URL}/api/profile/wishlist`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // Token xác thực
      },
    });
    
    if (res.ok) {
      const json = await res.json();
      setWishlistItems(json);
    }
  } catch (e) {
    // Xử lý lỗi
  }
};
```

**Giải thích:**
- `Authorization: Bearer ${accessToken}`: Gửi token để server biết user là ai
- Server kiểm tra token → cho phép/từ chối request

---

### 1.3. Xử lý lỗi API

**Các loại lỗi:**
1. **Lỗi mạng**: Không kết nối được server
2. **Lỗi 401**: Token hết hạn → cần đăng nhập lại
3. **Lỗi 404**: Không tìm thấy dữ liệu
4. **Lỗi 500**: Lỗi server

**Xử lý trong code:**
```tsx
// File: app/screens/HomeScreen.tsx
const fetchProducts = async () => {
  try {
    const res = await fetch(url);
    
    if (res.status === 401) {
      // Token hết hạn → đăng xuất
      await logout();
      navigation.navigate('Tài khoản');
      return;
    }
    
    if (!res.ok) {
      setErrorText('Không tải được dữ liệu');
      return;
    }
    
    const json = await res.json();
    setProducts(json);
  } catch (e) {
    // Lỗi mạng hoặc lỗi khác
    setErrorText('Không tải được danh sách sản phẩm');
  }
};
```

---

### 1.4. Query Parameters - Tham số URL

**Query parameters** là tham số truyền qua URL:
```
https://api.example.com/products?status=active&sort=price&min_price=1000000
```

**Tạo query string:**
```tsx
// File: app/screens/HomeScreen.tsx
const params = new URLSearchParams();
params.set('status', 'active');
params.set('sort', 'priority');
if (searchText) params.set('q', searchText);
if (filterCategory) params.set('category', filterCategory);
if (minPrice) params.set('min_price', String(minPrice));

const url = `${API_URL}/api/products?${params.toString()}`;
// Kết quả: /api/products?status=active&sort=priority&q=xe%20dien&category=vehicle
```

---

## 2. AUTHENTICATION VÀ CONTEXT API

### 2.1. Authentication là gì?

**Authentication (Xác thực)** là quá trình xác định người dùng là ai:
1. User đăng nhập với email/password
2. Server trả về **accessToken** (giống như chìa khóa)
3. Mỗi request sau đó gửi kèm token
4. Server kiểm tra token → cho phép/từ chối

**Flow đăng nhập:**
```
User nhập email/password
    ↓
Gửi POST /api/auth/login
    ↓
Server kiểm tra → trả về token
    ↓
Lưu token vào AsyncStorage
    ↓
Dùng token cho các request sau
```

---

### 2.2. Context API - Quản lý state toàn cục

**Context API là gì?**
- Cơ chế React để chia sẻ state giữa nhiều component
- Không cần truyền props qua nhiều cấp

**Cấu trúc:**
```tsx
// 1. Tạo Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Tạo Provider (cung cấp dữ liệu)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  
  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Tạo Hook để dùng (custom hook)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### 2.3. AuthContext trong dự án

**File: `app/AuthContext.tsx`**

**1. Định nghĩa interface:**
```tsx
interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: (payload: {...}) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}
```

**2. Provider component:**
```tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Đọc từ AsyncStorage khi app khởi động
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const raw = await AsyncStorage.getItem('auth_state_v1');
        if (raw) {
          const parsed: AuthState = JSON.parse(raw);
          setState(parsed); // Khôi phục trạng thái
        }
      } catch (error) {
        // Xử lý lỗi
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthState();
  }, []);

  // Lưu vào AsyncStorage
  const persistState = async (next: AuthState) => {
    setState(next);
    try {
      await AsyncStorage.setItem('auth_state_v1', JSON.stringify(next));
    } catch (error) {
      // Xử lý lỗi
    }
  };

  // Hàm đăng nhập
  const login = async (payload: {...}) => {
    const next: AuthState = {
      user: {
        _id: payload._id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      },
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    };
    await persistState(next); // Lưu vào state và AsyncStorage
  };

  // Hàm đăng xuất
  const logout = async () => {
    const next: AuthState = { user: null, accessToken: null, refreshToken: null };
    await persistState(next); // Xóa state và AsyncStorage
  };

  const value: AuthContextType = useMemo(() => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: Boolean(state.user && state.accessToken),
    login,
    logout,
    isLoading,
  }), [state, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

**3. Sử dụng trong component:**
```tsx
// File: app/screens/HomeScreen.tsx
import { useAuth } from '../AuthContext';

export default function HomeScreen() {
  const { accessToken, user, logout } = useAuth();
  
  // Dùng accessToken để gọi API
  const fetchWishlist = async () => {
    const res = await fetch(`${API_URL}/api/profile/wishlist`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  };
}
```

**Giải thích:**
- `useAuth()`: Lấy tất cả thông tin auth từ Context
- Không cần truyền props qua nhiều component
- Tất cả component đều có thể dùng `useAuth()`

---

### 2.4. Protected Routes - Bảo vệ màn hình

**Protected Routes** là màn hình chỉ cho phép user đã đăng nhập truy cập.

**Cách làm:**
```tsx
// File: app/_layout.tsx
function ProtectedScreen({ children, screenName, navigation }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Đang load → hiển thị loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Đang khôi phục phiên đăng nhập...</Text>
      </View>
    );
  }

  // Chưa đăng nhập → hiển thị màn hình đăng nhập
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Đã đăng nhập → hiển thị màn hình bình thường
  return children;
}

// Sử dụng
<Tab.Screen name="Quản lí tin">
  {({ navigation }) => (
    <ProtectedScreen screenName="Quản lí tin" navigation={navigation}>
      <ManageListingsScreen />
    </ProtectedScreen>
  )}
</Tab.Screen>
```

---

## 3. CÁC TÍNH NĂNG CHÍNH

### 3.1. Đăng tin bán (PostListingScreen)

**Chức năng:**
- Người bán nhập thông tin sản phẩm
- Upload ảnh/video
- Chọn danh mục, nhập giá, mô tả...
- Gửi lên server

**Các bước:**

**1. Quản lý form data:**
```tsx
// File: app/screens/PostListingScreen.tsx
const [formData, setFormData] = useState({
  title: '',
  description: '',
  price: '',
  category: 'vehicle',
  brand: '',
  model: '',
  // ...
});

const updateFormData = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

**2. Upload ảnh/video:**
```tsx
import * as ImagePicker from 'expo-image-picker';

const pickMedia = async () => {
  // Yêu cầu quyền truy cập
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
    return;
  }

  // Mở thư viện
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All, // Cả ảnh và video
    allowsMultipleSelection: true, // Chọn nhiều file
    quality: 0.8,
    selectionLimit: 10,
  });

  if (!result.canceled && result.assets.length > 0) {
    setSelectedMedia(result.assets);
  }
};
```

**3. Upload lên server:**
```tsx
const uploadMedia = async (uri, type) => {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: type === 'video' ? 'video/mp4' : 'image/jpeg',
    name: type === 'video' ? 'video.mp4' : 'image.jpg',
  });

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const json = await res.json();
  return json.url; // URL của file đã upload
};
```

**4. Submit form:**
```tsx
const handleSubmit = async () => {
  setSubmitting(true);
  try {
    // Upload tất cả media
    const mediaUrls = await Promise.all(
      selectedMedia.map(media => uploadMedia(media.uri, media.type))
    );

    // Gửi dữ liệu sản phẩm
    const res = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...formData,
        images: mediaUrls,
        price: parsePrice(formData.price),
      }),
    });

    if (res.ok) {
      Alert.alert('Thành công', 'Đã đăng tin thành công!');
      navigation.goBack();
    }
  } catch (e) {
    Alert.alert('Lỗi', 'Không thể đăng tin');
  } finally {
    setSubmitting(false);
  }
};
```

---

### 3.2. Chat (Real-time messaging)

**Chức năng:**
- Người mua và người bán nhắn tin với nhau
- Real-time (tin nhắn hiện ngay lập tức)
- Gửi ảnh, file

**Công nghệ:**
- **Socket.IO**: Thư viện WebSocket để real-time communication

**Cách hoạt động:**

**1. Kết nối WebSocket:**
```tsx
// File: app/screens/ChatDetailScreen.tsx
import { io, Socket } from 'socket.io-client';

const [socket, setSocket] = useState<Socket | null>(null);

useEffect(() => {
  if (!accessToken) return;

  // Kết nối đến server
  const newSocket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });

  // Lắng nghe sự kiện kết nối
  newSocket.on('connect', () => {
    console.log('Đã kết nối');
    setIsConnected(true);
    
    // Tham gia phòng chat
    if (conversationId) {
      newSocket.emit('join_conversation', conversationId);
    }
  });

  // Lắng nghe tin nhắn mới
  newSocket.on('new_message', (data) => {
    setChatMessages(prev => [...prev, data]);
  });

  setSocket(newSocket);

  // Cleanup khi unmount
  return () => {
    newSocket.disconnect();
  };
}, [accessToken, conversationId]);
```

**2. Gửi tin nhắn:**
```tsx
const sendMessage = async () => {
  if (!newMessage.trim() || !socket) return;

  // Gửi qua WebSocket (real-time)
  socket.emit('send_message', {
    conversationId,
    content: newMessage,
  });

  // Đồng thời gửi qua HTTP (backup)
  await fetch(`${API_URL}/api/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      conversationId,
      content: newMessage,
    }),
  });

  setNewMessage('');
};
```

**3. Lấy lịch sử tin nhắn:**
```tsx
const fetchMessages = async () => {
  try {
    const res = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const json = await res.json();
    setChatMessages(json.messages || []);
  } catch (e) {
    // Xử lý lỗi
  }
};
```

**Giải thích WebSocket:**
- **HTTP**: Client gửi request → Server trả response → Ngắt kết nối
- **WebSocket**: Client kết nối → Giữ kết nối → Server có thể gửi data bất cứ lúc nào

**Ví dụ:**
```
User A gửi tin nhắn
    ↓
Server nhận tin nhắn
    ↓
Server gửi tin nhắn đến User B qua WebSocket (ngay lập tức)
    ↓
User B thấy tin nhắn mới
```

---

### 3.3. Thanh toán ZaloPay

**Chức năng:**
- Người dùng nạp tiền vào ví Ecoin qua ZaloPay
- Thanh toán đơn hàng qua ZaloPay

**Cách hoạt động:**

**1. Tạo đơn thanh toán:**
```tsx
// File: app/screens/TopUpScreen.tsx
const createZaloPayOrder = async (amount: number) => {
  try {
    const res = await fetch(`${API_URL}/api/zalopay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: amount,
        description: 'Nạp tiền vào ví Ecoin',
      }),
    });

    const data = await res.json();
    return data.orderUrl; // URL để mở ZaloPay
  } catch (e) {
    Alert.alert('Lỗi', 'Không thể tạo đơn thanh toán');
  }
};
```

**2. Mở ZaloPay app:**
```tsx
import * as Linking from 'expo-linking';

const openZaloPay = async (orderUrl: string) => {
  try {
    // Thử mở ZaloPay app
    const canOpen = await Linking.canOpenURL('zalopay://app');
    if (canOpen) {
      await Linking.openURL(orderUrl);
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy ứng dụng ZaloPay');
    }
  } catch (e) {
    Alert.alert('Lỗi', 'Không thể mở ZaloPay');
  }
};
```

**3. Kiểm tra trạng thái thanh toán:**
```tsx
const checkPaymentStatus = async (orderId: string) => {
  const res = await fetch(`${API_URL}/api/zalopay/order/${orderId}/status`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (data.status === 'paid') {
    // Thanh toán thành công
    Alert.alert('Thành công', 'Đã nạp tiền thành công!');
    fetchBalance(); // Cập nhật số dư
  }
};
```

**Flow thanh toán:**
```
User chọn số tiền nạp
    ↓
App gọi API tạo đơn thanh toán
    ↓
Server trả về orderUrl
    ↓
App mở ZaloPay với orderUrl
    ↓
User thanh toán trong ZaloPay
    ↓
ZaloPay gọi callback về server
    ↓
App kiểm tra trạng thái thanh toán
    ↓
Cập nhật số dư ví Ecoin
```

---

### 3.4. Vận chuyển (Giao Hàng Nhanh - GHN)

**Chức năng:**
- Tính phí ship dựa trên địa chỉ gửi/nhận
- Tạo đơn vận chuyển
- Theo dõi đơn hàng

**Cách hoạt động:**

**1. Tính phí ship:**
```tsx
// File: app/screens/ConfirmOrderScreen.tsx
const calculateShipping = async () => {
  setIsCalculating(true);
  try {
    const payload = {
      service_type_id: 2, // Loại dịch vụ GHN
      from_district_id: Number(sellerAddr.districtCode),
      from_ward_code: String(sellerAddr.wardCode),
      to_district_id: Number(receiver.districtCode),
      to_ward_code: String(receiver.wardCode),
      length: product.length || 30,
      width: product.width || 40,
      height: product.height || 20,
      weight: product.weight || 3000,
      insurance_value: 0,
      cod_value: 0, // Không thu hộ
    };

    const res = await fetch(`${API_URL}/api/shipping/fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const totalFee = Number(data.data?.total ?? 0);
    setShippingFee(totalFee);
  } catch (e) {
    Alert.alert('Lỗi', 'Không thể tính phí ship');
  } finally {
    setIsCalculating(false);
  }
};
```

**2. Tạo đơn vận chuyển:**
```tsx
const createShippingOrder = async () => {
  const payload = {
    to_name: receiver.name,
    to_phone: receiver.phone,
    to_address: `${receiver.addressLine}, ${receiver.ward}, ${receiver.district}, ${receiver.province}`,
    to_ward_code: receiver.wardCode,
    to_district_id: Number(receiver.districtCode),
    weight: product.weight || 3000,
    length: product.length || 30,
    width: product.width || 40,
    height: product.height || 20,
    cod_amount: 0,
    service_type_id: 2,
  };

  const res = await fetch(`${API_URL}/api/shipping/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return data.order_code; // Mã vận đơn
};
```

**3. Theo dõi đơn hàng:**
```tsx
const trackOrder = async (orderCode: string) => {
  const res = await fetch(`${API_URL}/api/shipping/order/detail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ order_code: orderCode }),
  });

  const data = await res.json();
  return data; // Thông tin trạng thái vận chuyển
};
```

---

### 3.5. Ký hợp đồng điện tử

**Chức năng:**
- Tạo hợp đồng mua bán tự động
- Ký hợp đồng bằng chữ ký điện tử
- Xuất PDF

**Cách hoạt động:**

**1. Tạo hợp đồng HTML:**
```tsx
// File: app/screens/ContractScreen.tsx
const buildContractHtml = () => {
  const today = new Date();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { text-align: center; }
        </style>
      </head>
      <body>
        <h1>HỢP ĐỒNG MUA BÁN XE ĐIỆN</h1>
        <p>Hôm nay, ngày ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}</p>
        <p><strong>Bên bán:</strong> ${sellerName}</p>
        <p><strong>Bên mua:</strong> ${buyerName}</p>
        <p><strong>Sản phẩm:</strong> ${productTitle}</p>
        <p><strong>Giá:</strong> ${formatPrice(unitPrice)}</p>
        <!-- Nhiều điều khoản khác -->
      </body>
    </html>
  `;
  return html;
};
```

**2. Ký hợp đồng:**
```tsx
import Signature from 'react-native-signature-canvas';

const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

<Signature
  ref={signatureRef}
  onOK={(img) => {
    setSignatureDataUrl(img); // Lưu chữ ký dạng base64
  }}
  descriptionText="Ký tên vào đây"
  clearText="Xóa"
  confirmText="Xác nhận"
/>
```

**3. Upload chữ ký lên server:**
```tsx
const submitContract = async () => {
  if (!signatureDataUrl) {
    Alert.alert('Lỗi', 'Vui lòng ký hợp đồng');
    return;
  }

  const res = await fetch(`${API_URL}/api/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      productId,
      sellerId,
      buyerId: user._id,
      contractHtml: buildContractHtml(),
      buyerSignature: signatureDataUrl,
    }),
  });

  if (res.ok) {
    Alert.alert('Thành công', 'Đã ký hợp đồng thành công!');
  }
};
```

**4. Xuất PDF:**
```tsx
import * as Print from 'expo-print';

const exportToPdf = async () => {
  const html = buildContractHtml();
  const { uri } = await Print.printToFileAsync({ html });
  // uri là đường dẫn file PDF
  // Có thể chia sẻ hoặc lưu
};
```

---

### 3.6. Xem đơn hàng (OrderHistory)

**Chức năng:**
- Xem danh sách đơn hàng đã mua
- Xem trạng thái vận chuyển
- Xem chi tiết đơn hàng

**Cách hoạt động:**

**1. Lấy danh sách đơn hàng:**
```tsx
// File: app/screens/OrderHistory.tsx
const fetchOrders = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API_URL}/api/profile/orders?page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const json = await res.json();
    setOrders(json.orders || []);
  } catch (e) {
    setError('Không tải được đơn hàng');
  } finally {
    setLoading(false);
  }
};
```

**2. Hiển thị danh sách:**
```tsx
<FlatList
  data={orders}
  renderItem={({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
    >
      <Text>{item.orderNumber}</Text>
      <Text>{formatPrice(item.finalAmount)}</Text>
      <Text>Trạng thái: {item.status}</Text>
    </TouchableOpacity>
  )}
  keyExtractor={(item) => item._id}
/>
```

**3. Lấy thông tin vận chuyển:**
```tsx
const fetchShippingInfo = async (orderCode: string) => {
  const res = await fetch(`${API_URL}/api/shipping/order/detail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ order_code: orderCode }),
  });
  const data = await res.json();
  return data; // Thông tin: đang giao, đã giao, địa chỉ...
};
```

---

## 4. CÁC THƯ VIỆN QUAN TRỌNG

### 4.1. @react-navigation/bottom-tabs
- **Mục đích**: Tạo bottom tab navigation
- **Cách dùng**: `createBottomTabNavigator()`

### 4.2. @react-navigation/stack
- **Mục đích**: Tạo stack navigation
- **Cách dùng**: `createStackNavigator()`

### 4.3. @react-native-async-storage/async-storage
- **Mục đích**: Lưu trữ dữ liệu local
- **Cách dùng**: `AsyncStorage.setItem()`, `AsyncStorage.getItem()`

### 4.4. socket.io-client
- **Mục đích**: Real-time communication (chat)
- **Cách dùng**: `io(url, options)`

### 4.5. expo-image-picker
- **Mục đích**: Chọn ảnh/video từ thư viện
- **Cách dùng**: `ImagePicker.launchImageLibraryAsync()`

### 4.6. react-native-signature-canvas
- **Mục đích**: Ký chữ ký điện tử
- **Cách dùng**: `<Signature onOK={...} />`

### 4.7. expo-print
- **Mục đích**: Xuất PDF
- **Cách dùng**: `Print.printToFileAsync({ html })`

### 4.8. expo-linking
- **Mục đích**: Mở app khác (ZaloPay)
- **Cách dùng**: `Linking.openURL(url)`

---

## 5. CÂU HỎI THƯỜNG GẶP KHI THUYẾT TRÌNH

### Q1: Làm sao để di chuyển từ màn hình này sang màn hình khác?

**Trả lời:**
- Dùng **React Navigation**
- Có 2 cách:
  1. **Bottom Tab**: Bấm icon ở dưới màn hình
  2. **Stack Navigation**: Dùng `navigation.navigate('TênMànHình', { params })`

**Ví dụ:**
```tsx
// Từ HomeScreen → ProductDetailScreen
navigation.navigate('ProductDetail', { productId: '123' });
```

---

### Q2: AsyncStorage là gì? Dùng để làm gì?

**Trả lời:**
- AsyncStorage là thư viện lưu trữ dữ liệu **bền vững** trên thiết bị
- Dùng để:
  - Lưu token đăng nhập (không cần đăng nhập lại)
  - Lưu cache, settings...
- **Lưu ý**: Chỉ lưu string, object phải `JSON.stringify()`

**Ví dụ:**
```tsx
// Lưu
await AsyncStorage.setItem('token', 'abc123');

// Đọc
const token = await AsyncStorage.getItem('token');
```

---

### Q3: useEffect làm gì? Khi nào dùng?

**Trả lời:**
- `useEffect` chạy code **sau khi component render**
- Dùng khi:
  - Gọi API khi component mount
  - Đăng ký event listeners
  - Cleanup khi component unmount

**Ví dụ:**
```tsx
useEffect(() => {
  fetchProducts(); // Gọi API khi màn hình load
}, []); // Chạy 1 lần
```

---

### Q4: useState vs useRef khác nhau như thế nào?

**Trả lời:**
- **useState**: Thay đổi → component **render lại**
- **useRef**: Thay đổi → component **KHÔNG render lại**

**Khi nào dùng:**
- `useState`: Dữ liệu cần hiển thị trên UI (products, isLoading...)
- `useRef`: Dữ liệu không cần hiển thị (timer ID, ref đến TextInput...)

**Ví dụ:**
```tsx
const [count, setCount] = useState(0); // Render lại khi thay đổi
const timerRef = useRef(null); // Không render lại khi thay đổi
```

---

### Q5: View, TextInput, Text làm gì?

**Trả lời:**
- **View**: Container (giống `<div>`)
- **Text**: Hiển thị văn bản (giống `<p>`, `<span>`)
- **TextInput**: Ô nhập liệu (giống `<input>`)

**Lưu ý**: Trong React Native, mọi văn bản PHẢI nằm trong `<Text>`

---

### Q6: Làm sao gọi API? Có cần token không?

**Trả lời:**
- Dùng `fetch()` để gọi API
- Token cần cho các API yêu cầu đăng nhập
- Gửi token qua header: `Authorization: Bearer ${token}`

**Ví dụ:**
```tsx
const res = await fetch(`${API_URL}/api/products`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

---

### Q7: Chat real-time hoạt động như thế nào?

**Trả lời:**
- Dùng **WebSocket** (Socket.IO)
- Kết nối bền vững giữa client và server
- Server có thể gửi tin nhắn đến client bất cứ lúc nào
- Không cần client phải hỏi server liên tục

**Flow:**
```
Client kết nối WebSocket
    ↓
Server lưu kết nối
    ↓
User A gửi tin nhắn
    ↓
Server gửi tin nhắn đến User B qua WebSocket
    ↓
User B nhận tin nhắn ngay lập tức
```

---

### Q8: Thanh toán ZaloPay hoạt động như thế nào?

**Trả lời:**
1. App gọi API tạo đơn thanh toán
2. Server trả về `orderUrl`
3. App mở ZaloPay với `orderUrl`
4. User thanh toán trong ZaloPay
5. ZaloPay gọi callback về server
6. App kiểm tra trạng thái thanh toán

---

### Q9: Làm sao tính phí ship?

**Trả lời:**
- Tích hợp API **Giao Hàng Nhanh (GHN)**
- Gửi thông tin: địa chỉ gửi/nhận, kích thước, trọng lượng
- GHN trả về phí ship

**Ví dụ:**
```tsx
const res = await fetch(`${API_URL}/api/shipping/fee`, {
  method: 'POST',
  body: JSON.stringify({
    from_district_id: 123,
    to_district_id: 456,
    weight: 3000,
    // ...
  }),
});
const fee = await res.json();
```

---

### Q10: Context API dùng để làm gì?

**Trả lời:**
- Quản lý **state toàn cục** (global state)
- Chia sẻ dữ liệu giữa nhiều component
- Không cần truyền props qua nhiều cấp

**Ví dụ:**
- `AuthContext`: Chia sẻ thông tin đăng nhập cho tất cả component
- Mọi component có thể dùng `useAuth()` để lấy `accessToken`, `user`...

---

**CHÚC BẠN THUYẾT TRÌNH THÀNH CÔNG! 🎉**

Nếu có câu hỏi nào khác, hãy tham khảo code và tài liệu trên để trả lời chi tiết.

