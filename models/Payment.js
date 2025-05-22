// models/Payment.js
const mongoose = require('mongoose');
const PaymentSchema = new mongoose.Schema({
  userId: String,
  paymentId: String,
  address: String,
  amount: Number,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
