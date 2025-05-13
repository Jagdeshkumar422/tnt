const express = require('express');
const router = express.Router();
const { getDepositHistory } = require('../config/binance');
const Deposit = require('../models/Deposit');

router.get('/check-deposits', async (req, res) => {
  try {
    const deposits = await getDepositHistory();
    const confirmed = deposits.filter(d => d.status === 1); // status 1 = successful

    for (const d of confirmed) {
      const exists = await Deposit.findOne({ txId: d.txId });
      if (!exists) {
        await Deposit.create({
          userId: "user123", // later map this properly
          address: d.address,
          amount: d.amount,
          currency: d.coin,
          txId: d.txId,
          network: d.network,
          status: "confirmed",
        });
      }
    }

    res.json({ message: "Deposits synced successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error syncing deposits");
  }
});

router.get('/user-balance/:userId', async (req, res) => {
  const deposits = await Deposit.find({ userId: req.params.userId, status: "confirmed" });
  const total = deposits.reduce((sum, d) => sum + d.amount, 0);
  res.json({ balance: total });
});

module.exports = router;
