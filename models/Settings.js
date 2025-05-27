const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  telegramChannel: { type: String},
  telegramHelpLine: { type: String }
});

module.exports = mongoose.model('Settings', settingsSchema);
