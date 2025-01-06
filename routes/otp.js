const express = require('express');
const router = express.Router();
const OTP = require('../models/otpmodels'); // Import OTP model
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true' || false, // use TLS
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
  },
  tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
  },
});

// Utility function to generate a 6-digit OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Route: /send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate request payload
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Generate OTP and expiration time
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

        // Save OTP to the database (create or update)
        const otpRecord = await OTP.findOneAndUpdate(
            { email },
            { otp, otpExpired: false, otpExpiresAt },
            { upsert: true, new: true }
        );

        // Send OTP via email
        await transporter.sendMail({
            from: '"Mera Bestie" ', 
            to: email,
            subject: 'Your OTP for Verification',
            text: `Your OTP is: ${otp}. It will expire in 2 minutes.`,
        });

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: /verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate request payload
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Find OTP record in the database
        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            return res.status(404).json({ message: 'OTP not found' });
        }

        // Check if OTP has expired
        if (otpRecord.otpExpired || otpRecord.otpExpiresAt < new Date()) {
            otpRecord.otpExpired = true;
            await otpRecord.save();
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Check if OTP is correct
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // OTP verified successfully
        otpRecord.otpExpired = true;
        await otpRecord.save();
        res.status(200).json({ message: 'OTP verification successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: /resend-otp
router.put('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate request payload
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Generate a new OTP and expiration time
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

        // Update the OTP record in the database
        const otpRecord = await OTP.findOneAndUpdate(
            { email },
            { otp, otpExpired: false, otpExpiresAt },
            { new: true }
        );

        if (!otpRecord) {
            return res.status(404).json({ message: 'Email not found' });
        }

        // Send the new OTP via email
        await transporter.sendMail({
            from: '"Mera Bestie" <your-email@gmail.com>', // Replace with your email
            to: email,
            subject: 'Your New OTP for Verification',
            text: `Your new OTP is: ${otp}. It will expire in 2 minutes.`,
        });

        res.status(200).json({ message: 'New OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
