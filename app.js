const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = "mongodb+srv://ecommerce:ecommerce@ecommerce.dunf0.mongodb.net/";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: String,
  img: String,
  category: String,
  rating: Number
});

const Product = mongoose.model('Product', productSchema);

// Create Product Route
app.post('/create-product', async (req, res) => {
  try {
    const productData = req.body;
    const product = new Product(productData);
    const result = await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});
// Get All Products Route
app.get('/get-product', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});
// Complaints Schema
const complaintsSchema = new mongoose.Schema({
  complaintNumber: String,
  name: String,
  email: String,
  message: String,
  userType: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Complaint = mongoose.model('Complaint', complaintsSchema);

// Post Complaint Route
app.post('/post-complaints', async (req, res) => {
  try {
    const { name, email, message, userType } = req.body;

    // Generate 6 digit random complaint number
    const complaintNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const complaintData = {
      complaintNumber,
      name,
      email, 
      message,
      userType
    };

    const complaint = new Complaint(complaintData);
    const result = await complaint.save();

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      complaint: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering complaint',
      error: error.message
    });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
