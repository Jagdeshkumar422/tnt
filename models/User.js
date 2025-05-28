const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const depositSchema = new mongoose.Schema({
  txHash: { type: String, required: true },
  amount: { type: Number, required: true },
  network: { type: String, enum: ['BEP20', 'TRC20'], required: true },
  confirmed: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  userId: {
  type: String,
  required: true,
  unique: true
},

profilePic: {
  type: String, // store image URL or path
  default: "https://res.cloudinary.com/di0qbhv97/image/upload/v1748410875/WhatsApp_Image_2025-05-27_at_19.28.18_cdcc6b41_yosb9z.jpg"   // optional default placeholder
},
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  phone: {
    type: String,
    required: false,
  },
  countryCode: {
    type: String,
    required: false,
  },
   invitation: {
    type: String,
    required: true,
  },
  nationality: String,
  // Unique invitation code generated for this user
  invitationCode: {
    type: String,
    required: true,
    unique: true,
  },
  birthday: String,

  invitedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],

  // ✅ New fields for deposit tracking
  walletAddressBEP20: { type: String, required: false },  // Binance Smart Chain wallet
  walletAddressTRC20: { type: String, required: false }, 
  address: String,
  balance: {
    type: Number,
    default: 0
  },
  deposits: [depositSchema],
  privateKey: String,
   google2faSecret: String,
  google2faEnabled: { type: Boolean, default: false },
  emailCode: String,
  emailCodeExpires: Date,
  referredBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
},
level: { type: Number, default: 0 },

teamA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Direct invites
teamB: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Team A’s invites
teamC: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Team B’s invites
teamRevenueHistory: [
  {
    amount: { type: Number, required: true },
    level: { type: String, enum: ['A', 'B', 'C']},
    createdAt: { type: Date, default: Date.now }
  }
]


}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
