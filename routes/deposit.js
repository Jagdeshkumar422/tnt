const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const BonusHistory = require('../models/BonusHistory');
const updateUserLevel = require("../utils/updateUserLevel");

// STEP 1: Create Deposit
router.post('/create-deposit', async (req, res) => {
  try {
    const { amount, currency, userId } = req.body;

    const paymentData = {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: `https://api.treasurenftx.xyz/api/deposit/ipn`,
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
    console.error('Create Deposit Error:', err?.response?.data || err.message || err);
    res.status(500).json({ success: false, message: 'Deposit failed.' });
  }
});

// STEP 2: Handle NowPayments IPN
router.post('/ipn', async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString()); // Because we used express.raw()
    console.log("IPN Received:", body);

    const { payment_id, payment_status, price_amount } = body;

    const deposit = await Deposit.findOne({ paymentId: payment_id });
    if (!deposit) return res.status(404).send("Deposit not found");

    if (deposit.status === 'finished') return res.status(200).end(); // Already processed

    if (payment_status === 'finished') {
      deposit.status = 'finished';

      const user = await User.findById(deposit.userId);
      if (!user) return res.status(404).send("User not found");

      const amount = parseFloat(price_amount);
      user.balance += amount;

      // Direct Referral Bonus (10%)
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const bonus = amount * 0.10;
          referrer.balance += bonus;
          referrer.teamDeposits = (referrer.teamDeposits || 0) + amount;
          await referrer.save();

          await BonusHistory.create({
            userId: referrer._id,
            sourceUserId: user._id,
            amount: bonus,
            type: 'referral',
            level: 1,
          });
        }
      }

      // Team Commission (Level A, B, C)
      const levelA = user.referredBy && await User.findById(user.referredBy);
      const levelB = levelA?.referredBy && await User.findById(levelA.referredBy);
      const levelC = levelB?.referredBy && await User.findById(levelB.referredBy);

      if (levelA) {
        const bonusA = amount * 0.15;
        levelA.balance += bonusA;
        levelA.teamDeposits = (levelA.teamDeposits || 0) + amount;
        await levelA.save();
        await BonusHistory.create({
          userId: levelA._id,
          sourceUserId: user._id,
          amount: bonusA,
          type: 'team',
          level: 2,
        });
      }

      if (levelB) {
        const bonusB = amount * 0.10;
        levelB.balance += bonusB;
        levelB.teamDeposits = (levelB.teamDeposits || 0) + amount;
        await levelB.save();
        await BonusHistory.create({
          userId: levelB._id,
          sourceUserId: user._id,
          amount: bonusB,
          type: 'team',
          level: 3,
        });
      }

      if (levelC) {
        const bonusC = amount * 0.05;
        levelC.balance += bonusC;
        levelC.teamDeposits = (levelC.teamDeposits || 0) + amount;
        await levelC.save();
        await BonusHistory.create({
          userId: levelC._id,
          sourceUserId: user._id,
          amount: bonusC,
          type: 'team',
          level: 4,
        });
      }

      await user.save();
      await updateUserLevel(user.referredBy);
      await updateUserLevel(levelA?.referredBy);
      await updateUserLevel(levelB?.referredBy);
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

// Get all deposits
router.get("/getdeposit", async (req, res) => {
  try {
    const deposits = await Deposit.find().populate("userId", "name email userId");
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
