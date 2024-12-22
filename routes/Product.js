const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer'); // Adjust the path as needed
const Product = require('../models/product');

// Route to upload multiple product images
router.post('/upload-images/:productId', upload.array('images', 5), async (req, res) => {
  try {
    const { productId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    // Update the product with the new images
    const product = await Product.findOneAndUpdate(
      { productId },
      { $push: { images: { $each: imageUrls } } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Images uploaded successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading images', error: error.message });
  }
});

module.exports = router;
