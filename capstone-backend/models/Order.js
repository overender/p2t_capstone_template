const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: Object, required: true }, // { id, email, name }
  items: [{
    productId: String,
    name: String,
    price: Number,
    qty: Number,
    imageUrl: String,
  }],
  total: Number,
  paymentId: String,
  status: { type: String, default: 'paid' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
