// complaintModel.js
const mongoose = require('mongoose');

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

module.exports = Complaint;
