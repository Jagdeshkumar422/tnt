const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: String,
  address: String,
  amount: Number,
  currency: String,
  txId: String,
  network: String,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('Deposit', depositSchema);
