const express = require('express');
const User = require('../models/user');
const router = express.Router();
const bcrypt = require('bcrypt');


router.post('/signup', async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
  
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
  
      // Create a new user
      const userId = require('crypto').randomBytes(8).toString('hex'); // Generate unique user ID
      const user = new User({ name, email, password, userId, phone });
      await user.save();
  
      // Automatically log the user in
      req.session.userId = user.userId;
  
      res.status(201).json({ message: 'User registered successfully', userId });
    } catch (err) {
      res.status(500).json({ error: 'Error registering user' });
    }
  });
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
  
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      // Check account status
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ error: 'Account is suspended' });
      }

      if (user.accountStatus === 'blocked') {
        return res.status(403).json({ error: 'Account is blocked' });
      }

      // If account status is 'open', proceed with login
      if (user.accountStatus === 'open') {
        // Save userId in session
        req.session.userId = user.userId;
    
        // Respond with success
        return res.status(200).json({ message: 'Login successful', userId: user.userId });
      }

      // Handle any other unexpected account status
      return res.status(400).json({ error: 'Invalid account status' });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Error logging in' });
    }
  });

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Error logging out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ userId }, { name: 1, _id: 0 }); // Fetch only name
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ name: user.name });
    } catch (err) {
      res.status(500).json({ error: 'Error fetching user details' });
    }
  });
  

module.exports = router;
