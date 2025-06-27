const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    default: 0, 
    required: true 
  },
  currency: { 
    type: String, 
    required: true 
  },
  paymentId: { 
    type: String, 
    required: true, 
    trim: true 
  },
  payAddress: { 
    type: String, 
    required: true 
  },
  invoice_url: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'refunded', 'expired'], 
    default: 'waiting' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
}, { 
  collection: 'deposits' // Explicitly set collection name
});

// Update `updatedAt` on save
depositSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Deposit', depositSchema);