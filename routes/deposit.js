const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const updateUserLevel = require("../utils/updateUserLevel")

// STEP 1: Create Deposit
router.post('/create-deposit', async (req, res) => {
  try {
    const { amount, currency, userId } = req.body;

    const paymentData = {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: currency, // e.g. usdttrc20 or usdtbep20
      ipn_callback_url: `/deposit/ipn`,
      order_id: `order-${Date.now()}-${userId}`,
    };

    const payment = await createPayment(paymentData);

    await Deposit.create({
      userId,
      amount,
      currency,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      status: 'waiting',
    });

    res.json({
      success: true,
      payment_url: payment.invoice_url,
      address: payment.pay_address,
      paymentId: payment.payment_id,
    });
  } catch (err) {
    console.error('Create Deposit Error:', err?.response?.data || err);
    res.status(500).json({ success: false, message: 'Deposit failed.' });
  }
});

// STEP 2: Handle NowPayments webhook (IPN)
// routes/deposit.js
const BonusHistory = require('../models/BonusHistory'); // make sure this is imported

router.post('/ipn', async (req, res) => {
  try {
    const { payment_id, payment_status, pay_address, price_amount } = req.body;

    const deposit = await Deposit.findOne({ paymentId: payment_id });
    if (!deposit) return res.status(404).end();

    if (deposit.status === 'finished') return res.status(200).end();

    if (payment_status === 'finished') {
      deposit.status = 'finished';

      // STEP 1: Add balance to depositor
      const user = await User.findById(deposit.userId);
      if (!user) return res.status(404).end();

      user.balance += price_amount;

      // STEP 2: Direct Referral Bonus (10%)
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const bonus = price_amount * 0.10;
          referrer.balance += bonus;
          referrer.teamDeposits = (referrer.teamDeposits || 0) + price_amount;

          await referrer.save();

          // Save Bonus History
          await BonusHistory.create({
            userId: referrer._id,
            sourceUserId: user._id,
            amount: bonus,
            type: 'referral',
            level: 1
          });
        }
      }

      // STEP 3: Team Commission (15% A, 10% B, 5% C)
      const levelA = user.referredBy && await User.findById(user.referredBy);
      const levelB = levelA?.referredBy && await User.findById(levelA.referredBy);
      const levelC = levelB?.referredBy && await User.findById(levelB.referredBy);

      if (levelA) {
        const bonusA = price_amount * 0.15;
        levelA.balance += bonusA;
        levelA.teamDeposits = (levelA.teamDeposits || 0) + price_amount;
        await levelA.save();

        await BonusHistory.create({
          userId: levelA._id,
          sourceUserId: user._id,
          amount: bonusA,
          type: 'team',
          level: 2
        });
      }

      if (levelB) {
        const bonusB = price_amount * 0.10;
        levelB.balance += bonusB;
        levelB.teamDeposits = (levelB.teamDeposits || 0) + price_amount;
        await levelB.save();

        await BonusHistory.create({
          userId: levelB._id,
          sourceUserId: user._id,
          amount: bonusB,
          type: 'team',
          level: 3
        });
      }

      if (levelC) {
        const bonusC = price_amount * 0.05;
        levelC.balance += bonusC;
        levelC.teamDeposits = (levelC.teamDeposits || 0) + price_amount;
        await levelC.save();

        await BonusHistory.create({
          userId: levelC._id,
          sourceUserId: user._id,
          amount: bonusC,
          type: 'team',
          level: 4
        });
      }

      // STEP 4: Update depositor
      await user.save();

      // STEP 5: Optional Level-Up Logic
      await updateUserLevel(user.referredBy);       // A
      await updateUserLevel(levelA?.referredBy);     // B
      await updateUserLevel(levelB?.referredBy);     // C
    } else {
      deposit.status = payment_status;
    }

    await deposit.save();
    res.status(200).end();
  } catch (err) {
    console.error("IPN Error:", err);
    res.status(500).end();
  }
});

router.get("/getdeposit", async (req, res) => {
  try {
    const deposits = await Deposit.find().populate("user", "name email userId");
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
})


module.exports = router;
