const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  telegramChannel: { type: String, required: true },
  telegramHelpLine: { type: String, required: true }
});

module.exports = mongoose.model('Settings', settingsSchema);
