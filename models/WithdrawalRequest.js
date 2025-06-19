const mongoose = require('mongoose');

const WithdrawalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletType: { type: String, enum: ['TRC20', 'BEP20'], required: true },
  address: { type: String, required: true },
  amount: { type: Number, required: true },
  password: { type: String, required: true }, // You should hash this in production
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);
