// capstone-backend/index.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const streamifier = require('streamifier');
const Stripe = require('stripe');

// ---- Models & Utilities (ensure these files exist) ----
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');
const { auth, isAdmin } = require('./middleware/auth');
const cloudinary = require('./utils/cloudinary');

// ---- App & Core Middleware ----
const app = express();

// CORS: allow your Vite dev origins; do NOT pass a URL to app.use()
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin(origin, cb) {
      // allow no-origin (curl, Postman) and known dev origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// IMPORTANT: Do not add app.options('*', ...) on Express 5; it trips path-to-regexp.
// If you really want to short-circuit OPTIONS, do it generically:
// app.use((req, res, next) => { if (req.method === 'OPTIONS') return res.sendStatus(204); next(); });

app.use(express.json());

// (DEV) CSP permissive enough for Stripe Payment Element.
// For production, consider helmet with a tighter policy.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "style-src-elem 'self' 'unsafe-inline'",
      "style-src-attr 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "object-src 'none'",
    ].join('; ')
  );
  next();
});

// ---- Database ----
const DB_URL = process.env.DB_URL;
const DB_NAME = process.env.DB_NAME || 'capstone';
if (!DB_URL) {
  console.error('❌ Missing DB_URL in .env');
  process.exit(1);
}
mongoose
  .connect(DB_URL, { dbName: DB_NAME })
  .then(() => console.log('✅ Mongo connected'))
  .catch((err) => {
    console.error('❌ Mongo connection error:', err);
    process.exit(1);
  });

// ---- Auth helpers ----
function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'changeme',
    { expiresIn: '7d' }
  );
}

// ---- Routes ----

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { name = '', email, password, role = 'user' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    // NOTE: For MVP we store plain text; replace with bcrypt in production.
    const user = await User.create({ name, email, password, role });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ message: 'Register failed' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing creds' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Products
app.get('/products', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { categories: { $in: [category] } } : {};
    const items = await Product.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    console.error('GET /products error:', e);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.post('/products', auth, isAdmin, async (req, res) => {
  try {
    const payload = { ...req.body };

    // normalize price and categories
    if (typeof payload.price === 'string') payload.price = Number(payload.price);
    if (payload.categories && !Array.isArray(payload.categories)) {
      payload.categories = String(payload.categories)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!payload.name || !String(payload.name).trim()) {
      return res.status(400).json({ message: 'Name required' });
    }
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    const p = await Product.create(payload);
    res.status(201).json(p);
  } catch (e) {
    console.error('POST /products error:', e);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

app.delete('/products/:id', auth, isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /products error:', e);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Cloudinary upload (admin) — multer memory + upload_stream
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', auth, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'capstone' },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await streamUpload();
    res.status(201).json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Upload failed', details: String(err?.message || err) });
  }
});

// Stripe PaymentIntent
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

app.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'No items' });
    }

    let amount = 0;
    for (const it of items) {
      const price = Number(it.price);
      const qty = Math.max(1, Number(it.qty) || 1);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: 'Invalid price in cart' });
      }
      amount += Math.round(price * 100) * qty;
    }
    if (amount < 50) return res.status(400).json({ message: 'Total must be at least $0.50' });

    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { userId: req.user?.id || 'guest' },
    });

    res.json({ clientSecret: pi.client_secret });
  } catch (e) {
    console.error('Stripe PI error:', e?.type || e?.message || e);
    res.status(500).json({ message: 'Payment intent failed' });
  }
});

// Orders
app.post('/orders', auth, async (req, res) => {
  try {
    const { items, paymentId } = req.body;
    if (!req.user || !req.user.id || !req.user.email) {
      return res.status(400).json({ message: 'User not available on request' });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'No items provided' });
    }

    const normItems = [];
    let total = 0;
    for (const it of items) {
      const price = Number(it.price);
      const qty = Math.max(1, Number(it.qty) || 1);
      if (!it._id || !it.name) return res.status(400).json({ message: 'Invalid item' });
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'Invalid price' });

      total += price * qty;
      normItems.push({
        productId: String(it._id),
        name: String(it.name),
        price,
        qty,
        imageUrl: it.imageUrl || '',
      });
    }
    if (total <= 0) return res.status(400).json({ message: 'Order total must be > 0' });

    const order = await Order.create({
      user: { id: req.user.id, email: req.user.email, name: req.user.name || '' },
      items: normItems,
      total,
      paymentId: paymentId || '',
      status: 'paid',
    });

    res.status(201).json(order);
  } catch (e) {
    console.error('Create order error:', e?.message || e);
    res.status(500).json({ message: 'Failed to save order' });
  }
});

// ---- Start ----
const PORT = process.env.PORT || 3500;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
