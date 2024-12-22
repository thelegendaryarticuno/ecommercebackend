const express = require('express');
const Product = require('../models/product'); // Adjust the path to your Product model
const router = express.Router();

// Add a new product
router.post('/product/add', async (req, res) => {
  try {
    const { name, price, img, category, rating, inStockValue } = req.body;

    // Validate required fields
    if (!name || !price || !category || !inStockValue) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, price, category, and in-stock value are required',
      });
    }

    // Generate unique product ID
    const productId = require('crypto').randomBytes(6).toString('hex');

    // Create new product
    const product = new Product({
      name,
      price,
      img,
      category,
      rating: rating || 0, // Default rating to 0 if not provided
      productId,
      inStockValue,
      soldStockValue: 0, // Default sold stock to 0
      visibility: 'on', // Default visibility to 'on'
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      productId,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error adding product',
      details: error.message,
    });
  }
});

// Delete a product by productId
router.delete('/product/delete/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId
    if (!productId) {
      return res.status(400).json({
        error: 'Product ID is required',
      });
    }

    // Find and delete product
    const product = await Product.findOneAndDelete({ productId });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      productId,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error deleting product',
      details: error.message,
    });
  }
});

module.exports = router;
