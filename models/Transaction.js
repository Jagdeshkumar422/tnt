// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txHash: { type: String, unique: true },
  from: String,
  to: String,
  amount: String,
  status: { type: String, default: 'confirmed' }, // or pending/failed
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: Date
});

module.exports = mongoose.model('Transaction', transactionSchema);
