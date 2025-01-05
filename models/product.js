const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: String,
  price: String,
  img: [{type: String}],
  category: String,
  description: String,
  rating: Number,
  productId: { type: String, unique: true }, // Added productId field
  inStockValue: Number, // Available stock value
  soldStockValue: Number, // Number of items sold
  visibility: { type: String, default: 'on' } // Visibility field with default 'on'
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
