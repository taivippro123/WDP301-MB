# HƯỚNG DẪN CHI TIẾT VỀ BACKEND - PHẦN 1

## 📋 MỤC LỤC
1. [Tổng quan về Backend](#1-tổng-quan-về-backend)
2. [Express.js và Cấu trúc Server](#2-expressjs-và-cấu-trúc-server)
3. [MongoDB và Mongoose](#3-mongodb-và-mongoose)
4. [Authentication và JWT](#4-authentication-và-jwt)
5. [Middleware](#5-middleware)
6. [Routes và Controllers](#6-routes-và-controllers)

---

## 1. TỔNG QUAN VỀ BACKEND

### 1.1. Backend là gì?
Backend là **phần server** của ứng dụng, xử lý:
- Lưu trữ dữ liệu (database)
- Xử lý logic nghiệp vụ
- Cung cấp API cho frontend
- Xác thực người dùng
- Tích hợp với dịch vụ bên thứ ba (ZaloPay, GHN, Cloudinary...)

### 1.2. Công nghệ sử dụng:
- **Node.js**: Môi trường chạy JavaScript trên server
- **Express.js**: Framework web cho Node.js
- **MongoDB**: Database NoSQL
- **Mongoose**: ODM (Object Document Mapper) cho MongoDB
- **Socket.IO**: Real-time communication (chat)
- **JWT**: Xác thực người dùng
- **Cloudinary**: Lưu trữ ảnh/video
- **Swagger**: Tài liệu API

### 1.3. Cấu trúc thư mục:
```
Server/
├── src/
│   ├── index.js              # Entry point, khởi động server
│   ├── config/               # Cấu hình (database, cloudinary, email...)
│   ├── models/               # Mongoose models (User, Product, Order...)
│   ├── controllers/           # Xử lý logic nghiệp vụ
│   ├── routes/                # Định nghĩa API endpoints
│   ├── middlewares/           # Middleware (auth, error handling...)
│   ├── services/              # Business logic phức tạp
│   ├── utils/                 # Tiện ích (JWT, bcrypt...)
│   └── validations/           # Validation dữ liệu (Zod)
└── package.json
```

---

## 2. EXPRESS.JS VÀ CẤU TRÚC SERVER

### 2.1. Express.js là gì?
**Express.js** là framework web nhẹ cho Node.js, giúp:
- Tạo API endpoints
- Xử lý HTTP requests/responses
- Sử dụng middleware
- Định tuyến (routing)

### 2.2. Khởi động Server

**File: `src/index.js`**
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

dotenv.config(); // Load biến môi trường từ .env

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true })); // Cho phép CORS
app.use(express.json()); // Parse JSON body
app.use(cookieParser()); // Parse cookies

// Kết nối database
await connectDB(process.env.MONGO_URI);

// Đăng ký routes
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', chatRoutes);
// ...

// Error handler
app.use(errorHandler);

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server on ${PORT}`);
});
```

**Giải thích:**
- `express()`: Tạo Express app
- `app.use()`: Đăng ký middleware
- `app.use('/api', routes)`: Tất cả routes bắt đầu bằng `/api`
- `app.listen()`: Lắng nghe requests trên port

### 2.3. HTTP Methods

**Các phương thức HTTP:**
- **GET**: Lấy dữ liệu (ví dụ: lấy danh sách sản phẩm)
- **POST**: Tạo mới (ví dụ: đăng nhập, tạo sản phẩm)
- **PUT/PATCH**: Cập nhật (ví dụ: cập nhật thông tin user)
- **DELETE**: Xóa (ví dụ: xóa sản phẩm)

**Ví dụ:**
```javascript
// GET - Lấy danh sách sản phẩm
app.get('/api/products', getProducts);

// POST - Tạo sản phẩm mới
app.post('/api/products', authenticate, createProduct);

// PUT - Cập nhật sản phẩm
app.put('/api/products/:id', authenticate, updateProduct);

// DELETE - Xóa sản phẩm
app.delete('/api/products/:id', authenticate, deleteProduct);
```

---

## 3. MONGODB VÀ MONGOOSE

### 3.1. MongoDB là gì?
**MongoDB** là database NoSQL:
- Lưu trữ dữ liệu dạng **document** (JSON-like)
- Không cần schema cố định (linh hoạt)
- Dễ mở rộng (scalable)

### 3.2. Mongoose là gì?
**Mongoose** là ODM (Object Document Mapper):
- Định nghĩa **Schema** (cấu trúc dữ liệu)
- Tạo **Model** để thao tác với database
- Validation, middleware, methods...

### 3.3. Kết nối Database

**File: `src/config/db.js`**
```javascript
import mongoose from 'mongoose';

export async function connectDB(mongoUri) {
  if (!mongoUri) {
    throw new Error('Missing MONGO_URI');
  }
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}
```

**Sử dụng:**
```javascript
// File: src/index.js
await connectDB(process.env.MONGO_URI);
```

### 3.4. Tạo Model

**File: `src/models/User.js`**
```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true }); // Tự động thêm createdAt, updatedAt

export default mongoose.model('User', userSchema);
```

**Giải thích:**
- `mongoose.Schema()`: Định nghĩa cấu trúc dữ liệu
- `required: true`: Bắt buộc phải có
- `unique: true`: Giá trị duy nhất (không trùng)
- `select: false`: Không trả về khi query (dùng cho password)
- `enum`: Chỉ cho phép các giá trị trong mảng
- `timestamps: true`: Tự động thêm createdAt, updatedAt

### 3.5. Thao tác với Database

**1. Tạo mới (Create):**
```javascript
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  password: 'hashedPassword',
});
```

**2. Tìm kiếm (Read):**
```javascript
// Tìm tất cả
const users = await User.find();

// Tìm một
const user = await User.findOne({ email: 'john@example.com' });

// Tìm theo ID
const user = await User.findById(userId);

// Tìm với điều kiện
const activeUsers = await User.find({ isActive: true });
```

**3. Cập nhật (Update):**
```javascript
// Cập nhật một
await User.findByIdAndUpdate(userId, { name: 'New Name' });

// Cập nhật nhiều
await User.updateMany({ isActive: false }, { isActive: true });
```

**4. Xóa (Delete):**
```javascript
// Xóa một
await User.findByIdAndDelete(userId);

// Xóa nhiều
await User.deleteMany({ isActive: false });
```

**5. Populate (Join):**
```javascript
// User có reference đến Product
const user = await User.findById(userId).populate('products');
// products sẽ là array các Product objects thay vì chỉ IDs
```

---

## 4. AUTHENTICATION VÀ JWT

### 4.1. Authentication là gì?
**Authentication** là xác thực người dùng:
1. User đăng nhập với email/password
2. Server kiểm tra → tạo **JWT token**
3. Client lưu token → gửi kèm mỗi request
4. Server verify token → cho phép/từ chối

### 4.2. JWT là gì?
**JWT (JSON Web Token)** là chuỗi mã hóa chứa thông tin user:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkiLCJyb2xlIjoiYWRtaW4ifQ.signature
```

**Cấu trúc:**
- **Header**: Thuật toán mã hóa
- **Payload**: Dữ liệu (userId, role...)
- **Signature**: Chữ ký để verify

### 4.3. Tạo và Verify JWT

**File: `src/utils/jwt.js`**
```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Tạo token
export function signJwt(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || '15m', // Hết hạn sau 15 phút
  });
}

// Verify token
export function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null; // Token không hợp lệ
  }
}
```

**Sử dụng:**
```javascript
// Tạo token khi đăng nhập
const accessToken = signJwt(
  { userId: user._id, role: user.role },
  { expiresIn: '15m' }
);

