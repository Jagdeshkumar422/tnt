// models/Banner.js
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  order: { type: Number, required: true, unique: true }, // 1 to 4
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Banner', bannerSchema);
