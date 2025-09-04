const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  description:{ type: String, default: '' },
  price:      { type: Number, required: true, min: 0 },
  imageUrl:   { type: String, default: '' },
  categories: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
