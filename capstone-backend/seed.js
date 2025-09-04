// capstone-backend/seed.js
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.set('debug', false); // set true if you want to see every DB op

const Product = require('./models/Product');
const User = require('./models/User');

const run = async () => {
  try {
    console.log('Connecting to Mongo…');
    await mongoose.connect(process.env.DB_URL, { dbName: process.env.DB_NAME });
    console.log('Connected for seeding to DB:', mongoose.connection.name);

    // ---------- PRODUCTS ----------
    console.log('[1] Checking existing products…');
    const existingCount = await Product.estimatedDocumentCount();
    console.log(`[1] Product count: ${existingCount}`);

    if (existingCount === 0) {
      console.log('[2] Inserting sample products…');
      await Product.insertMany([
        { name: 'Starter Tee', description: 'Soft cotton shirt', price: 20, categories: ['Clothing'] },
        { name: 'Grip Shoes', description: 'Friction for vaults', price: 75, categories: ['Footwear'] },
        { name: 'Chalk Bag', description: 'Stay dry', price: 15, categories: ['Accessories'] },
      ]);
      console.log('[2] Inserted 3 products.');
    } else {
      console.log('[2] Skipping product seed (already present).');
    }

    // ---------- ADMIN USER ----------
    console.log('[3] Ensuring admin user exists…');
    const email = 'admin@example.com';
    let admin = await User.findOne({ email }).lean();
    if (!admin) {
      console.log('[3] Creating admin user…');
      admin = await User.create({
        name: 'Cristian',
        email,
        password: 'secret123', // hashed by User model hook
        role: 'admin',
      });
      console.log('[3] Admin created.');
    } else {
      console.log('[3] Admin already exists.');
    }

    // ---------- DONE ----------
    await mongoose.disconnect();
    console.log('Seeding complete. Disconnected.');
    process.exit(0);
  } catch (e) {
    console.error('SEED ERROR:', e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
};

run();
