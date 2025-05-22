const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: String,
  paymentId: String,
  amount: Number,
  currency: String,
  address: String,
  status: String,
  timestamp: Date,
});

module.exports = mongoose.model('Deposit', depositSchema);