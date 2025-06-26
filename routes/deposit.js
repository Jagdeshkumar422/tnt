const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const BonusHistory = require('../models/BonusHistory');
const updateUserLevel = require("../utils/updateUserLevel");

router.post('/create-deposit', async (req, res) => {
  try {
    const { currency, userId } = req.body;

    if (!currency || !userId) {
      return res.status(400).json({ success: false, message: 'Missing currency or userId' });
    }

    const paymentData = {
      price_amount: 1, // placeholder amount
      price_currency: 'usd',
      pay_currency: currency, // e.g., usdttrc20
      ipn_callback_url: 'https://api.treasurenftx.xyz/api/deposit/ipn',
      order_id: `order-${Date.now()}-${userId}`,
      order_description: 'User deposit for Mmt3x',
    };

    const payment = await createPayment(paymentData);

    await Deposit.create({
      userId,
      amount: 0, // will be updated after confirmation
      currency,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      status: 'waiting',
    });

    res.json({
      success: true,
      address: payment.pay_address,
      paymentId: payment.payment_id,
      invoice_url: payment.invoice_url,
    });
  } catch (err) {
    console.error('Deposit creation error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Deposit failed', error: err.message });
  }
});


// STEP 2: NowPayments IPN Handler
// IPN Callback Handler
router.post('/ipn', async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString('utf8'));
    const { payment_id, payment_status, price_amount } = body;

    const deposit = await Deposit.findOne({ paymentId: payment_id });
    if (!deposit) return res.status(404).send("Deposit not found");

    if (deposit.status === 'finished') return res.status(200).send("Already processed");

    if (payment_status === 'finished') {
      deposit.status = 'finished';
      deposit.amount = price_amount; // ✅ set real amount from NowPayments

      const user = await User.findById(deposit.userId);
      if (!user) return res.status(404).send("User not found");

      user.balance = (user.balance || 0) + parseFloat(price_amount);
      await user.save();

      await updateUserLevel(user.referredBy); // optional
    } else {
      deposit.status = payment_status;
    }

    await deposit.save();
    res.status(200).send('OK');
  } catch (err) {
    console.error('IPN error:', err);
    res.status(500).send('IPN handling failed');
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