// Verify token trong middleware
const decoded = verifyJwt(token);
if (!decoded) {
  // Token không hợp lệ
}
```

### 4.4. Flow Đăng nhập

**File: `src/controllers/authController.js`**
```javascript
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm user
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 2. Kiểm tra password
    const ok = await comparePassword(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // 3. Tạo tokens
    const accessToken = signJwt(
      { userId: user._id, role: user.role },
      { expiresIn: '15m' }
    );
    const refreshToken = signJwt(
      { userId: user._id, role: user.role },
      { expiresIn: '7d' }
    );

    // 4. Lưu vào cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true, // Không thể truy cập từ JavaScript
      secure: true, // Chỉ gửi qua HTTPS
      maxAge: 15 * 60 * 1000, // 15 phút
    });

    // 5. Trả về response
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};
```

**Giải thích:**
- `select('+password')`: Lấy password (mặc định bị ẩn)
- `comparePassword()`: So sánh password với hash
- `httpOnly: true`: Cookie không thể truy cập từ JavaScript (bảo mật)
- `secure: true`: Chỉ gửi qua HTTPS

### 4.3. Hash Password

**File: `src/utils/bcrypt.js`**
```javascript
import bcrypt from 'bcryptjs';

// Hash password
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// So sánh password
export async function comparePassword(password, hashed) {
  return bcrypt.compare(password, hashed);
}
```

**Lưu ý:**
- **KHÔNG BAO GIỜ** lưu password dạng plain text
- Luôn hash password trước khi lưu vào database
- Dùng `bcrypt` để hash (one-way, không thể reverse)

---

## 5. MIDDLEWARE

### 5.1. Middleware là gì?
**Middleware** là hàm chạy **trước** khi đến route handler:
- Xử lý request/response
- Authentication, authorization
- Validation, logging
- Error handling

**Flow:**
```
Request → Middleware 1 → Middleware 2 → Route Handler → Response
```

### 5.2. Authentication Middleware

**File: `src/middlewares/authenticate.js`**
```javascript
export const authenticate = (req, res, next) => {
  try {
    // 1. Lấy token từ header hoặc cookie
    let token = req.headers?.authorization || req.cookies?.accessToken;
    
    if (token?.startsWith('Bearer ')) {
      token = token.slice(7); // Bỏ "Bearer "
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // 2. Verify token
    const decoded = verifyJwt(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // 3. Gắn user vào request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };

    // 4. Tiếp tục đến route handler
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
```

**Sử dụng:**
```javascript
// Route cần đăng nhập
router.get('/api/profile', authenticate, getProfile);

// Route không cần đăng nhập
router.post('/api/auth/login', login);
```

### 5.3. Authorization Middleware

**File: `src/middlewares/authorize.js`**
```javascript
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};
```

**Sử dụng:**
```javascript
// Chỉ admin mới được truy cập
router.delete('/api/users/:id', authenticate, authorize('admin'), deleteUser);
```

### 5.4. Error Handler Middleware

**File: `src/middlewares/errorHandler.js`**
```javascript
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Lỗi validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors,
    });
  }

  // Lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
    });
  }

  // Lỗi mặc định
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
};
```

**Sử dụng:**
```javascript
// Đăng ký ở cuối cùng (sau tất cả routes)
app.use(errorHandler);
```

---

## 6. ROUTES VÀ CONTROLLERS

### 6.1. Routes là gì?
**Routes** định nghĩa **endpoints** (URL) và phương thức HTTP:
```javascript
// GET /api/products → getProducts
// POST /api/products → createProduct
```

### 6.2. Controllers là gì?
**Controllers** chứa **logic xử lý** cho mỗi endpoint:
- Nhận request
- Xử lý logic
- Trả về response

### 6.3. Cấu trúc Route

**File: `src/routes/productRoutes.js`**
```javascript
import express from 'express';
import { getProducts, createProduct } from '../controllers/productController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

