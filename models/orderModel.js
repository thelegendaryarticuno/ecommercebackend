const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: { type: String, required: true }, // Internal Order ID
    userId: { type: String, required: true }, // User placing the order
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String, required: true },
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        postalCode: { type: String, required: true }
    },
    products: [
        {
            productId: { type: String, required: true },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, // "Prepaid" or "COD"
    paymentStatus: { type: String, default: "Pending" }, // For "Prepaid": "Pending", "Success"
    razorpayDetails: {
        orderId: { type: String },
        paymentId: { type: String },
        signature: { type: String }
    },
    shiprocketDetails: {
        orderId: { type: Number },
        trackingId: { type: String },
        status: { type: String, default: "Pending" } // "Pending", "Shipped", "Delivered", "Cancelled"
    },
    status: { type: String, default: "Processing" }, // "Processing", "Cancelled", etc.
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Orders', OrderSchema);
