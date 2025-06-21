const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  phone: String,
  countryCode: String,
  name: String,
  userId: String,
  email: String,
  loginPassword: String,
  transactionPassword: String,

  profilePic: {
  type: String, // store image URL or path
  default: "https://res.cloudinary.com/di0qbhv97/image/upload/v1750513672/tpxvny1fbdv61_1_tamxgh.png"   // optional default placeholder
},
  referralCode: String, // This user's code to refer others
  referredBy: { type: Schema.Types.ObjectId, ref: 'User' },

  referrals: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  uplineA: { type: Schema.Types.ObjectId, ref: 'User' },
  uplineB: { type: Schema.Types.ObjectId, ref: 'User' },
  uplineC: { type: Schema.Types.ObjectId, ref: 'User' },

  telegram: String,
  whatsapp: String,

  teamDeposits: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },

  trc20Address: String,
  bep20Address: String,

  bonusHistory: [
    {
      sourceUser: { type: Schema.Types.ObjectId, ref: 'User' },
      level: { type: String, enum: ['direct', 'A', 'B', 'C'] },
      amount: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // ✅ Blocked User Fields
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String, default: "" },
  blockedAt: { type: Date },
});

module.exports = mongoose.model("User", userSchema);
