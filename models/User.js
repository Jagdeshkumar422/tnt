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

userSchema.pre('save', async function (next) {
  if (!this.isModified('balance')) return next(); // only if balance is updated

  const balance = this.balance || 0;
  const refCount = this.referrals?.length || 0;

  if (balance >= 10001 && refCount >= 100) this.level = 7;
  else if (balance >= 8001 && refCount >= 100) this.level = 6;
  else if (balance >= 5001 && refCount >= 70) this.level = 5;
  else if (balance >= 3001 && refCount >= 40) this.level = 4;
  else if (balance >= 1001 && refCount >= 20) this.level = 3;
  else if (balance >= 301 && refCount >= 5) this.level = 2;
  else if (balance >= 47) this.level = 1;
  else this.level = 0;

  next();
});

module.exports = mongoose.model("User", userSchema);
