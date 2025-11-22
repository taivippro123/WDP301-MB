# HƯỚNG DẪN CHI TIẾT VỀ BACKEND - PHẦN 2

## 📋 MỤC LỤC
1. [Socket.IO - Real-time Chat](#1-socketio---real-time-chat)
2. [Upload File - Cloudinary](#2-upload-file---cloudinary)
3. [Thanh toán ZaloPay](#3-thanh-toán-zalopay)
4. [Vận chuyển GHN](#4-vận-chuyển-ghn)
5. [Validation với Zod](#5-validation-với-zod)
6. [Câu hỏi thường gặp khi thuyết trình](#6-câu-hỏi-thường-gặp-khi-thuyết-trình)

---

## 1. SOCKET.IO - REAL-TIME CHAT

### 1.1. Socket.IO là gì?
**Socket.IO** là thư viện real-time communication:
- Dùng **WebSocket** (kết nối bền vững)
- Server có thể gửi data đến client bất cứ lúc nào
- Không cần client phải hỏi server liên tục (polling)

**So sánh HTTP vs WebSocket:**
- **HTTP**: Request → Response → Ngắt kết nối
- **WebSocket**: Kết nối → Giữ kết nối → Gửi/nhận data 2 chiều

### 1.2. Khởi tạo Socket.IO

**File: `src/index.js`**
```javascript
import { createServer } from 'http';
import { Server } from 'socket.io';

// Tạo HTTP server từ Express app
const server = createServer(app);

// Khởi tạo Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Lắng nghe kết nối
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Khởi động server
server.listen(PORT, () => {
  console.log(`🚀 Server on ${PORT}`);
});
```

### 1.3. Authentication cho Socket.IO

**File: `src/index.js`**
```javascript
// Middleware xác thực cho Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = verifyJwt(token);
    socket.userId = decoded.userId;
    socket.user = decoded;
    next(); // Cho phép kết nối
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // User tự động join vào room của mình
  socket.join(`user_${socket.userId}`);
});
```

### 1.4. Gửi và Nhận Tin nhắn

**File: `src/index.js`**
```javascript
io.on('connection', (socket) => {
  // Lắng nghe sự kiện gửi tin nhắn
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, text, files } = data;
      
      // 1. Lưu tin nhắn vào database
      const message = await Message.create({
        conversationId,
        senderId: socket.userId,
        text,
        files,
      });

      // 2. Gửi tin nhắn đến tất cả user trong conversation
      io.to(`conversation_${conversationId}`).emit('new_message', {
        conversationId,
        message,
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // User join vào conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // User rời conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });
});
```

**Giải thích:**
- `socket.on('event', handler)`: Lắng nghe sự kiện từ client
- `socket.emit('event', data)`: Gửi sự kiện đến client đó
- `io.to('room').emit('event', data)`: Gửi đến tất cả client trong room
- `socket.join('room')`: Tham gia room
- `socket.leave('room')`: Rời room

### 1.5. Chat Service

**File: `src/services/chatService.js`**
```javascript
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// Tạo hoặc lấy conversation
export async function startConversation(buyerId, sellerId, productId) {
  let convo = await Conversation.findOne({ buyerId, sellerId, productId });
  
  if (!convo) {
    convo = await Conversation.create({ buyerId, sellerId, productId });
  }
  
  return convo;
}

// Gửi tin nhắn
export async function sendMessage(conversationId, senderId, text, files = []) {
  const message = await Message.create({
    conversationId,
    senderId,
    text,
    files,
    type: files.length > 0 ? 'image' : 'text',
  });

  // Cập nhật conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text,
    lastMessageAt: new Date(),
  });

  return message;
}

// Lấy danh sách conversation
export async function listConversations(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const conversations = await Conversation.find({
    $or: [{ buyerId: userId }, { sellerId: userId }],
  })
    .populate('buyerId', 'name email avatar')
    .populate('sellerId', 'name email avatar')
    .populate('productId', 'title images price')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  return conversations;
}
```

---

## 2. UPLOAD FILE - CLOUDINARY

### 2.1. Cloudinary là gì?
**Cloudinary** là dịch vụ lưu trữ và quản lý media:
- Upload ảnh/video
- Tự động resize, optimize
- CDN (Content Delivery Network) - tải nhanh

### 2.2. Cấu hình Cloudinary

**File: `src/config/cloudinary.js`**
```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // HTTPS
});

export default cloudinary;
```

### 2.3. Upload File

**File: `src/middlewares/upload.js`**
```javascript
import multer from 'multer';
import { uploadToCloudinary } from '../services/uploadService.js';

// Cấu hình multer (tạm thời lưu vào memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Middleware upload
export const uploadMedia = upload.array('files', 10); // Tối đa 10 files

// Middleware xử lý sau khi upload
export const handleUpload = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, {
        folder: 'products',
        resource_type: 'auto', // Tự động detect ảnh/video
      })
    );

    const results = await Promise.all(uploadPromises);
    req.uploadedFiles = results.map(r => r.secure_url);
    next();
  } catch (error) {
    next(error);
  }
};
```

**File: `src/services/uploadService.js`**
```javascript
import cloudinary from '../config/cloudinary.js';

export async function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'uploads',
        resource_type: options.resource_type || 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(buffer);
  });
}
```

**Sử dụng trong route:**
```javascript
import { uploadMedia, handleUpload } from '../middlewares/upload.js';

router.post(
  '/products',
  authenticate,
  uploadMedia,
  handleUpload,
  createProduct
);

// Trong controller
export const createProduct = async (req, res) => {
  const { title, description, price } = req.body;
  const images = req.uploadedFiles || []; // URLs từ Cloudinary

  const product = await Product.create({
    title,
    description,
    price,
    images,
    seller: req.user.id,
  });

  res.json(product);
};
```

---

## 3. THANH TOÁN ZALOPAY

### 3.1. ZaloPay là gì?
**ZaloPay** là ví điện tử, cho phép thanh toán online.

### 3.2. Flow Thanh toán

```
1. User chọn số tiền nạp
2. App gọi API tạo đơn thanh toán
3. Server gọi ZaloPay API → nhận orderUrl
4. App mở ZaloPay với orderUrl
5. User thanh toán trong ZaloPay
6. ZaloPay gọi callback về server
7. Server cập nhật số dư ví
```

### 3.3. Tạo Đơn Thanh toán

**File: `src/controllers/zalopayController.js`**
```javascript
import { createZaloPayOrder } from '../config/zalopay.js';
import WalletTopup from '../models/WalletTopup.js';
import User from '../models/User.js';

export async function createTopupOrder(req, res) {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // Validate số tiền
    if (amount < 1000 || amount > 50000000) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Số tiền từ 1,000 - 50,000,000 VND',
      });
    }

    // Tạo order ID duy nhất
    const orderId = `topup_${userId}_${Date.now()}`;

    // Gọi ZaloPay API
    const zaloPayResult = await createZaloPayOrder({
      orderId,
      amount,
      description: 'Nạp tiền vào ví',
      userId,
    });

    if (!zaloPayResult.success) {
      return res.status(400).json({
        error: 'ZaloPay order creation failed',
        message: zaloPayResult.error,
      });
    }

    // Lưu vào database
    const topupRecord = await WalletTopup.create({
      userId,
      orderId,
      amount,
      status: 'pending',
      order_url: zaloPayResult.data.order_url,
    });

    res.json({
      success: true,
      data: {
        orderId: topupRecord.orderId,
        order_url: topupRecord.order_url,
      },
    });
  } catch (error) {
    next(error);
  }
}
```

### 3.4. Callback từ ZaloPay

**File: `src/controllers/zalopayController.js`**
```javascript
export async function handleZaloPayCallback(req, res) {
  try {
    const { app_trans_id, status } = req.body;

    // Tìm topup record
    const topup = await WalletTopup.findOne({ app_trans_id });
    if (!topup) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Kiểm tra trạng thái
    if (status === 1) { // Thành công
      // Cập nhật số dư ví
      await User.findByIdAndUpdate(topup.userId, {
        $inc: { 'wallet.balance': topup.amount },
        $inc: { 'wallet.totalDeposited': topup.amount },
      });

      // Cập nhật trạng thái topup
      topup.status = 'completed';
      await topup.save();
    } else {
      topup.status = 'failed';
      await topup.save();
    }

    res.json({ return_code: 1, return_message: 'Success' });
  } catch (error) {
    next(error);
  }
}
```

---

## 4. VẬN CHUYỂN GHN

### 4.1. GHN là gì?
**GHN (Giao Hàng Nhanh)** là dịch vụ vận chuyển, cung cấp API để:
- Tính phí ship
- Tạo đơn vận chuyển
- Theo dõi đơn hàng

### 4.2. Tính Phí Ship

**File: `src/controllers/shippingController.js`**
```javascript
import axios from 'axios';

export async function calculateShippingFee(req, res, next) {
  try {
    const {
      from_district_id,
      from_ward_code,
      to_district_id,
      to_ward_code,
      weight,
      length,
      width,
      height,
    } = req.body;

    // Gọi GHN API
    const response = await axios.post(
      'https://dev-online-gateway.ghn.vn/shipping-order/fee',
      {
        from_district_id,
        from_ward_code,
        to_district_id,
        to_ward_code,
        weight,
        length,
        width,
        height,
        service_type_id: 2, // Loại dịch vụ
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': process.env.GHN_TOKEN,
        },
      }
    );

    const totalFee = response.data.data.total;
    res.json({ fee: totalFee });
  } catch (error) {
    next(error);
  }
}
```

### 4.3. Tạo Đơn Vận chuyển

**File: `src/controllers/shippingController.js`**
```javascript
export async function createShippingOrder(req, res, next) {
  try {
    const {
      to_name,
      to_phone,
      to_address,
      to_ward_code,
      to_district_id,
      weight,
      length,
      width,
      height,
    } = req.body;

    // Gọi GHN API tạo đơn
    const response = await axios.post(
      'https://dev-online-gateway.ghn.vn/shipping-order/create',
      {
        to_name,
        to_phone,
        to_address,
        to_ward_code,
        to_district_id,
        weight,
        length,
        width,
        height,
        service_type_id: 2,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': process.env.GHN_TOKEN,
        },
      }
    );

    const orderCode = response.data.data.order_code;
    res.json({ order_code: orderCode });
  } catch (error) {
    next(error);
  }
}
```

---

## 5. VALIDATION VỚI ZOD

### 5.1. Zod là gì?
**Zod** là thư viện validation schema:
- Định nghĩa schema
- Validate dữ liệu
- Type-safe (TypeScript)

### 5.2. Tạo Validation Schema

**File: `src/validations/auth.validation.js`**
```javascript
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  phone: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});
```

### 5.3. Sử dụng trong Controller

**File: `src/controllers/authController.js`**
```javascript
import { registerSchema, loginSchema } from '../validations/auth.validation.js';

export const register = async (req, res, next) => {
  try {
    // Validate dữ liệu
    const validatedData = registerSchema.parse(req.body);
    // validatedData sẽ có type đúng và đã được validate

    const { name, email, password } = validatedData;

    // Kiểm tra email đã tồn tại
    const exists = await User.findOne({ email });
    if (exists) {
      throw new BadRequestException('Email already in use');
    }

    // Hash password và tạo user
    const hashed = await hashPassword(password);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json(user);
  } catch (err) {
    // Zod validation error
    if (err.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: err.errors,
      });
    }
    next(err);
  }
};
```

**Giải thích:**
- `schema.parse(data)`: Validate và throw error nếu không hợp lệ
- `schema.safeParse(data)`: Validate và trả về object `{ success: boolean, data?, error? }`

---

## 6. CÂU HỎI THƯỜNG GẶP KHI THUYẾT TRÌNH

### Q1: Backend dùng công nghệ gì? Tại sao chọn?

**Trả lời:**
- **Node.js + Express.js**: JavaScript trên server, dễ học, ecosystem lớn
- **MongoDB**: NoSQL, linh hoạt, phù hợp với dữ liệu không cố định
- **Socket.IO**: Real-time communication cho chat
- **JWT**: Xác thực stateless, không cần lưu session

---

### Q2: Authentication hoạt động như thế nào?

**Trả lời:**
1. User đăng nhập với email/password
2. Server kiểm tra → tạo JWT token (chứa userId, role)
3. Client lưu token → gửi kèm mỗi request qua header `Authorization: Bearer <token>`
4. Middleware `authenticate` verify token → gắn user vào `req.user`
5. Route handler sử dụng `req.user` để biết user là ai

**Ví dụ:**
```javascript
// Middleware authenticate
const decoded = verifyJwt(token);
req.user = { id: decoded.userId, role: decoded.role };

// Trong controller
const userId = req.user.id; // Lấy userId từ token
```

---

### Q3: MongoDB khác gì với SQL?

**Trả lời:**
- **SQL (MySQL, PostgreSQL)**: 
  - Dữ liệu dạng bảng (table, row, column)
  - Cần định nghĩa schema trước
  - Quan hệ giữa các bảng (foreign key)
  
- **MongoDB (NoSQL)**:
  - Dữ liệu dạng document (JSON-like)
  - Không cần schema cố định (linh hoạt)
  - Embed hoặc reference (không có foreign key)

**Ví dụ:**
```javascript
// SQL: SELECT * FROM users WHERE email = 'john@example.com'
// MongoDB:
const user = await User.findOne({ email: 'john@example.com' });
```

---

### Q4: Socket.IO hoạt động như thế nào?

**Trả lời:**
- **HTTP**: Client gửi request → Server trả response → Ngắt kết nối
- **WebSocket (Socket.IO)**: Client kết nối → Giữ kết nối → Gửi/nhận data 2 chiều

**Flow Chat:**
```
1. Client kết nối Socket.IO với token
2. Server verify token → cho phép kết nối
3. Client join vào conversation room
4. User A gửi tin nhắn → Server nhận
5. Server lưu vào database
6. Server gửi tin nhắn đến User B qua WebSocket (ngay lập tức)
7. User B nhận tin nhắn mà không cần refresh
```

**Code:**
```javascript
// Server
socket.on('send_message', async (data) => {
  const message = await Message.create(data);
  io.to(`conversation_${conversationId}`).emit('new_message', message);
});
```

---

### Q5: Upload ảnh/video như thế nào?

**Trả lời:**
1. Client gửi file qua `multipart/form-data`
2. Multer nhận file → lưu tạm vào memory
3. Upload lên Cloudinary → nhận URL
4. Lưu URL vào database (không lưu file trực tiếp)

**Code:**
```javascript
// Middleware upload
const upload = multer({ storage: multer.memoryStorage() });

// Upload lên Cloudinary
const result = await cloudinary.uploader.upload(buffer, {
  folder: 'products',
});

// Lưu URL vào database
const product = await Product.create({
  images: [result.secure_url],
});
```

---

### Q6: Thanh toán ZaloPay hoạt động như thế nào?

**Trả lời:**
1. User chọn số tiền → App gọi API `/api/zalopay/create-order`
2. Server gọi ZaloPay API → nhận `orderUrl`
3. App mở ZaloPay với `orderUrl`
4. User thanh toán trong ZaloPay
5. ZaloPay gọi callback về server `/api/zalopay/callback`
6. Server verify callback → cập nhật số dư ví

**Code:**
```javascript
// Tạo đơn
const order = await createZaloPayOrder({ amount, orderId });
// Trả về orderUrl

// Callback
if (status === 1) { // Thành công
  await User.findByIdAndUpdate(userId, {
    $inc: { 'wallet.balance': amount },
  });
}
```

---

### Q7: Tính phí ship như thế nào?

**Trả lời:**
- Tích hợp API **Giao Hàng Nhanh (GHN)**
- Gửi thông tin: địa chỉ gửi/nhận, kích thước, trọng lượng
- GHN trả về phí ship

**Code:**
```javascript
const response = await axios.post('https://.../fee', {
  from_district_id,
  to_district_id,
  weight,
  length,
  width,
  height,
});
const fee = response.data.data.total;
```

---

### Q8: Validation dữ liệu như thế nào?

**Trả lời:**
- Dùng **Zod** để validate
- Định nghĩa schema → validate trước khi xử lý

**Code:**
```javascript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Validate
const data = schema.parse(req.body); // Throw error nếu không hợp lệ
```

---

### Q9: Middleware là gì? Dùng để làm gì?

**Trả lời:**
- **Middleware** là hàm chạy **trước** route handler
- Dùng để:
  - Authentication (kiểm tra token)
  - Authorization (kiểm tra quyền)
  - Validation (kiểm tra dữ liệu)
  - Error handling (xử lý lỗi)
  - Logging (ghi log)

**Ví dụ:**
```javascript
// Middleware authenticate
app.use('/api/products', authenticate);

// Route handler
app.get('/api/products', getProducts);
// authenticate chạy trước getProducts
```

---

### Q10: Error handling như thế nào?

**Trả lời:**
- Dùng **error handler middleware** ở cuối cùng
- Bắt tất cả lỗi → format response thống nhất

**Code:**
```javascript
// Trong controller
try {
  // Logic
} catch (err) {
  next(err); // Chuyển lỗi đến error handler
}

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});
```

---

### Q11: Database có những bảng (collections) nào?

**Trả lời:**
- **User**: Thông tin người dùng
- **Product**: Sản phẩm (xe điện, pin)
- **Order**: Đơn hàng
- **Conversation**: Cuộc trò chuyện
- **Message**: Tin nhắn
- **Contract**: Hợp đồng
- **WalletTopup**: Lịch sử nạp tiền
- **WalletTransaction**: Giao dịch ví
- **SubscriptionPlan**: Gói đăng ký
- **UserSubscription**: Đăng ký của user

---

### Q12: API có tài liệu không?

**Trả lời:**
- Có, dùng **Swagger**
- Truy cập: `http://localhost:5000/api-docs`
- Tự động generate từ code comments

**Code:**
```javascript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 */
router.get('/products', getProducts);
```

---

**CHÚC BẠN THUYẾT TRÌNH THÀNH CÔNG! 🎉**

Nếu có câu hỏi nào khác, hãy tham khảo code và tài liệu trên để trả lời chi tiết.

