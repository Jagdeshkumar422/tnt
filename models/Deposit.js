const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  currency: String,
  paymentId: String,
  payAddress: String,
  status: { type: String, default: 'waiting' }, // waiting, finished, expired, failed
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Deposit', depositSchema);