// GET /api/products
router.get('/products', getProducts);

// POST /api/products (cần đăng nhập)
router.post('/products', authenticate, createProduct);

export default router;
```

**File: `src/index.js`**
```javascript
import productRoutes from './routes/productRoutes.js';

app.use('/api', productRoutes);
// Tất cả routes trong productRoutes sẽ có prefix /api
```

### 6.4. Controller Pattern

**File: `src/controllers/productController.js`**
```javascript
import Product from '../models/Product.js';

export const getProducts = async (req, res, next) => {
  try {
    // 1. Lấy query parameters
    const { status, category, minPrice, maxPrice } = req.query;

    // 2. Tạo filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // 3. Query database
    const products = await Product.find(filter)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    // 4. Trả về response
    res.json(products);
  } catch (err) {
    next(err); // Chuyển lỗi đến error handler
  }
};

export const createProduct = async (req, res, next) => {
  try {
    // 1. Lấy dữ liệu từ body
    const { title, description, price, category } = req.body;

    // 2. Lấy user từ middleware authenticate
    const sellerId = req.user.id;

    // 3. Tạo sản phẩm
    const product = await Product.create({
      title,
      description,
      price,
      category,
      seller: sellerId,
      status: 'pending',
    });

    // 4. Trả về response
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};
```

**Giải thích:**
- `req.query`: Query parameters (`?status=active&category=vehicle`)
- `req.body`: Request body (JSON)
- `req.params`: Route parameters (`/products/:id` → `req.params.id`)
- `req.user`: User từ middleware authenticate
- `next(err)`: Chuyển lỗi đến error handler

### 6.5. Request/Response Flow

```
Client gửi request
    ↓
Express nhận request
    ↓
Middleware (authenticate, validate...)
    ↓
Route handler (controller)
    ↓
Query database (Mongoose)
    ↓
Trả về response
```

**Ví dụ cụ thể:**
```
1. Client: GET /api/products?status=active
2. Express: Nhận request
3. Middleware: authenticate (nếu cần)
4. Controller: getProducts()
5. Mongoose: Product.find({ status: 'active' })
6. Response: [{ ... }, { ... }]
```

---

**Kết thúc Phần 1. Tiếp tục với Phần 2 để tìm hiểu về Socket.IO, các tính năng chính, và câu hỏi thường gặp!**
