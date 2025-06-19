// models/BonusHistory.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const bonusHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' }, // who received the bonus
  sourceUserId: { type: Schema.Types.ObjectId, ref: 'User' }, // who triggered the bonus
  amount: Number,
  type: { type: String, enum: ['referral', 'team','reservation'], required: true }, // type of bonus
  level: Number, // optional: level 1 to 6 if it's a team bonus
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BonusHistory', bonusHistorySchema);
