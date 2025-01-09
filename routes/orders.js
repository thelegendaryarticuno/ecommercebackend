const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Orders = require('../models/orderModel'); // Replace with the correct path
const User = require('../models/user'); // Replace with correct path

require('dotenv').config();

// Razorpay setup
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

// Shiprocket setup
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

// Authenticate with Shiprocket and return a token
const authenticateShiprocket = async () => {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
    });
    return response.data.token;
};

// 1. Create Razorpay Order (For Prepaid Orders)
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency, userId } = req.body;

        const razorpayOrder = await razorpay.orders.create({
            amount: amount, 
            currency: currency || 'INR',
            notes: { user: userId }
        });

        res.status(200).json({ success: true, order: razorpayOrder });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// 2. Verify Razorpay Payment
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// 3. Place Order
router.post('/place-order', async (req, res) => {
    try {
        const {
            userId,
            address, // Full address string
            price,
            productsOrdered,
            status = "Processing", // Default status
            paymentStatus = "Paid" // Default payment status
        } = req.body;

        // Default payment method
        const paymentMethod = "Prepaid";

        // Check if userId is provided
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        // Fetch user details from User schema
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Parse the full address string into individual components
        const [street, city, state, pincode, phone] = address.split(',').map(item => item.trim());
        const shippingAddress = {
            street,
            city,
            state,
            country: "India", // Assuming default country as India
            postalCode: pincode
        };

        // Generate unique internal orderId
        const orderId = `ORDER-${Date.now()}`;

        // Save order in MongoDB
        const order = new Orders({
            orderId,
            userId,
            customerName: user.name,
            customerPhone: phone || user.phone,
            customerEmail: user.email,
            shippingAddress,
            products: productsOrdered.map(item => ({
                productId: item.productId,
                quantity: item.productQty
            })),
            totalAmount: price,
            paymentMethod,
            razorpayDetails: null, // Since payment method is default Prepaid
            status,
            paymentStatus
        });

        const savedOrder = await order.save();

        // If COD (for future functionality), create Shiprocket order immediately
        if (paymentMethod === "COD") {
            const token = await authenticateShiprocket();

            const shiprocketPayload = {
                order_id: savedOrder.orderId,
                order_date: new Date().toISOString(),
                pickup_location: "Default Pickup",
                billing_customer_name: user.name,
                billing_address: shippingAddress.street,
                billing_city: shippingAddress.city,
                billing_pincode: shippingAddress.postalCode,
                billing_state: shippingAddress.state,
                billing_country: shippingAddress.country,
                billing_email: user.email,
                billing_phone: shippingAddress.phone || user.phone,
                shipping_is_billing: true,
                order_items: productsOrdered.map(item => ({
                    name: item.name || "Product", // Replace with product name if available
                    sku: item.productId,
                    units: item.productQty,
                    selling_price: price // Replace with actual price per product if available
                })),
                payment_method: "COD",
                sub_total: price
            };

            const shiprocketResponse = await axios.post(
                'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
                shiprocketPayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update Shiprocket details in order
            savedOrder.shiprocketDetails = {
                orderId: shiprocketResponse.data.order_id,
                trackingId: shiprocketResponse.data.awb_code,
                status: "Processing"
            };
            await savedOrder.save();
        }

        res.status(201).json({ success: true, message: 'Order placed successfully', order: savedOrder });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, error: 'Failed to place order', details: error.message });
    }
});


// 4. Cancel Order
router.post('/cancel-order', async (req, res) => {
    try {
        const { orderId } = req.body;

        // Find the order in MongoDB
        const order = await Orders.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // If the order has Shiprocket details, cancel the order in Shiprocket
        if (order.shiprocketDetails && order.shiprocketDetails.orderId) {
            const token = await authenticateShiprocket();

            const shiprocketOrderId = order.shiprocketDetails.orderId;

            await axios.post(
                `https://apiv2.shiprocket.in/v1/external/orders/cancel`,
                { ids: [shiprocketOrderId] },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update order status in MongoDB
            order.status = "Cancelled";
            order.shiprocketDetails.status = "Cancelled";
            await order.save();
        } else {
            // If no Shiprocket details, just update the status in MongoDB
            order.status = "Cancelled";
            await order.save();
        }

        res.status(200).json({ success: true, message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
    }
});

module.exports = router;
