// Route to update a product's description
router.put('/update-description/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { description } = req.body;

    // Validation
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    // Update the product
    const updatedProduct = await Product.findOneAndUpdate(
      { productId },
      { description },
      { new: true } // Return the updated document
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product description updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product description',
      error: error.message
    });
  }
});
