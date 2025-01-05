const express = require('express');
const router = express.Router();
const Review = require('../models/reviews'); // Assuming the model.js file is named model.js

// Route to save a review
router.post('/save-review', async (req, res) => {
    try {
        const { productId, review, rating } = req.body;

        // Validate the payload
        if (!productId || !review || rating === undefined) {
            return res.status(400).json({ message: 'All fields are required: productId, review, and rating' });
        }

        // Create and save the review
        const newReview = new Review({
            productId,
            review,
            rating
        });

        await newReview.save();

        res.status(201).json({ message: 'Review saved successfully', review: newReview });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
});

// Route to find reviews for a product
router.post('/find-reviews', async (req, res) => {
    try {
        const { productId } = req.body;

        // Validate the payload
        if (!productId) {
            return res.status(400).json({ message: 'ProductId is required' });
        }

        // Find reviews for the given productId
        const reviews = await Review.find({ productId });

        if (reviews.length === 0) {
            return res.status(404).json({ message: 'No reviews found for this product' });
        }

        res.status(200).json({ reviews });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
});

// Route to delete a specific review
router.post('/delete-reviews', async (req, res) => {
    try {
        const { productId, review } = req.body;

        // Validate the payload
        if (!productId || !review) {
            return res.status(400).json({ message: 'ProductId and review are required' });
        }

        // Find and delete the specific review
        const deletedReview = await Review.findOneAndDelete({ productId, review });

        if (!deletedReview) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.status(200).json({ message: 'Review deleted successfully', review: deletedReview });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
});

router.get('/get-reviews', async (req, res) => {
    try {
        const reviews = await Review.find();
        res.status(200).json({
            success: true,
            reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
});

module.exports = router;
