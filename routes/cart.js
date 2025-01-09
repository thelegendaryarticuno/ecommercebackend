const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/cartmodel');
const Order = require('../models/complaintmodel'); // Replace with correct path
const User = require('../models/user'); // Replace with correct path
const Product = require('../models/product'); // Replace with correct path
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');


require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // Convert string to boolean
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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
    const productQty = parseInt(quantity);

    if (cart) {
      cart.productsInCart.push({ productId, productQty });
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

router.put('/update-quantity', async (req, res) => {
  const { userId, productId, productQty } = req.body;

  if (!userId || !productId || typeof productQty !== 'number') {
    return res.status(400).json({ message: 'userId, productId, and a valid productQty are required.' });
  }

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const product = cart.productsInCart.find(item => item.productId === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found in the cart.' });
    }

    product.productQty = productQty;
    await cart.save();

    res.status(200).json({ message: 'Quantity updated successfully.' });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ message: 'An error occurred while updating the quantity.' });
  }
});
// Delete Item from Cart Route
router.post('/delete-items', async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ message: 'userId and productId are required.' });
  }

  try {
    const result = await Cart.updateOne(
      { userId },
      { $pull: { productsInCart: { productId } } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: 'Item deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Item not found in the cart.' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'An error occurred while deleting the item.' });
  }
});

router.post('/create-order', async (req, res) => {
  const { amount, currency, userId } = req.body; // Amount in smallest currency unit (e.g., paise for INR)

  try {
    const order = await razorpay.orders.create({
      amount: amount, // e.g., 50000 for ₹500
      currency: currency || 'INR',
      notes: {
        user: userId | null
      }
    });
    res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const secret = process.env.RAZORPAY_SECRET; // Replace with your Razorpay Secret

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto.createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    // Payment is valid
    res.json({ success: true });
  } else {
    // Payment is invalid
    res.json({ success: false });
  }
});

// Place Order Route
router.post('/place-order', async (req, res) => {
  try {
    const { userId, date, time, address, price, productsOrdered, paymentStatus, status } = req.body;

    // Generate random 6 digit orderId
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate random 12 digit alphanumeric trackingId
    const trackingId = Math.random().toString(36).substring(2, 14).toUpperCase();

    // Find user details
    const findUserDetails = async (userId) => {
      // Use mongoose model directly instead of undefined User
      const user = await mongoose.model('User').findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      return {
        name: user.name,
        email: user.email
      };
    };

    // Extract product IDs
    const getProductIds = (productsOrdered) => {
      return productsOrdered.map(item => item.productId);
    };

    // Find product details
    // const productDetailsFinder = async (productIds) => {
    //   const products = await Product.find({ productId: { $in: productIds } });
    //   return products;
    // };

    // Get user details
    const userDetails = await findUserDetails(userId);

    // Get product IDs array
    const productIds = getProductIds(productsOrdered);

    // Get product details
    // const productDetails = await productDetailsFinder(productIds);
    // Create new order
    const order = new Order({
      userId,
      orderId,
      date,
      time,
      address,
      email: userDetails.email,
      name: userDetails.name,
      productIds,
      trackingId,
      price,
      status: status,
      paymentStatus: paymentStatus
    });

    await order.save();

    // Send confirmation email
    const sendingMail = async () => {
      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: pink; padding: 20px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">Mera Bestie</h1>
        </div>
        
        <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
        <p>Dear ${userDetails.name},</p>
        <p>Thank you for your order! Your order has been successfully placed.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Tracking ID:</strong> ${trackingId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Delivery Address:</strong> ${address}</p>
        </div>

        <div style="margin-top: 20px; text-align: right;">
          <p><strong>Total Amount:</strong> ₹${price}</p>
        </div>

        <p style="margin-top: 30px;">You can track your order using the tracking ID provided above.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>Your Mera Bestie Team</p>
      </div>
    `;

      await transporter.sendMail({
        from: '"Mera Bestie Support" <pecommerce8@gmail.com>',
        to: userDetails.email,
        subject: `Order Confirmation - Order #${orderId}`,
        html: emailHtml
      });
    };

    await sendingMail();

    res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId,
      trackingId
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error placing order',
      error: error.message
    });
  }
});

module.exports = router;
