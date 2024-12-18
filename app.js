const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const authRoutes = require('./routes/auth');
const uuid = require('uuid');
const bcrypt = require('bcrypt'); // Added bcrypt import
const Seller = require('./models/seller');
const adminAuthRoutes = require('./routes/adminauth'); 

const app = express();

// Middleware
app.use(cors({
  origin: [' http://localhost:5173', 'http://localhost:3000','https://merabestie-orpin.vercel.app','https://merabestie-khaki.vercel.app','https://merabestie.com','https://hosteecommerce.vercel.app'], // Frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(require('cookie-parser')());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api', adminAuthRoutes);

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
  productId: { type: String, unique: true }, // Added productId field
  inStockValue: Number, // Available stock value
  soldStockValue: Number, // Number of items sold
  visibility: { type: String, default: 'on' } // Visibility field with default 'on'
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

// Update Product Visibility Route
app.put('/update-visibility', async (req, res) => {
  try {
    const { productId, visibility } = req.body;

    // Find and update the product, creating visibility field if it doesn't exist
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: productId },
      { $set: { visibility: visibility } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product visibility updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product visibility',
      error: error.message
    });
  }
});

// Get Product by Product ID Route
app.post('/:productId', async (req, res) => {
  try {
    const { productId } = req.body;

    // Find product by productId
    const product = await Product.findOne({ productId });

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

// Update Stock Status Route
app.post('/instock-update', async (req, res) => {
  try {
    const { productId, inStockValue, soldStockValue } = req.body;

    // Find and update the product
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: productId },
      {
        $set: {
          inStockValue: inStockValue,
          soldStockValue: soldStockValue
        }
      },
      { new: true, upsert: false }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock status updated successfully',
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating stock status',
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
  status: {
    type: String,
    default: 'Pending'
  },
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
// Get All Complaints Route
app.get('/get-complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find();
    
    res.status(200).json({
      success: true,
      complaints
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching complaints',
      error: error.message
    });
  }
});

// Update Complaint Status Route
app.put('/update-complaint-status', async (req, res) => {
  try {
    const { complaintId, status } = req.body;

    const updatedComplaint = await Complaint.findOneAndUpdate(
      { complaintNumber: complaintId },
      { $set: { status } },
      { new: true }
    );

    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint: updatedComplaint
    });

  } catch (error) {
    res.status(500).json({
      success: false, 
      message: 'Error updating complaint status',
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

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  productArray: [{
    productId: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }]
});

const Cart = mongoose.model('Cart', cartSchema);

// Add to Cart Route
app.post('/addtocart', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    // Find existing cart for user
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Cart exists, add product to existing cart
      cart.productArray.push({
        productId,
        quantity
      });
      await cart.save();
    } else {
      // Create new cart
      cart = new Cart({
        userId,
        productArray: [{
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
app.get('/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found for this user'
      });
    }

    res.status(200).json({
      success: true,
      cart: cart.productsInCart
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
app.delete('/delete-items', async (req, res) => {
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
app.put('/update-quantity', async (req, res) => {
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

// Address Schema
const addressSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  address: String
});

const Address = mongoose.model('Address', addressSchema);

// Update or Create Address Route
app.post('/update-address', async (req, res) => {
  try {
    const { userId, address } = req.body;

    // Try to find existing address for user
    const existingAddress = await Address.findOne({ userId });

    let result;
    if (existingAddress) {
      // Update existing address
      existingAddress.address = address;
      result = await existingAddress.save();
    } else {
      // Create new address entry
      const newAddress = new Address({
        userId,
        address
      });
      result = await newAddress.save();
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: error.message
    });
  }
});
// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: String,
  userId: String,
  date: String,
  time: String,
  address: String,
  email: String,
  name: String,
  productIds: [String],
  trackingId: String,
  price: Number
});

const Order = mongoose.model('Order', orderSchema);

// Place Order Route
app.post('/place-order', async (req, res) => {
  try {
    const { userId, date, time, address, price, productsOrdered } = req.body;

    // Generate random 6 digit orderId
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate random 12 digit alphanumeric trackingId
    const trackingId = Math.random().toString(36).substring(2, 14).toUpperCase();

    // Find user details
    const findUserDetails = async (userId) => {
      // Use mongoose model directly instead of undefined User
      const user = await mongoose.model('User').findOne({ userId });
      if (!user) {
        throw new Error('User not found');
      }
      return {
        name: user.name,
        email: user.email
      };
    };

    // Extract product IDs
    const getProductIds = (productsOrdered) => {
      return productsOrdered.map(item => item.productId);
    };

    // Find product details
    const productDetailsFinder = async (productIds) => {
      const products = await Product.find({ productId: { $in: productIds } });
      return products;
    };

    // Get user details
    const userDetails = await findUserDetails(userId);
    
    // Get product IDs array
    const productIds = getProductIds(productsOrdered);
    
    // Get product details
    const productDetails = await productDetailsFinder(productIds);
    // Create new order
    const order = new Order({
      userId,
      orderId,
      date,
      time,
      address,
      email: userDetails.email,
      name: userDetails.name,
      productIds,
      trackingId,
      price
    });

    await order.save();

    // Send confirmation email
    const sendingMail = async () => {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: pink; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333; margin: 0;">Mera Bestie</h1>
          </div>
          
          <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
          <p>Dear ${userDetails.name},</p>
          <p>Thank you for your order! Your order has been successfully placed.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Tracking ID:</strong> ${trackingId}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Delivery Address:</strong> ${address}</p>
          </div>

          <div style="margin-top: 20px; text-align: right;">
            <p><strong>Total Amount:</strong> ₹${price}</p>
          </div>

          <p style="margin-top: 30px;">You can track your order using the tracking ID provided above.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>Your Mera Bestie Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: '"Mera Bestie Support" <pecommerce8@gmail.com>',
        to: userDetails.email,
        subject: `Order Confirmation - Order #${orderId}`,
        html: emailHtml
      });
    };

    await sendingMail();

    res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId,
      trackingId
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error placing order', 
      error: error.message
    });
  }
});

// Get All Orders Route
app.get('/get-orders', async (req, res) => {
  try {
    const orders = await Order.find();
    
    res.status(200).json({
      success: true,
      orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// Get User Details Route
app.get('/get-user', async (req, res) => {
  try {
    const users = await mongoose.model('User').find(
      {}, // Remove filter to get all users
      '-password' // Exclude only the password field
    );
    
    res.status(200).json({
      success: true,
      users
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message
    });
  }
});

// Update Account Status Route
app.put('/update-account-status', async (req, res) => {
  try {
    const { userId, accountStatus } = req.body;

    // Find and update the user, and get the updated document
    const updatedUser = await mongoose.model('User').findOneAndUpdate(
      { userId: userId },
      { accountStatus },
      { new: true } // This option returns the modified document rather than the original
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account status updated successfully',
      user: {
        userId: updatedUser.userId,
        accountStatus: updatedUser.accountStatus
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating account status',
      error: error.message
    });
  }
});

const otpStore = new Map();

// Signup Route
app.post('/seller/signup', async (req, res) => {
  try {
    const { phoneNumber, emailId, password } = req.body;

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email: emailId });
    if (existingSeller) {
      return res.status(400).json({ error: 'Seller already exists' });
    }

    // Generate unique seller ID (MBSLR + 5 digits)
    let sellerId;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      sellerId = `MBSLR${randomNum}`;
      const existingId = await Seller.findOne({ sellerId });
      if (!existingId) isUnique = true;
    }

    // Create new seller with required fields from schema
    const seller = new Seller({
      name: 'Not Available',
      email: emailId,
      password: password,
      sellerId: sellerId,
      emailVerified: false,
      phoneVerified: false,
      phoneNumber: phoneNumber,
      businessName: 'Not Available',
      businessAddress: 'Not Available', 
      businessType: 'Not Available'
    });

    await seller.save();

    // Store sellerId in session
    req.session.sellerId = sellerId;
    await req.session.save();

    res.status(201).json({ 
      message: 'Seller registered successfully',
      sellerId 
    });

  } catch (err) {
    res.status(500).json({ 
      error: 'Error registering seller',
      message: err.message
    });
  }
});

// Send OTP Route
app.post('/seller/send-otp', async (req, res) => {
  try {
    const { emailId } = req.body;

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in MongoDB for this seller
    await Seller.findOneAndUpdate(
      { email: emailId },
      { otp: otp }
    );

    // Send OTP email
    const mailOptions = {
      from: '"Mera Bestie Support" <pecommerce8@gmail.com>',
      to: emailId,
      subject: 'Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Mera Bestie Seller Verification</h2>
          <p>Your verification OTP is: <strong>${otp}</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP sent successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Error sending OTP' });
  }
});

// Verify OTP Route
app.post('/seller/verify-otp', async (req, res) => {
  try {
    const { otp, emailId } = req.body;

    if (!otp || !emailId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          otp: !otp ? 'OTP is required' : null,
          emailId: !emailId ? 'Email ID is required' : null
        }
      });
    }

    // Get seller and check OTP
    const seller = await Seller.findOne({ email: emailId });
    
    if (!seller) {
      return res.status(400).json({ 
        error: 'Seller not found',
        details: `No seller found with email: ${emailId}`
      });
    }

    if (!seller.otp) {
      return res.status(400).json({
        error: 'No OTP found',
        details: 'OTP was not generated or has expired'
      });
    }

    if (seller.otp !== otp) {
      return res.status(400).json({
        error: 'Invalid OTP',
        details: 'The provided OTP does not match'
      });
    }

    // Update verification status and clear OTP
    try {
      await Seller.findOneAndUpdate(
        { email: emailId },
        { 
          emailVerified: true,
          phoneVerified: true,
          otp: null
        }
      );
    } catch (updateError) {
      return res.status(500).json({
        error: 'Database update failed',
        details: updateError.message
      });
    }

    res.status(200).json({ message: 'OTP verified successfully' });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error verifying OTP',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login Route
app.post('/seller/login', async (req, res) => {
  try {
    const { sellerId, emailOrPhone, password } = req.body;

    // Validate required fields
    if (!sellerId || !emailOrPhone || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Seller ID, email/phone and password are required'
      });
    }

    // Find seller by ID and email/phone
    const seller = await Seller.findOne({
      sellerId,
      $or: [
        { email: emailOrPhone },
        { phoneNumber: emailOrPhone }
      ]
    });

    if (!seller) {
      return res.status(400).json({ 
        error: 'Invalid credentials',
        details: 'No seller found with provided ID and email/phone'
      });
    }

    // Check if email/phone is verified
    if (!seller.emailVerified && !seller.phoneVerified) {
      return res.status(401).json({
        error: 'Account not verified',
        details: 'Please verify your email or phone number before logging in'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(400).json({ 
        error: 'Invalid credentials',
        details: 'Incorrect password provided'
      });
    }

    // Store sellerId in session
    req.session.sellerId = sellerId;

    res.status(200).json({ 
      success: true,
      message: 'Login successful',
      sellerId,
      businessName: seller.businessName
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error logging in',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Logout Route
app.post('/seller/logout', async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({
        error: 'Seller ID is required'
      });
    }

    const seller = await Seller.findOne({ sellerId });
    
    if (!seller) {
      return res.status(404).json({
        error: 'Seller not found'
      });
    }

    seller.loggedIn = 'loggedout';
    await seller.save();

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging out' });
      }
      res.clearCookie('connect.sid');
      res.json({ 
        success: true,
        message: 'Seller logged out successfully',
        loggedIn: 'loggedout'
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error logging out',
      details: error.message
    });
  }
});
// Coupon Schema
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  discountPercentage: {
    type: Number,
    required: true
  }
});

const Coupon = mongoose.model('Coupon', couponSchema);

// Function to send email to all users
async function sendEmailToAllUsers(subject, message) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'pecommerce8@gmail.com', // Replace with your email
        pass: 'rqrdabxuzpaecigz' // Replace with your password
      }
    });

    const users = await mongoose.model('User').find({}, 'email');
    
    for (const user of users) {
      await transporter.sendMail({
        from: 'pecommerce8@gmail.com',
        to: user.email,
        subject: subject,
        text: message
      });
    }
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}

// Get all coupons route
app.get('/coupon', async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({
      success: true,
      coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching coupons',
      error: error.message
    });
  }
});

// Save coupon route
app.post('/save-coupon', async (req, res) => {
  try {
    const { code, discountPercentage } = req.body;

    const coupon = new Coupon({
      code,
      discountPercentage
    });

    await coupon.save();

    // Send email to all users about new coupon
    const subject = 'New Coupon Available!';
    const message = `A new coupon ${code} is now available with ${discountPercentage}% discount. Use it in your next purchase!`;
    await sendEmailToAllUsers(subject, message);

    res.status(201).json({
      success: true,
      message: 'Coupon saved successfully',
      coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving coupon',
      error: error.message
    });
  }
});

// Verify coupon route
app.post('/verify-coupon', async (req, res) => {
  try {
    const { code } = req.body;
    
    const coupon = await Coupon.findOne({ code });
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    res.status(200).json({
      success: true,
      discountPercentage: coupon.discountPercentage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying coupon',
      error: error.message
    });
  }
});

// Delete coupon route
app.delete('/delete-coupon', async (req, res) => {
  try {
    const { code, discountPercentage } = req.body;
    
    const deletedCoupon = await Coupon.findOneAndDelete({ 
      code,
      discountPercentage 
    });

    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Send email to all users about expired coupon
    const subject = 'Coupon Expired';
    const message = `The coupon ${code} with ${discountPercentage}% discount has expired.`;
    await sendEmailToAllUsers(subject, message);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting coupon',
      error: error.message
    });
  }
});

