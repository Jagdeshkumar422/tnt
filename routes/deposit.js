const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');

// Create Deposit Route
router.post('/deposit/create-deposit', async (req, res) => {
  try {
    const { currency, userId } = req.body;

    if (!currency || !userId) {
      return res.status(400).json({ success: false, message: 'Missing currency or userId' });
    }

    const supportedCurrencies = ['usdttrc20', 'usdtbsc', 'bnbbsc', 'busdbsc'];
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({ success: false, message: `Currency ${currency} is not supported` });
    }

    const existingDeposit = await Deposit.findOne({ userId, currency, status: 'waiting' });
    if (existingDeposit) {
      return res.json({
        success: true,
        address: existingDeposit.payAddress,
        paymentId: existingDeposit.paymentId,
        invoice_url: existingDeposit.invoice_url,
        message: 'Existing deposit address reused',
      });
    }

    const paymentData = {
      price_amount: 1,
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: 'https://api.treasurenftx.xyz/api/deposit/ipn',
      order_id: `order-${Date.now()}-${userId}`,
      order_description: 'User deposit for Mmt3x',
    };

    const payment = await createPayment(paymentData);

    const newDeposit = await Deposit.create({
      userId,
      amount: 0,
      currency,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      invoice_url: payment.invoice_url,
      status: 'waiting',
    });

    return res.json({
      success: true,
      address: payment.pay_address,
      paymentId: payment.payment_id,
      invoice_url: payment.invoice_url,
    });

  } catch (err) {
    console.error('❌ Deposit creation error:', err?.response?.data || err.message || err);
    return res.status(500).json({
      success: false,
      message: 'Deposit failed',
      error: err?.response?.data || err.message || 'Unknown server error',
    });
  }
});

// ✅ IPN Handler with Bonus Distribution
router.post('/deposit/ipn', async (req, res) => {
  try {
    console.log('📩 Received IPN:', req.body);
    const { payment_id, payment_status, price_amount } = req.body;

    const deposit = await Deposit.findOne({ paymentId: payment_id });
    if (!deposit) return res.status(404).send("Deposit not found");
    if (deposit.status === 'finished') return res.status(200).send("Already processed");

    // ✅ Always update the received status
    deposit.status = payment_status;

    const finalStatuses = ['finished', 'confirmed', 'sending'];
    if (finalStatuses.includes(payment_status)) {
      deposit.amount = price_amount;

      const user = await User.findById(deposit.userId).populate('uplineA uplineB uplineC');
      if (!user) return res.status(404).send("User not found");

      const depositAmount = parseFloat(price_amount);
      user.balance = (user.balance || 0) + depositAmount;

      // ✅ First deposit bonus (check for other "finished" deposits)
      const finishedDeposits = await Deposit.find({
        userId: user._id,
        status: { $in: finalStatuses },
        _id: { $ne: deposit._id }
      });

      if (finishedDeposits.length === 0) {
        const selfBonus = depositAmount * 0.10;
        user.balance += selfBonus;
        user.bonusHistory.push({
          sourceUser: user._id,
          level: 'direct',
          amount: selfBonus,
        });
      }

      // ✅ Upline A (15%)
      if (user.uplineA) {
        const bonusA = depositAmount * 0.15;
        user.uplineA.balance = (user.uplineA.balance || 0) + bonusA;
        user.uplineA.bonusHistory.push({
          sourceUser: user._id,
          level: 'A',
          amount: bonusA,
        });
        await user.uplineA.save();
      }

      // ✅ Upline B (10%)
      if (user.uplineB) {
        const bonusB = depositAmount * 0.10;
        user.uplineB.balance = (user.uplineB.balance || 0) + bonusB;
        user.uplineB.bonusHistory.push({
          sourceUser: user._id,
          level: 'B',
          amount: bonusB,
        });
        await user.uplineB.save();
      }

      // ✅ Upline C (5%)
      if (user.uplineC) {
        const bonusC = depositAmount * 0.05;
        user.uplineC.balance = (user.uplineC.balance || 0) + bonusC;
        user.uplineC.bonusHistory.push({
          sourceUser: user._id,
          level: 'C',
          amount: bonusC,
        });
        await user.uplineC.save();
      }

      await user.save();
    }

    await deposit.save();
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ IPN error:', err);
    res.status(500).send('IPN handling failed');
  }
});

// Admin: Get all deposits
router.get("/getdeposit", async (req, res) => {
  try {
    const deposits = await Deposit.find().populate("userId", "name email userId");
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
