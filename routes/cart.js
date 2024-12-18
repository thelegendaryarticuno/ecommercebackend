const express = require('express');
const router = express.Router();
const Cart = require('../models/cartmodel');

// Add to Cart Route
router.post('/addtocart', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    // Find existing cart for user
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Cart exists, add product to existing cart
      cart.productsInCart.push({
        productId,
        quantity
      });
      await cart.save();
    } else {
      // Create new cart
      cart = new Cart({
        userId,
        productsInCart: [{
          productId,
          quantity
        }]
      });
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Product added to cart successfully',
      cart
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false, 
      message: 'Error adding product to cart',
      error: error.message
    });
  }
});

// Get Cart by User ID Route
router.post('/get-cart', async (req, res) => {
    try {
      const { userId } = req.body;
      const cart = await Cart.findOne({ userId });
  
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found for this user'
        });
      }
  
      res.status(200).json({
        success: true,
        cart
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching cart',
        error: error.message
      });
    }
  });
  

// Delete Item from Cart Route
router.delete('/delete-items', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    // Find cart by userId
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found for this user'
      });
    }

    // Filter out the product to be deleted
    cart.productsInCart = cart.productsInCart.filter(
      item => item.productId !== productId
    );

    // Save updated cart
    const updatedCart = await cart.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from cart successfully',
      cart: updatedCart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing product from cart',
      error: error.message
    });
  }
});

// Update Product Quantity in Cart Route
router.put('/update-quantity', async (req, res) => {
  try {
    const { userId, productId, productQty } = req.body;
    
    // Find cart by userId
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found for this user'
      });
    }

    // Find and update product quantity
    const productIndex = cart.productsInCart.findIndex(
      item => item.productId === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }

    cart.productsInCart[productIndex].productQty = productQty;

    // Save updated cart
    const updatedCart = await cart.save();

    res.status(200).json({
      success: true,
      message: 'Product quantity updated successfully',
      cart: updatedCart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product quantity',
      error: error.message
    });
  }
});

module.exports = router;
