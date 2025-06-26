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
// ✅ IPN Handler with Bonus Distribution
router.post('/deposit/ipn', async (req, res) => {
  try {
    console.log('📩 Received IPN:', JSON.stringify(req.body, null, 2)); // Log full IPN payload for debugging
    const { payment_id, payment_status, price_amount } = req.body;

    if (!payment_id || !payment_status) {
      console.error('❌ Missing payment_id or payment_status in IPN payload');
      return res.status(400).send('Missing payment_id or payment_status');
    }

    console.log(`🔍 Looking for payment_id: "${payment_id}" (type: ${typeof payment_id})`);
    const deposit = await Deposit.findOne({ paymentId: String(payment_id).trim() });

    if (!deposit) {
      console.error(`❌ No deposit found for payment_id: "${payment_id}"`);
      return res.status(404).send('Deposit not found');
    }

    console.log(`✅ Deposit found: ${JSON.stringify(deposit, null, 2)}`);
    if (deposit.status === 'finished') {
      console.log('ℹ️ Deposit already processed, skipping');
      return res.status(200).send('Already processed');
    }

    // ✅ Update the deposit status
    deposit.status = payment_status;
    deposit.updatedAt = new Date(); // Track when the status was updated

    console.log(`🔄 Updating deposit status to: ${payment_status}`);

    const finalStatuses = ['finished', 'confirmed', 'sending'];
    if (finalStatuses.includes(payment_status)) {
      deposit.amount = parseFloat(price_amount) || 0; // Ensure amount is a number
      console.log(`💰 Deposit amount set to: ${deposit.amount}`);

      const user = await User.findById(deposit.userId).populate('uplineA uplineB uplineC');
      if (!user) {
        console.error(`❌ User not found for userId: ${deposit.userId}`);
        return res.status(404).send('User not found');
      }

      console.log(`👤 User found: ${user._id}, balance: ${user.balance}`);

      const depositAmount = parseFloat(price_amount);
      user.balance = (user.balance || 0) + depositAmount;

      // ✅ First deposit bonus (check for other "finished" deposits)
      const finishedDeposits = await Deposit.find({
        userId: user._id,
        status: { $in: finalStatuses },
        _id: { $ne: deposit._id },
      });

      if (finishedDeposits.length === 0) {
        const selfBonus = depositAmount * 0.10;
        user.balance += selfBonus;
        user.bonusHistory.push({
          sourceUser: user._id,
          level: 'direct',
          amount: selfBonus,
          createdAt: new Date(),
        });
        console.log(`🎁 Applied first deposit bonus: ${selfBonus}`);
      }

      // ✅ Upline A (15%)
      if (user.uplineA) {
        const bonusA = depositAmount * 0.15;
        user.uplineA.balance = (user.uplineA.balance || 0) + bonusA;
        user.uplineA.bonusHistory.push({
          sourceUser: user._id,
          level: 'A',
          amount: bonusA,
          createdAt: new Date(),
        });
        await user.uplineA.save();
        console.log(`🎁 Applied upline A bonus: ${bonusA} to user ${user.uplineA._id}`);
      }

      // ✅ Upline B (10%)
      if (user.uplineB) {
        const bonusB = depositAmount * 0.10;
        user.uplineB.balance = (user.uplineB.balance || 0) + bonusB;
        user.uplineB.bonusHistory.push({
          sourceUser: user._id,
          level: 'B',
          amount: bonusB,
          createdAt: new Date(),
        });
        await user.uplineB.save();
        console.log(`🎁 Applied upline B bonus: to user ${user.uplineB._id}`);
      }

      // ✅ Upline C (5%)
      if (user.uplineC) {
        const bonusC = depositAmount * 0.05;
        user.uplineC.balance = (user.uplineC.balance || 0) + bonusC;
        user.uplineC.bonusHistory.push({
          sourceUser: user._id,
          level: 'C',
          amount: bonusC,
          createdAt: new Date(),
        });
        await user.uplineC.save();
        console.log(`🎁 Applied upline C bonus: ${bonusC} to user ${user.uplineC._id}`);
      }

      await user.save();
      console.log(`✅ User balance updated: ${user.balance}`);
    }

    await deposit.save();
    console.log(`✅ Deposit saved with status: ${deposit.status}`);
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ IPN error:', err.message, err.stack);
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
