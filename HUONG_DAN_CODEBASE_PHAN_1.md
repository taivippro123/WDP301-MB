# HƯỚNG DẪN CHI TIẾT VỀ CODEBASE - PHẦN 1

## 📋 MỤC LỤC
1. [Tổng quan về dự án](#1-tổng-quan-về-dự-án)
2. [React Native cơ bản](#2-react-native-cơ-bản)
3. [React Hooks](#3-react-hooks)
4. [Navigation (Điều hướng)](#4-navigation-điều-hướng)
5. [AsyncStorage - Lưu trữ dữ liệu](#5-asyncstorage---lưu-trữ-dữ-liệu)

---

## 1. TỔNG QUAN VỀ DỰ ÁN

### 1.1. Dự án là gì?
Đây là một **ứng dụng mobile** (React Native) để bán xe điện và pin xe điện cũ. Ứng dụng được xây dựng bằng:
- **React Native**: Framework để tạo app mobile chạy trên cả iOS và Android
- **Expo**: Công cụ giúp phát triển React Native dễ dàng hơn
- **TypeScript**: Ngôn ngữ lập trình có kiểu dữ liệu (giúp code an toàn hơn)

### 1.2. Các tính năng chính:
1. **Đăng nhập/Đăng ký**: Người dùng có thể tạo tài khoản và đăng nhập
2. **Xem sản phẩm**: Duyệt danh sách xe điện và pin
3. **Đăng tin bán**: Người bán có thể đăng sản phẩm lên app
4. **Chat**: Người mua và người bán có thể nhắn tin với nhau
5. **Đặt hàng**: Người mua có thể đặt mua sản phẩm
6. **Thanh toán ZaloPay**: Thanh toán qua ví ZaloPay
7. **Vận chuyển**: Tích hợp API Giao Hàng Nhanh (GHN) để tính phí ship
8. **Ký hợp đồng**: Ký hợp đồng điện tử khi mua bán
9. **Xem đơn hàng**: Xem lịch sử đơn hàng và trạng thái vận chuyển

### 1.3. Cấu trúc thư mục:
```
app/
  ├── _layout.tsx          # File cấu hình chính của app
  ├── AuthContext.tsx      # Quản lý đăng nhập/đăng xuất
  ├── screens/             # Các màn hình của app
  │   ├── HomeScreen.tsx
  │   ├── LoginScreen.tsx
  │   ├── ProductDetailScreen.tsx
  │   └── ...
  └── (tabs)/              # Màn hình dùng bottom navigation
config/
  └── api.js              # Địa chỉ API server
```

---

## 2. REACT NATIVE CƠ BẢN

### 2.1. View - Container cơ bản

**View là gì?**
- `View` giống như thẻ `<div>` trong HTML, dùng để nhóm các phần tử lại với nhau
- `View` không hiển thị gì, chỉ là container để chứa các phần tử khác

**Ví dụ:**
```tsx
<View style={{ backgroundColor: 'white', padding: 20 }}>
  <Text>Nội dung bên trong</Text>
</View>
```

**Giải thích:**
- `style={{ backgroundColor: 'white' }}`: Đặt màu nền trắng
- `padding: 20`: Tạo khoảng cách 20px xung quanh nội dung bên trong

**Trong code của bạn:**
```tsx
// File: app/screens/HomeScreen.tsx
<View style={styles.container}>
  <Text>Danh sách sản phẩm</Text>
</View>
```
→ Tạo một container chứa text "Danh sách sản phẩm"

---

### 2.2. Text - Hiển thị văn bản

**Text là gì?**
- `Text` giống như thẻ `<p>` hoặc `<span>` trong HTML
- Dùng để hiển thị chữ trên màn hình
- **Lưu ý**: Trong React Native, mọi văn bản PHẢI nằm trong thẻ `<Text>`

**Ví dụ:**
```tsx
<Text style={{ fontSize: 16, color: 'black' }}>
  Xin chào!
</Text>
```

**Giải thích:**
- `fontSize: 16`: Cỡ chữ 16px
- `color: 'black'`: Màu chữ đen

**Trong code của bạn:**
```tsx
// File: app/screens/LoginScreen.tsx
<Text style={styles.label}>
  Email <Text style={styles.required}>*</Text>
</Text>
```
→ Hiển thị "Email *" với dấu * màu đỏ (nếu có style required)

---

### 2.3. TextInput - Ô nhập liệu

**TextInput là gì?**
- `TextInput` giống như `<input>` trong HTML
- Dùng để người dùng nhập text (email, mật khẩu, tìm kiếm...)

**Ví dụ:**
```tsx
<TextInput
  value={email}
  onChangeText={setEmail}
  placeholder="Nhập email của bạn"
  keyboardType="email-address"
  secureTextEntry={false}
/>
```

**Giải thích các thuộc tính:**
- `value={email}`: Giá trị hiện tại của ô input (lưu trong state)
- `onChangeText={setEmail}`: Hàm được gọi khi người dùng gõ chữ → cập nhật state
- `placeholder`: Chữ mờ hiển thị khi ô trống
- `keyboardType="email-address"`: Hiển thị bàn phím phù hợp (có @)
- `secureTextEntry={true}`: Ẩn chữ khi nhập (dùng cho mật khẩu)

**Trong code của bạn:**
```tsx
// File: app/screens/LoginScreen.tsx
<TextInput
  value={formData.phoneOrEmail}
  onChangeText={(text) => updateFormData('phoneOrEmail', text)}
  placeholder="Email hoặc số điện thoại"
  keyboardType="email-address"
/>
```
→ Tạo ô nhập email, khi gõ sẽ cập nhật `formData.phoneOrEmail`

---

### 2.4. TouchableOpacity - Nút bấm

**TouchableOpacity là gì?**
- `TouchableOpacity` là nút có thể bấm được
- Khi bấm, nút sẽ mờ đi một chút (opacity giảm) để người dùng biết đã bấm

**Ví dụ:**
```tsx
<TouchableOpacity 
  onPress={() => Alert.alert('Đã bấm!')}
  style={{ backgroundColor: 'blue', padding: 10 }}
>
  <Text style={{ color: 'white' }}>Bấm vào đây</Text>
</TouchableOpacity>
```

**Giải thích:**
- `onPress={...}`: Hàm được gọi khi người dùng bấm
- `style`: Style của nút (màu nền, padding...)

**Trong code của bạn:**
```tsx
// File: app/screens/HomeScreen.tsx
<TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}>
  <Image source={{ uri: item.images[0] }} />
  <Text>{item.title}</Text>
</TouchableOpacity>
```
→ Tạo một card sản phẩm có thể bấm, khi bấm sẽ chuyển sang màn hình chi tiết

---

### 2.5. Image - Hiển thị ảnh

**Image là gì?**
- `Image` dùng để hiển thị ảnh từ URL hoặc file local

**Ví dụ:**
```tsx
<Image 
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 200, height: 200 }}
/>
```

**Giải thích:**
- `source={{ uri: '...' }}`: URL của ảnh
- `style`: Kích thước và style của ảnh

**Trong code của bạn:**
```tsx
// File: app/screens/ProductDetailScreen.tsx
<Image 
  source={{ uri: product.images[0] }}
  style={styles.productImage}
/>
```
→ Hiển thị ảnh đầu tiên của sản phẩm

---

### 2.6. ScrollView - Cuộn nội dung

**ScrollView là gì?**
- `ScrollView` cho phép cuộn nội dung khi màn hình không đủ chỗ
- Giống như `<div style="overflow: scroll">` trong HTML

**Ví dụ:**
```tsx
<ScrollView>
  <Text>Nội dung dài...</Text>
  <Text>Nội dung dài...</Text>
  {/* Nhiều nội dung khác */}
</ScrollView>
```

**Trong code của bạn:**
```tsx
// File: app/screens/ProductDetailScreen.tsx
<ScrollView>
  <Image source={{ uri: product.images[0] }} />
  <Text>{product.title}</Text>
  <Text>{product.description}</Text>
  {/* Nhiều thông tin khác */}
</ScrollView>
```
→ Cho phép cuộn để xem hết thông tin sản phẩm

---

### 2.7. FlatList - Danh sách hiệu năng cao

**FlatList là gì?**
- `FlatList` dùng để hiển thị danh sách dài (hàng trăm, nghìn item)
- Tối ưu hơn `ScrollView` vì chỉ render những item đang hiển thị trên màn hình

**Ví dụ:**
```tsx
<FlatList
  data={products}
  renderItem={({ item }) => (
    <View>
      <Text>{item.title}</Text>
    </View>
  )}
  keyExtractor={(item) => item._id}
/>
```

**Giải thích:**
- `data={products}`: Mảng dữ liệu cần hiển thị
- `renderItem={...}`: Hàm render mỗi item trong danh sách
- `keyExtractor`: Lấy key duy nhất của mỗi item (để React biết item nào thay đổi)

**Trong code của bạn:**
```tsx
// File: app/screens/HomeScreen.tsx
<FlatList
  data={products}
  renderItem={({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}>
      <Image source={{ uri: item.images[0] }} />
      <Text>{item.title}</Text>
      <Text>{formatPrice(item.price)}</Text>
    </TouchableOpacity>
  )}
  keyExtractor={(item) => item._id}
  numColumns={2}
/>
```
→ Hiển thị danh sách sản phẩm dạng lưới 2 cột, mỗi item có thể bấm

---

### 2.8. SafeAreaView - Tránh notch/status bar

**SafeAreaView là gì?**
- `SafeAreaView` đảm bảo nội dung không bị che bởi notch (iPhone) hoặc status bar
- Tự động thêm padding ở các vùng không an toàn

**Ví dụ:**
```tsx
<SafeAreaView style={{ flex: 1 }}>
  <Text>Nội dung an toàn</Text>
</SafeAreaView>
```

**Trong code của bạn:**
```tsx
// File: app/screens/LoginScreen.tsx
<SafeAreaView style={styles.container}>
  <Text>Đăng nhập</Text>
</SafeAreaView>
```
→ Đảm bảo màn hình đăng nhập không bị che bởi notch

---

## 3. REACT HOOKS

### 3.1. useState - Quản lý state (trạng thái)

**useState là gì?**
- `useState` dùng để lưu trữ dữ liệu có thể thay đổi trong component
- Khi state thay đổi, component sẽ tự động render lại

**Cú pháp:**
```tsx
const [tênBiến, hàmCậpNhật] = useState(giáTrịKhởiTạo);
```

**Ví dụ đơn giản:**
```tsx
const [count, setCount] = useState(0);

// Hiển thị: 0
<Text>{count}</Text>

// Khi bấm nút, count tăng lên 1
<TouchableOpacity onPress={() => setCount(count + 1)}>
  <Text>Tăng</Text>
</TouchableOpacity>
```

**Giải thích:**
- `count`: Biến chứa giá trị hiện tại (ban đầu là 0)
- `setCount`: Hàm để cập nhật giá trị của `count`
- Khi gọi `setCount(1)`, `count` sẽ thành 1 và component render lại

**Trong code của bạn:**
```tsx
// File: app/screens/LoginScreen.tsx
const [formData, setFormData] = useState({
  phoneOrEmail: '',
  password: '',
  rememberPassword: false
});

// Khi người dùng gõ email
<TextInput
  value={formData.phoneOrEmail}
  onChangeText={(text) => setFormData({ ...formData, phoneOrEmail: text })}
/>
```

**Giải thích chi tiết:**
- `formData` là object chứa thông tin form
- `setFormData({ ...formData, phoneOrEmail: text })`:
  - `...formData`: Giữ nguyên các giá trị cũ (password, rememberPassword)
  - `phoneOrEmail: text`: Cập nhật giá trị mới cho phoneOrEmail
  - Đây gọi là "spread operator" - copy object cũ và thay đổi một phần

**Ví dụ khác trong code:**
```tsx
// File: app/screens/HomeScreen.tsx
const [products, setProducts] = useState<any[]>([]);
const [isLoading, setIsLoading] = useState(false);

// Khi fetch dữ liệu từ API
const fetchProducts = async () => {
  setIsLoading(true);  // Bắt đầu loading
  const data = await fetch(...);
  setProducts(data);   // Lưu danh sách sản phẩm
  setIsLoading(false); // Kết thúc loading
};
```

---

### 3.2. useEffect - Thực hiện side effects

**useEffect là gì?**
- `useEffect` dùng để thực hiện các tác vụ "phụ" như:
  - Gọi API khi component mount
  - Đăng ký event listeners
  - Cleanup khi component unmount

**Cú pháp:**
```tsx
useEffect(() => {
  // Code chạy ở đây
  return () => {
    // Cleanup (tùy chọn)
  };
}, [dependencies]);
```

**Ví dụ 1: Chạy 1 lần khi component mount**
```tsx
useEffect(() => {
  console.log('Component đã được render');
  fetchProducts(); // Gọi API lấy danh sách sản phẩm
}, []); // Mảng rỗng = chỉ chạy 1 lần
```

**Ví dụ 2: Chạy khi dependency thay đổi**
```tsx
const [userId, setUserId] = useState(null);

useEffect(() => {
  if (userId) {
    fetchUserProfile(userId); // Chỉ gọi khi userId thay đổi
  }
}, [userId]); // Chạy lại khi userId thay đổi
```

**Ví dụ 3: Cleanup**
```tsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log('Mỗi giây in một lần');
  }, 1000);

  return () => {
    clearInterval(timer); // Dọn dẹp khi component unmount
  };
}, []);
```

**Trong code của bạn:**
```tsx
// File: app/screens/HomeScreen.tsx
useEffect(() => {
  fetchProducts();  // Lấy danh sách sản phẩm khi màn hình load
  fetchWishlist();  // Lấy danh sách yêu thích
}, [accessToken]);  // Chạy lại khi accessToken thay đổi (đăng nhập/đăng xuất)
```

**Ví dụ phức tạp hơn:**
```tsx
// File: app/screens/ChatDetailScreen.tsx
useEffect(() => {
  // Khi component mount, kết nối WebSocket
  const socket = io(API_URL);
  
  socket.on('new_message', (data) => {
    setChatMessages(prev => [...prev, data]);
  });

  return () => {
    // Khi component unmount, ngắt kết nối
    socket.disconnect();
  };
}, []);
```

---

### 3.3. useRef - Tham chiếu không gây re-render

**useRef là gì?**
- `useRef` tạo một biến có thể thay đổi mà KHÔNG gây re-render khi thay đổi
- Dùng để:
  - Lưu giá trị không cần hiển thị trên UI
  - Tham chiếu đến DOM element (TextInput, ScrollView...)
  - Lưu timer ID, socket connection...

**Cú pháp:**
```tsx
const ref = useRef(giáTrịKhởiTạo);
// Truy cập: ref.current
```

**Ví dụ 1: Lưu giá trị không cần render**
```tsx
const countRef = useRef(0);

const increment = () => {
  countRef.current += 1; // Thay đổi nhưng KHÔNG render lại
  console.log(countRef.current); // In ra: 1, 2, 3...
};
```

**Ví dụ 2: Tham chiếu đến TextInput**
```tsx
const inputRef = useRef<TextInput>(null);

// Focus vào input khi bấm nút
<TouchableOpacity onPress={() => inputRef.current?.focus()}>
  <Text>Focus input</Text>
</TouchableOpacity>

<TextInput ref={inputRef} />
```

**Trong code của bạn:**
```tsx
// File: app/screens/HomeScreen.tsx
const searchInputRef = useRef<TextInput | null>(null);

// Khi bấm nút tìm kiếm, focus vào input
<TouchableOpacity onPress={() => searchInputRef.current?.focus()}>
  <Ionicons name="search" />
</TouchableOpacity>

<TextInput ref={searchInputRef} />
```

**Ví dụ 3: Lưu giá trị trước đó**
```tsx
// File: app/_layout.tsx
const lastCountRef = useRef(0);

useEffect(() => {
  const sub = DeviceEventEmitter.addListener('chat_unread_count', (count: number) => {
    const previous = lastCountRef.current; // Lấy giá trị cũ
    if (count > previous) {
      lastCountRef.current = count; // Cập nhật giá trị mới
      setChatUnreadCount(count);
    }
  });
}, []);
```

**So sánh useState vs useRef:**
- `useState`: Thay đổi → render lại component
- `useRef`: Thay đổi → KHÔNG render lại component

---

### 3.4. useMemo - Tối ưu tính toán

**useMemo là gì?**
- `useMemo` cache kết quả tính toán, chỉ tính lại khi dependency thay đổi
- Dùng khi có tính toán phức tạp, tốn thời gian

**Cú pháp:**
```tsx
const result = useMemo(() => {
  // Tính toán phức tạp
  return expensiveCalculation();
}, [dependency1, dependency2]);
```

**Ví dụ:**
```tsx
const expensiveValue = useMemo(() => {
  // Tính toán phức tạp (ví dụ: filter + sort mảng lớn)
  return products
    .filter(p => p.price > 1000000)
    .sort((a, b) => b.price - a.price);
}, [products]); // Chỉ tính lại khi products thay đổi
```

**Trong code của bạn:**
```tsx
// File: app/screens/ProductDetailScreen.tsx
const firstImage = useMemo(() => {
  const imgs = (product?.images || []) as any[];
  const toUrl = (x: any) => (typeof x === 'string' ? x : (x?.url || x?.secure_url));
  return imgs.length ? toUrl(imgs[0]) : undefined;
}, [product]); // Chỉ tính lại khi product thay đổi
```

---

### 3.5. useCallback - Tối ưu hàm

**useCallback là gì?**
- `useCallback` cache hàm, tránh tạo hàm mới mỗi lần render
- Dùng khi truyền hàm vào child component để tránh re-render không cần thiết

**Cú pháp:**
```tsx
const memoizedCallback = useCallback(() => {
  // Logic của hàm
}, [dependency1, dependency2]);
```

**Ví dụ:**
```tsx
const handlePress = useCallback(() => {
  console.log('Đã bấm');
}, []); // Hàm không thay đổi

// Truyền vào child component
<ChildComponent onPress={handlePress} />
```

**Trong code của bạn:**
```tsx
// File: app/screens/ConfirmOrderScreen.tsx
const calculateShipping = useCallback(async () => {
  // Tính phí ship
  const fee = await fetchShippingFee(...);
  setShippingFee(fee);
}, [product, receiver, accessToken]); // Chỉ tạo hàm mới khi các giá trị này thay đổi
```

---

## 4. NAVIGATION (ĐIỀU HƯỚNG)

### 4.1. Navigation là gì?

**Navigation** là cách di chuyển giữa các màn hình trong app. Trong dự án này dùng:
- **React Navigation**: Thư viện điều hướng phổ biến nhất cho React Native
- **Bottom Tabs**: Thanh điều hướng ở dưới màn hình (Trang chủ, Chat, Tài khoản...)
- **Stack Navigator**: Điều hướng kiểu stack (màn hình này chồng lên màn hình kia)

---

### 4.2. Bottom Tab Navigator - Thanh điều hướng dưới

**Bottom Tab là gì?**
- Thanh điều hướng ở dưới cùng màn hình với các icon
- Người dùng bấm icon để chuyển giữa các tab

**Cấu trúc trong code:**
```tsx
// File: app/_layout.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

<Tab.Navigator>
  <Tab.Screen name="Trang chủ" component={HomeStack} />
  <Tab.Screen name="Quản lí tin" component={ManageListingsScreen} />
  <Tab.Screen name="Đăng tin" component={PostStack} />
  <Tab.Screen name="Chat" component={ChatStack} />
  <Tab.Screen name="Tài khoản" component={AccountStack} />
</Tab.Navigator>
```

**Giải thích:**
- `Tab.Navigator`: Container chứa các tab
- `Tab.Screen`: Mỗi tab là một màn hình
- `name`: Tên tab (hiển thị dưới icon)
- `component`: Component màn hình tương ứng

**Cấu hình icon:**
```tsx
<Tab.Navigator
  screenOptions={({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
      
      if (route.name === 'Trang chủ') {
        iconName = focused ? 'home' : 'home-outline';
      } else if (route.name === 'Chat') {
        iconName = focused ? 'chatbubble' : 'chatbubble-outline';
      }
      
      return <Ionicons name={iconName} size={size} color={color} />;
    },
  })}
>
```

**Giải thích:**
- `focused`: Tab đang được chọn
- `color`: Màu icon (tự động từ `tabBarActiveTintColor` hoặc `tabBarInactiveTintColor`)
- `size`: Kích thước icon
- `focused ? 'home' : 'home-outline'`: Icon đầy khi được chọn, outline khi không

**Cấu hình style:**
```tsx
tabBarStyle: {
  backgroundColor: 'white',
  height: 90,
  paddingBottom: 2,
  paddingTop: 10,
  position: 'absolute',
  bottom: 0,
  borderTopWidth: 1,
  borderTopColor: '#E5E5E7',
}
```

**Ẩn/hiện bottom tab:**
```tsx
// Ẩn tab bar
navigation.setOptions({
  tabBarStyle: { display: 'none' }
});

// Hiện lại tab bar
navigation.setOptions({
  tabBarStyle: {
    backgroundColor: 'white',
    height: 90,
    // ... các style khác
  }
});
```

**Trong code của bạn:**
```tsx
// File: app/_layout.tsx
<Stack.Screen 
  name="Contract" 
  component={ContractScreen}
  listeners={{
    focus: () => {
      // Ẩn bottom tab khi vào màn hình Contract
      parentNavigation?.setOptions({ tabBarStyle: { display: 'none' } });
    },
    blur: () => {
      // Hiện lại bottom tab khi rời màn hình Contract
      parentNavigation?.setOptions({
        tabBarStyle: {
          backgroundColor: 'white',
          height: 90,
          // ...
        }
      });
    }
  }}
/>
```

---

### 4.3. Stack Navigator - Điều hướng stack

**Stack Navigator là gì?**
- Điều hướng kiểu "chồng" màn hình lên nhau
- Màn hình mới chồng lên màn hình cũ
- Có nút "Back" để quay lại màn hình trước

**Cấu trúc:**
```tsx
// File: app/_layout.tsx
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ConfirmOrder" component={ConfirmOrderScreen} />
    </Stack.Navigator>
  );
}
```

**Giải thích:**
- `Stack.Navigator`: Container chứa các màn hình stack
- `Stack.Screen`: Mỗi màn hình trong stack
- `headerShown: false`: Ẩn header mặc định (tự làm header)

**Điều hướng giữa các màn hình:**
```tsx
// File: app/screens/HomeScreen.tsx
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Chuyển sang màn hình ProductDetail
navigation.navigate('ProductDetail', { productId: item._id });

// Quay lại màn hình trước
navigation.goBack();

// Quay về màn hình đầu tiên trong stack
navigation.popToTop();
```

**Truyền dữ liệu giữa màn hình:**
```tsx
// Màn hình A: Gửi dữ liệu
navigation.navigate('ProductDetail', { 
  productId: '123',
  productName: 'Xe điện XYZ'
});

// Màn hình B: Nhận dữ liệu
import { useRoute } from '@react-navigation/native';

const route = useRoute();
const { productId, productName } = route.params;
```

**Trong code của bạn:**
```tsx
// File: app/screens/HomeScreen.tsx
<TouchableOpacity 
  onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
>
  <Image source={{ uri: item.images[0] }} />
  <Text>{item.title}</Text>
</TouchableOpacity>

// File: app/screens/ProductDetailScreen.tsx
const route = useRoute();
const { productId } = (route.params as { productId: string }) || {};
```

---

### 4.4. Kết hợp Bottom Tab và Stack

**Cấu trúc phức tạp:**
```
App (Bottom Tab Navigator)
├── Trang chủ (Stack Navigator)
│   ├── HomeList (HomeScreen)
│   ├── ProductDetail
│   └── ConfirmOrder
├── Chat (Stack Navigator)
│   ├── ChatList
│   └── ChatDetail
└── Tài khoản (Stack Navigator)
    ├── AccountMain
    ├── OrderHistory
    └── OrderDetail
```

**Code thực tế:**
```tsx
// File: app/_layout.tsx
function HomeStack({ navigation: parentNavigation }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

<Tab.Navigator>
  <Tab.Screen name="Trang chủ">
    {({ navigation }) => <HomeStack navigation={navigation} />}
  </Tab.Screen>
</Tab.Navigator>
```

**Điều hướng từ màn hình trong stack:**
```tsx
// Từ HomeScreen → ProductDetail (cùng stack)
navigation.navigate('ProductDetail', { productId: '123' });

// Từ ProductDetail → Chat (khác stack, cần đi qua tab)
navigation.getParent()?.navigate('Chat', { screen: 'ChatList' });
```

---

## 5. ASYNCSTORAGE - LƯU TRỮ DỮ LIỆU

### 5.1. AsyncStorage là gì?

**AsyncStorage** là thư viện lưu trữ dữ liệu dạng key-value trên thiết bị (giống localStorage trong web).

**Đặc điểm:**
- Lưu trữ **bền vững**: Dữ liệu vẫn còn khi đóng app
- **Bất đồng bộ**: Các thao tác là async (dùng await)
- **Key-value**: Lưu dưới dạng cặp key-value
- **Chỉ lưu string**: Phải JSON.stringify trước khi lưu object

---

### 5.2. Các thao tác cơ bản

**1. Lưu dữ liệu:**
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lưu string
await AsyncStorage.setItem('username', 'john');

// Lưu object (phải stringify)
const user = { name: 'John', age: 30 };
await AsyncStorage.setItem('user', JSON.stringify(user));
```

**2. Đọc dữ liệu:**
```tsx
// Đọc string
const username = await AsyncStorage.getItem('username');
// username = 'john'

// Đọc object (phải parse)
const userStr = await AsyncStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
// user = { name: 'John', age: 30 }
```

**3. Xóa dữ liệu:**
```tsx
// Xóa một key
await AsyncStorage.removeItem('username');

// Xóa tất cả
await AsyncStorage.clear();
```

---

### 5.3. Sử dụng trong dự án

**Lưu trạng thái đăng nhập:**
```tsx
// File: app/AuthContext.tsx
const AUTH_STORAGE_KEY = 'auth_state_v1';

// Lưu khi đăng nhập
const persistState = async (next: AuthState) => {
  setState(next);
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // Xử lý lỗi
  }
};

// Đọc khi app khởi động
useEffect(() => {
  const loadAuthState = async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed: AuthState = JSON.parse(raw);
        setState(parsed); // Khôi phục trạng thái đăng nhập
      }
    } catch (error) {
      // Xử lý lỗi
    } finally {
      setIsLoading(false);
    }
  };
  loadAuthState();
}, []);
```

**Giải thích chi tiết:**
1. **Khi đăng nhập thành công:**
   - Gọi `persistState()` với thông tin user và token
   - Lưu vào AsyncStorage với key `'auth_state_v1'`
   - Dữ liệu được stringify thành JSON

2. **Khi app khởi động:**
   - `useEffect` chạy 1 lần (mảng rỗng `[]`)
   - Đọc từ AsyncStorage
   - Nếu có dữ liệu → parse và set vào state
   - User không cần đăng nhập lại!

**Lưu cache tạm thời:**
```tsx
// File: app/screens/PostListingScreen.tsx
const [aiCache, setAiCache] = useState<{ key: string; response: any } | null>(null);

// Lưu cache
await AsyncStorage.setItem('ai_suggestion_cache', JSON.stringify(aiCache));

// Đọc cache
const cached = await AsyncStorage.getItem('ai_suggestion_cache');
if (cached) {
  setAiCache(JSON.parse(cached));
}
```

---

### 5.4. Lưu ý quan trọng

**1. AsyncStorage là bất đồng bộ:**
```tsx
// ❌ SAI: Không dùng await
const value = AsyncStorage.getItem('key'); // Trả về Promise, không phải giá trị

// ✅ ĐÚNG: Dùng await
const value = await AsyncStorage.getItem('key');
```

**2. Phải xử lý lỗi:**
```tsx
try {
  await AsyncStorage.setItem('key', 'value');
} catch (error) {
  console.error('Lỗi lưu dữ liệu:', error);
}
```

**3. Giới hạn kích thước:**
- AsyncStorage có giới hạn ~6MB trên iOS và ~10MB trên Android
- Không nên lưu ảnh/video lớn, chỉ lưu URL

**4. Dữ liệu nhạy cảm:**
- AsyncStorage KHÔNG mã hóa dữ liệu
- Không nên lưu mật khẩu, thông tin thẻ tín dụng
- Chỉ lưu token (có thể hết hạn) và thông tin cơ bản

---

**Kết thúc Phần 1. Tiếp tục với Phần 2 để tìm hiểu về API, Authentication, và các tính năng chính!**

