const express = require('express');
const router = express.Router();
const WalletBind = require('../models/WalletBind');
const WithdrawalRequest = require('../models/WithdrawalRequest');

// Get wallet info
router.get('/user/wallet/:userId', async (req, res) => {
  const wallet = await WalletBind.findOne({ userId: req.params.userId });
  if (!wallet) return res.status(404).json({ message: 'Wallet not bound' });
  res.json({ wallet });
});

// Post withdrawal request
router.post('/user/withdraw', async (req, res) => {
  const { userId, amount, password, type } = req.body;

  const wallet = await WalletBind.findOne({ userId });
  if (!wallet) return res.status(400).json({ message: 'Please bind your wallet first.' });

  const address = type === 'TRC20' ? wallet.trc20Address : wallet.bep20Address;
  if (!address) return res.status(400).json({ message: `Please bind your ${type} address first.` });

  const withdrawal = await WithdrawalRequest.create({
    userId,
    walletType: type,
    address,
    amount,
    password, // In production, hash it!
  });

  res.status(201).json({ message: 'Withdrawal request submitted', withdrawal });
});

module.exports = router;
