const multer = require('multer'); // For handling multipart form-data (image uploads)
const cloudinary = require('cloudinary').v2; // For uploading images to Cloudinary
const fs = require('fs'); // For filesystem operations to remove temporary files
const express = require('express'); // Express framework for routing
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dcpeald0j', // Replace with your Cloudinary cloud name
  api_key: '132119233254829', // Replace with your Cloudinary API key
  api_secret: 'H_3e9H4aderXwlMVyuTLsfwvCTU' // Replace with your Cloudinary API secret
});

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Temp folder to store uploaded files

// Route: POST /image-upload
router.post('/image-upload', upload.single('image'), async (req, res) => {
  try {
    // Get the uploaded file from Multer
    const filePath = req.file.path;

    // Upload the image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'uploads', // Specify a folder in Cloudinary (optional)
    });

    // Delete the file from the server after uploading
    fs.unlinkSync(filePath);

    // Respond with the Cloudinary URL
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: uploadResult.secure_url,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message,
    });
  }
});

// Export the router
module.exports = router;