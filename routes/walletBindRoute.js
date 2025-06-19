const express = require('express');
const router = express.Router();
const WalletBinding = require('../models/WalletBind');

// POST: Create or Update Wallet Binding
router.post('/user/bind-wallet', async (req, res) => {
  const { userId, trc20Address, bep20Address } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  if (!trc20Address && !bep20Address) {
    return res.status(400).json({ message: 'At least one wallet address (TRC20 or BEP20) must be provided' });
  }

  try {
    let binding = await WalletBinding.findOne({ userId });

    if (binding) {
      // Update only the field(s) that were sent
      if (trc20Address) binding.trc20Address = trc20Address;
      if (bep20Address) binding.bep20Address = bep20Address;

      await binding.save();
      return res.status(200).json({ message: 'Wallet updated successfully', binding });
    } else {
      // Create new record with whichever field is present
      const newBind = await WalletBinding.create({
        userId,
        trc20Address: trc20Address || '',
        bep20Address: bep20Address || '',
      });

      return res.status(201).json({ message: 'Wallet bound successfully', binding: newBind });
    }
  } catch (err) {
    console.error('Error binding wallet:', err);
    return res.status(500).json({ message: 'Server error' });
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
