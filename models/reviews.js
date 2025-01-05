const mongoose = require('mongoose');

// Define the Review schema
const reviewSchema = new mongoose.Schema({
    productId: {
        type: Number,
        required: true,
        ref: 'Product' // Optional: Reference to a Product collection if it exists
    },
    review: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 0,
        max: 5
    }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;