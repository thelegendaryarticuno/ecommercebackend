const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    otp: {
        type: String,
        required: true,
    },
    otpExpired: {
        type: Boolean,
        default: false,
    },
    otpExpiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
