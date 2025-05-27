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
    settings = new Settings({});
  }

  // Update only the fields that are provided
  if (telegramChannel !== undefined) {
    settings.telegramChannel = telegramChannel;
  }

  if (telegramHelpLine !== undefined) {
    settings.telegramHelpLine = telegramHelpLine;
  }

  await settings.save();
  res.json({ message: 'Settings updated successfully' });
});


module.exports = router;
