const express = require('express');
const router = express.Router();
const WalletBind = require('../models/WalletBind');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const User = require('../models/User'); 
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

router.get("/getwithdraw",async (req, res) => {
  try {
    const withdrawals = await WithdrawalRequest.find().populate("user", "name email userId");
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
})

// Update withdrawal status (accept/reject)
// Update withdrawal status (accept/reject)
router.patch('/user/withdraw/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal request not found' });

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Withdrawal already processed' });
    }

    if (status === 'accepted') {
      const user = await User.findById(withdrawal.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.balance < withdrawal.amount) {
        return res.status(400).json({ message: 'Insufficient balance in user account' });
      }

      user.balance -= withdrawal.amount;
      await user.save();
    }

    withdrawal.status = status;
    await withdrawal.save();

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



module.exports = router;
