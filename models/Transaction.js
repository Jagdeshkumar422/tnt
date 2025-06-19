// models/Transaction.js
const mongoose = require('mongoose');
const txSchema = new mongoose.Schema({
  paymentId: String,
  orderId: String,
  payAddress: String,
  payCurrency: String,
  priceAmount: Number,
  status: String,
  amountPaid: Number,
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Transaction', txSchema);
