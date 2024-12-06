const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const authRoutes = require('./routes/auth');
const uuid = require('uuid'); 

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(require('cookie-parser')());

app.use(
  session({
    secret: "a57cb2f7c4a1ef3a8a3c6a5bf213d998812de8fc7bb47da8b7347a92f9ec48d9",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb+srv://ecommerce:ecommerce@ecommerce.dunf0.mongodb.net/",
      collectionName: 'sessions',
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Routes
app.use('/auth', authRoutes);

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
  rating: Number,
  productId: { type: String, unique: true } // Added productId field
});

const Product = mongoose.model('Product', productSchema);

// Keep-Alive Route
app.get('/keep-alive', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is up and running'
  });
});

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

// Get Product by ID Route
app.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false, 
      message: 'Error fetching product',
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

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'pecommerce8@gmail.com',
    pass: 'rqrdabxuzpaecigz'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Function to send confirmation email
const sendConfirmationEmail = async (email, complaintNumber, message) => {
  try {
    const mailOptions = {
      from: '"Mera Bestie" <pecommerce8@gmail.com>',
      to: email,
      subject: 'Complaint Registration Confirmation',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px; background-color: #ffffff;">
          <!-- Stylish Header -->
          <div style="background-color: #ffb6c1; padding: 15px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="font-family: 'Brush Script MT', cursive; color: #ffffff; font-size: 36px; margin: 0;">Mera Bestie</h1>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 20px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Complaint Registration Confirmation</h2>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Complaint ID:</strong> ${complaintNumber}</p>
              <p style="margin: 10px 0;"><strong>Issue Description:</strong></p>
              <p style="margin: 10px 0; font-style: italic; color: #555;">${message}</p>
            </div>
            <p style="color: #7f8c8d; font-size: 16px; line-height: 1.5;">
              Thank you for reaching out to us! Our experienced specialists are already working on resolving your issue. You can expect a detailed reply to your query within 24 hours. We appreciate your patience and understanding.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #95a5a6; font-size: 12px; line-height: 1.4;">
              This is an automated email. Please do not reply to this message.<br>
              If you have any additional questions, feel free to contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `
        Mera Bestie

        Complaint Registration Confirmation

        Complaint ID: ${complaintNumber}

        Issue Description:
        ${message}

        Thank you for reaching out to us! Our experienced specialists are already working on resolving your issue. You can expect a detailed reply to your query within 24 hours. We appreciate your patience and understanding.

        This is an automated email. Please do not reply to this message.
        If you have any additional questions, feel free to contact our support team.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
};

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

    // Send confirmation email
    await sendConfirmationEmail(email, complaintNumber, message);

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

// Assign Product ID Route
app.get('/assign-productid', async (req, res) => {
  try {
    // Find all products
    const products = await Product.find();
    
    if (products.length === 0) {
      return res.status(404).send('No products found to assign productIds.');
    }

    // Update each product to add a productId
    const updatedProducts = [];
    const usedIds = new Set(); // Track used IDs to ensure uniqueness

    for (const product of products) {
      let productId;
      // Generate unique 6 digit number
      do {
        productId = Math.floor(100000 + Math.random() * 900000).toString();
      } while (usedIds.has(productId));
      
      usedIds.add(productId);

      const updateResult = await Product.findOneAndUpdate(
        { _id: product._id },
        { $set: { productId } },
        { new: true }
      );

      if (updateResult) {
        updatedProducts.push(updateResult);
      } else {
        console.error(`Failed to update product with ID: ${product._id}`);
      }
    }

    // Save all updated products
    await Promise.all(updatedProducts.map(product => product.save()));

    res.status(200).json({
      success: true,
      message: 'Product IDs assigned successfully',
      products: updatedProducts
    });
  } catch (err) {
    console.error('Error during product ID assignment:', err);
    res.status(500).json({
      success: false,
      message: 'Error assigning product IDs',
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
