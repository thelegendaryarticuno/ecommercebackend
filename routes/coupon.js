const express = require('express');
const router = express.Router();
const Coupon = require('../models/couponmodel');
const nodemailer = require('nodemailer');
const User = require('../models/user'); // Assuming you have a User model
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendEmailToAllUsers(subject, message) {
  try {
    // Fetch all user emails from MongoDB
    const users = await User.find({}, 'email');
    const emailAddresses = users.map(user => user.email);

    if (emailAddresses.length === 0) {
      console.log('No email addresses found.');
      return;
    }

    await transporter.sendMail({
      from: '3dx',
      to: emailAddresses.join(','),
      subject: subject,
      text: message,
    });

    console.log(`Emails successfully sent to ${emailAddresses.length} users.`);
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}

// Get all coupons route
router.get('/get-coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({
      success: true,
      coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching coupons',
      error: error.message
    });
  }
});

// Save coupon route
router.post('/save-coupons', async (req, res) => {
  try {
    const { code, discountPercentage, name, status } = req.body;

    const coupon = new Coupon({
      code,
      discountPercentage,
      name,
      status
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon saved successfully',
      coupon
    });

    // Send email to all users about new coupon
    const subject = 'New Coupon Available!';
    const message = `A new coupon ${code} is now available with ${discountPercentage}% discount. Use it in your next purchase!`;
    await sendEmailToAllUsers(subject, message);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving coupon',
      error: error.message
    });
  }
});

// Delete coupon route
router.delete('/delete-coupons', async (req, res) => {
  try {
    const { code } = req.body;
    const deletedCoupon = await Coupon.findOneAndDelete({ code });

    if (deletedCoupon) {
      res.status(200).json({
        success: true,
        message: `Coupon with code ${code} deleted successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Coupon with code ${code} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting coupon',
      error: error.message
    });
  }
});

// Update status route
router.put('/update-status', async (req, res) => {
  try {
    const { code, status } = req.body;

    const updatedCoupon = await Coupon.findOneAndUpdate(
      { code },
      { status },
      { new: true }
    );

    if (updatedCoupon) {
      res.status(200).json({
        success: true,
        message: `Status of coupon with code ${code} updated successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Coupon with code ${code} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating coupon status',
      error: error.message
    });
  }
});

// Verify coupon route
router.post('/verify-coupons', async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    if (coupon.status === 'active') {
      return res.status(200).json({
        success: true,
        message: 'Coupon is valid and active',
        coupon
      });
    } else if (coupon.status === 'expired') {
      return res.status(200).json({
        success: false,
        message: 'Coupon has expired'
      });
    } else {
      return res.status(200).json({
        success: false,
        message: `Coupon is not active (status: ${coupon.status})`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying coupon',
      error: error.message
    });
  }
});

module.exports = router;