// Verify Seller ID Route
app.post('/verify-seller', async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: 'Seller ID is required'
      });
    }

    // Find seller by sellerId
    const seller = await Seller.findOne({ sellerId });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Invalid seller ID'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Valid seller ID',
      loggedIn: seller.loggedIn
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying seller ID',
      error: error.message
    });
  }
});
// Find My Order Route
app.post('/find-my-order', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find orders for this user
    const orders = await Order.find({ userId });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this user'
      });
    }

    // Function to get product details for each productId
    const findProductDetails = async (productIds) => {
      try {
        const productDetails = [];
        
        // Make API calls for each productId
        for (const productId of productIds) {
          try {
            const product = await Product.findById(productId);
            if (product) {
              productDetails.push(product);
            }
          } catch (err) {
            console.error(`Error fetching product ${productId}:`, err);
          }
        }

        return productDetails;
      } catch (error) {
        throw new Error('Error fetching product details: ' + error.message);
      }
    };

    // Get product details for each order
    const ordersWithProducts = await Promise.all(
      orders.map(async (order) => {
        const productDetails = await findProductDetails(order.productIds);
        return {
          ...order.toObject(),
          products: productDetails
        };
      })
    );

    res.status(200).json({
      success: true,
      orders: ordersWithProducts
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding orders',
      error: error.message
    });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
