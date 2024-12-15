const express = require('express');
const router = express.Router();
const Seller = require('../models/seller');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'pecommerce8@gmail.com',
    pass: 'rqrdabxuzpaecigz'
  }
});

// Store OTPs temporarily
const otpStore = new Map();

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { phoneNumber, emailId, password } = req.body;

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email: emailId });
    if (existingSeller) {
      return res.status(400).json({ error: 'Seller already exists' });
    }

    // Generate unique seller ID (MBSLR + 5 digits)
    let sellerId;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      sellerId = `MBSLR${randomNum}`;
      const existingId = await Seller.findOne({ sellerId });
      if (!existingId) isUnique = true;
    }

    // Create new seller
    const seller = new Seller({
      phone: phoneNumber,
      email: emailId,
      password,
      sellerId,
      emailVerified: false,
      phoneVerified: false
    });

    await seller.save();

    // Store sellerId in session
    req.session.sellerId = sellerId;

    res.status(201).json({ 
      message: 'Seller registered successfully',
      sellerId 
    });

  } catch (err) {
    res.status(500).json({ error: 'Error registering seller' });
  }
});

// Send OTP Route
router.post('/send-otp', async (req, res) => {
  try {
    const { sellerId, emailId } = req.body;

    // Verify seller exists
    const seller = await Seller.findOne({ 
      sellerId,
      email: emailId
    });

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with email
    otpStore.set(emailId, otp);

    // Send OTP email
    const mailOptions = {
      from: '"Mera Bestie Support" <pecommerce8@gmail.com>',
      to: emailId,
      subject: 'Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Mera Bestie Seller Verification</h2>
          <p>Your verification OTP is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP sent successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Error sending OTP' });
  }
});

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, email } = req.body;

    // Get stored OTP
    const storedOtp = otpStore.get(email);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Update verification status
    await Seller.findOneAndUpdate(
      { email },
      { 
        emailVerified: true,
        phoneVerified: true
      }
    );

    // Clear OTP from store
    otpStore.delete(email);

    res.status(200).json({ message: 'Valid OTP' });

  } catch (error) {
    res.status(500).json({ error: 'Error verifying OTP' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { sellerId, emailOrPhone, password } = req.body;

    // Find seller by ID and email/phone
    const seller = await Seller.findOne({
      sellerId,
      $or: [
        { email: emailOrPhone },
        { phone: emailOrPhone }
      ]
    });

    if (!seller) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Store sellerId in session
    req.session.sellerId = sellerId;

    res.status(200).json({ 
      message: 'Login successful',
      sellerId
    });

  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

module.exports = router;

