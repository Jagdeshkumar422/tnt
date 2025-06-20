// models/Explore.js
const mongoose = require("mongoose");

const StakeArea = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  stake: {
    type: String,
    required: true
  },
  minAmount: {
    type: String,
    required: true
  },
  maxAmount: {
    type: String,
    required: true
  },
  income: {
    type: String,
    required: true
  },
  fee: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model("StakeArea", StakeArea);
