const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/cartmodel');
const Order = require('../models/complaintmodel'); // Replace with correct path
const User = require('../models/user'); // Replace with correct path
const Product = require('../models/product'); // Replace with correct path
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: `pecommerce8@gmail.com`,
    pass: `rqrdabxuzpaecigz`
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Add to Cart Route
router.post('/addtocart', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (cart) {
      cart.productsInCart.push({ productId, quantity });
      await cart.save();
    } else {
      cart = new Cart({ userId, productsInCart: [{ productId, quantity }] });
      await cart.save();
    }

    res.status(200).json({ success: true, message: 'Product added to cart successfully', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding product to cart', error: error.message });
  }
});

// Get Cart by User ID Route
router.post('/get-cart', async (req, res) => {
  try {
    const { userId } = req.body;
    const cart = await Cart.findOne({ userId });

    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found for this user' });

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
});

// Delete Item from Cart Route
router.delete('/delete-items', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found for this user' });

    cart.productsInCart = cart.productsInCart.filter(
      item => !mongoose.Types.ObjectId(item.productId).equals(productId)
    );

    const updatedCart = await cart.save();

    res.status(200).json({ success: true, message: 'Product removed from cart successfully', cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing product from cart', error: error.message });
  }
});

// Update Product Quantity in Cart Route
router.put('/update-quantity', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found for this user' });

    const productIndex = cart.productsInCart.findIndex(
      item => mongoose.Types.ObjectId(item.productId).equals(productId)
    );
    if (productIndex === -1) return res.status(404).json({ success: false, message: 'Product not found in cart' });

    cart.productsInCart[productIndex].quantity = quantity;

    const updatedCart = await cart.save();

    res.status(200).json({ success: true, message: 'Product quantity updated successfully', cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating product quantity', error: error.message });
  }
});

// Place Order Route
router.post('/place-order', async (req, res) => {
  try {
    const { userId, date, time, address, price, productsOrdered } = req.body;

    const orderId = Math.floor(100000 + Math.random() * 900000).toString();
    const trackingId = Math.random().toString(36).substring(2, 14).toUpperCase();

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const productIds = productsOrdered.map(item => item.productId);

    const productDetails = await Product.find({ productId: { $in: productIds } });

    const order = new Order({
      userId,
      orderId,
      date,
      time,
      address,
      email: user.email,
      name: user.name,
      productIds,
      trackingId,
      price
    });

    await order.save();

    const emailHtml = `<div>Order Confirmation for ${user.name}...</div>`; // Simplified for brevity
    await transporter.sendMail({ from: `pecommerce8@gmail.com`, to: user.email, subject: 'Order Confirmation', html: emailHtml });

    res.status(200).json({ success: true, message: 'Order placed successfully', orderId, trackingId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error placing order', error: error.message });
  }
});

module.exports = router;
