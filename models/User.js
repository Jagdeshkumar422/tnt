const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: String,
  countryCode: String,
  email: String,
  loginPassword: String,
  transactionPassword: String,
  referralCode: String,
});

module.exports = mongoose.model("User", userSchema); // ✅ Correct export
