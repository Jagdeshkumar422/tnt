const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const BonusHistory = require('../models/BonusHistory');
const updateUserLevel = require("../utils/updateUserLevel");

// STEP 1: Create Payment
router.post('/create-deposit', async (req, res) => {
  try {
    const { amount, currency, userId } = req.body;

    if (!amount || !currency || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, currency, or userId',
      });
    }

    const paymentData = {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: currency, // e.g., usdttrc20
      ipn_callback_url: 'https://api.treasurenftx.xyz/api/deposit/ipn',
      order_id: `order-${Date.now()}-${userId}`,
      order_description: 'User deposit for TreasureNFTX',
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
    console.error('🛑 Deposit Error:', err?.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'Deposit failed.',
      error: err?.response?.data || err.message || err,
    });
  }
});

// STEP 2: NowPayments IPN Handler
router.post('/deposit/ipn', async (req, res) => {
  try {
    const bodyRaw = req.body.toString('utf8');
    const body = JSON.parse(bodyRaw);

    console.log("✅ IPN received:", body);

    const { payment_id, payment_status, price_amount } = body;

    const deposit = await Deposit.findOne({ paymentId: payment_id });
    if (!deposit) return res.status(404).send("Deposit not found");

    if (deposit.status === 'finished') return res.status(200).end(); // Already processed

    if (payment_status === 'finished') {
      deposit.status = 'finished';
      const user = await User.findById(deposit.userId);
      if (!user) return res.status(404).send("User not found");

      const amount = parseFloat(price_amount);
      user.balance = (user.balance || 0) + amount;

      // Optional: Referral/Team bonuses here...

      await user.save();
      await updateUserLevel(user.referredBy);
    } else {
      deposit.status = payment_status;
    }

    await deposit.save();
    res.status(200).send('OK');
  } catch (err) {
    console.error("❌ IPN Handler Error:", err);
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
