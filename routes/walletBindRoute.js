const express = require('express');
const router = express.Router();
const WalletBinding = require('../models/WalletBind');
const nodemailer = require('nodemailer');
const addressOtpStore = {};
const User = require("../models/User")

router.post('/user/send-address-code', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 90 * 1000;

  // Save to in-memory store
  addressOtpStore[email] = { code, expiresAt };

 const transporter = nodemailer.createTransport({
     host: 'smtp.hostinger.com',
     port: 465,
     secure: true,
     auth: {
       user: 'contact@mmt3x.xyz',
       pass: 'Mmt3x@15432',
     },
   });

  await transporter.sendMail({
    from: '"Mmt3x" <contact@mmt3x.xyz>',
    to: email,
    subject: 'Change Address Verification Code',
    text: `Your code is: ${code}`,
  });

  res.json({ message: 'Verification code sent to email.' });
});
// POST: Create or Update Wallet Binding
router.post('/user/bind-wallet', async (req, res) => {
  const { userId, bep20Address } = req.body;

  if (!userId || !bep20Address)
    return res.status(400).json({ message: 'All fields are required' });

  const user = await User.findOne({ _id: userId });
  if (!user) return res.status(404).json({ message: 'User not found' });



  // Proceed to update address
  let binding = await WalletBinding.findOne({ userId });

  if (binding) {
    binding.bep20Address = bep20Address;
    await binding.save();
    return res.json({ message: 'Address updated', binding });
  } else {
    const newBind = await WalletBinding.create({
      userId,
      bep20Address,
      trc20Address: '',
    });
    return res.status(201).json({ message: 'Address bound', binding: newBind });
  }
});



// GET: Retrieve Wallet Binding by User ID
router.get('/user/wallet/:userId', async (req, res) => {
  try {
    const binding = await WalletBinding.findOne({ userId: req.params.userId });

    if (!binding) {
      return res.status(404).json({ message: 'No wallet bound for this user.' });
    }

    res.status(200).json({ binding });
  } catch (err) {
    console.error('Error fetching wallet:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
