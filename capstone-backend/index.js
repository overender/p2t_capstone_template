require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const streamifier = require('streamifier');
const Stripe = require('stripe');
const jwt = require("jsonwebtoken");
const { auth, isAdmin } = require("./middleware/auth");
// ---- Models & Middleware & Utils ----
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');
const cloudinary = require('./utils/cloudinary');
const authRoutes = require('./routes/auth');

// ---- App ----
const app = express();

// ---- Core Middleware (before routes) ----
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(
  cors({
    origin(origin, cb) {
      // allow no-origin (curl/Postman) and dev origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// (Optional) CSP - fine for dev; if extensions complain, you can disable this in dev
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

// ---- Health ----
app.get('/health', (req, res) => res.json({ ok: true }));

// ---- Auth Routes (login/register) ----
// Keep these centralized in routes/auth.js (uses bcrypt + returns {token,user})
app.use('/auth', authRoutes);

// ---- Minimal protected endpoint to verify JWT ----
app.get('/me', auth, (req, res) => {
  // req.user comes from your JWT payload in middleware
  res.json({ user: req.user });
});

// ---- Products ----
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

// ---- Cloudinary upload (admin) — multer memory + upload_stream ----
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

// ---- Stripe PaymentIntent ----
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

// ---- Orders ----
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

// === MVP: Admin orders list ===
app.get('/orders', auth, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// === MVP: My orders ===
app.get('/my/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ 'user.id': req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch your orders' });
  }
});


// TEMP: make current user admin and return a fresh token
app.post("/auth/dev-elevate", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { role: "admin" } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Missing JWT_SECRET" });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ message: "Elevate failed" });
  }
});

// ---- Database & Start ----
const PORT = process.env.PORT || 3500;
const DB_URL = process.env.DB_URL;
const DB_NAME = process.env.DB_NAME || 'capstone';

if (!DB_URL) {
  console.error('❌ Missing DB_URL in .env');
  process.exit(1);
}

async function start() {
  try {
    await mongoose.connect(DB_URL, { dbName: DB_NAME });
    console.log(`✅ Mongo connected → ${DB_URL}/${DB_NAME}`);
    app.listen(PORT, () => console.log(`🚀 Server running → http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Server start error:', err.message);
    process.exit(1);
  }
}

start();
