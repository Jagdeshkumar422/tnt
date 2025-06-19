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

  referralCode: String, // This user's code to refer others
  referredBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Who referred me

  referrals: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users I referred (direct)

  // Uplines (for A, B, C)
  uplineA: { type: Schema.Types.ObjectId, ref: 'User' }, // Level A - direct
  uplineB: { type: Schema.Types.ObjectId, ref: 'User' }, // Level B
  uplineC: { type: Schema.Types.ObjectId, ref: 'User' }, // Level C
  telegram: String,
  whatsapp: String,
  teamDeposits: { type: Number, default: 0 }, // Sum of all team deposits
  level: { type: Number, default: 0 }, // Level 1 to 6
  balance: { type: Number, default: 0 },

  trc20Address: String,
  bep20Address: String,

  // Store bonus history for reports
  bonusHistory: [
    {
      sourceUser: { type: Schema.Types.ObjectId, ref: 'User' }, // Who triggered this bonus
      level: { type: String, enum: ['direct', 'A', 'B', 'C'] }, // Referral level
      amount: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("User", userSchema);
