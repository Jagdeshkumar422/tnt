// models/WalletBinding.js
const mongoose = require('mongoose');

const walletBindingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Ensure one record per user
  },
  trc20Address: {
    type: String,
  },
  bep20Address: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WalletBinding', walletBindingSchema);
