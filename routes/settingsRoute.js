const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// Get current settings
router.get('/', async (req, res) => {
  const settings = await Settings.findOne();
  res.json(settings);
});

// Update settings
router.post('/update', async (req, res) => {
  const { telegramChannel, telegramHelpLine } = req.body;

  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({ telegramChannel, telegramHelpLine });
  } else {
    settings.telegramChannel = telegramChannel;
    settings.telegramHelpLine = telegramHelpLine;
  }

  await settings.save();
  res.json({ message: 'Settings updated successfully' });
});

module.exports = router;
