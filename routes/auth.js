const express = require('express');
const User = require('../models/user');
const router = express.Router();
const bcrypt = require('bcrypt');


router.post('/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;
  
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
  
      // Create a new user
      const userId = require('crypto').randomBytes(8).toString('hex'); // Generate unique user ID
      const user = new User({ name, email, password, userId });
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
  
      // Save userId in session
      req.session.userId = user.userId;
  
      // Respond with success
      res.status(200).json({ message: 'Login successful', userId: user.userId });
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
