const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const BonusHistory = require('../models/BonusHistory');
const updateUserLevel = require("../utils/updateUserLevel");

router.post('/deposit/create-deposit', async (req, res) => {
  try {
    const { currency, userId } = req.body;

    // ✅ Step 1: Validate inputs
    if (!currency || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing currency or userId',
      });
    }

    // ✅ Step 2: Validate supported currencies
    const supportedCurrencies = ['bnbusdt', 'usdttrc20']; // add more if needed
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${currency} is not supported`,
      });
    }

    // ✅ Step 3: Build payment payload
    const paymentData = {
      price_amount: 1, // temporary placeholder amount, final amount will be detected via IPN
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: 'https://api.treasurenftx.xyz/api/deposit/ipn',
      order_id: `order-${Date.now()}-${userId}`,
      order_description: 'User deposit for Mmt3x',
    };

    console.log('📤 Sending to NowPayments:', paymentData);

    // ✅ Step 4: Send request to NowPayments
    const payment = await createPayment(paymentData);

    console.log('✅ NowPayments response:', payment);

    // ✅ Step 5: Save deposit with "waiting" status
    await Deposit.create({
      userId,
      amount: 0, // to be updated on IPN
      currency,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      status: 'waiting',
    });

    // ✅ Step 6: Return response
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


// STEP 2: NowPayments IPN Handler
// IPN Callback Handler
router.post('/deposit/ipn', async (req, res) => {
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
