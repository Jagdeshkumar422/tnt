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

teamA: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Direct invites
teamB: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Team A’s invites
teamC: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Team B’s invites
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
