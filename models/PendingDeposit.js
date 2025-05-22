const mongoose = require('mongoose');

const PendingDepositSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  currency: { type: String, required: true },
  network: { type: String, required: true },
  pay_address: { type: String, required: true },
  invoiceData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now, expires: '24h' }, // Expire after 24 hours
});

module.exports = mongoose.model('PendingDeposit', PendingDepositSchema);