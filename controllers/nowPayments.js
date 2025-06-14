const axios = require('axios');
const Deposit = require('../models/Deposit');
const PendingDeposit = require('../models/PendingDeposit');
const User = require('../models/User');
require('dotenv').config();

// Create Invoice and Payment Address
const createNowPaymentInvoice = async (req, res) => {
  const { amount, userId, currency, network } = req.body;

  if (!amount || !userId || !currency || !network) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const currencyLower = currency.toLowerCase();
  const networkLower = network.toLowerCase();

  const currencyNetworkMap = {
    usdt: {
      bep20: 'usdtbsc',
      trc20: 'usdttrc20',
    },
  };

  const payCurrency = currencyNetworkMap[currencyLower]?.[networkLower];
  if (!payCurrency) {
    return res.status(400).json({ error: 'Unsupported currency or network' });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const hasDepositToday = await Deposit.findOne({
      userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    if (hasDepositToday) {
      return res.status(400).json({ error: 'You can only deposit once per day' });
    }

    const existingPending = await PendingDeposit.findOne({
      userId,
      currency: currencyLower,
      network: networkLower,
    });

    if (existingPending) {
      return res.status(200).json(existingPending.invoiceData);
    }

    const invoicePayload = {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: payCurrency,
      order_id: `deposit_${userId}_${Date.now()}`,
      order_description: `Deposit for user ${userId}`,
      ipn_callback_url: `https://api.treasurenftx.xyz/payments/webhook`,
      success_url: `https://pixelnft.pro/recharge/success`,
      cancel_url: `https://pixelnft.pro/recharge/cancel`,
    };

    const invoiceRes = await axios.post(
      'https://api.nowpayments.io/v1/invoice',
      invoicePayload,
      {
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY || "HTZD0B6-Q8N4DFX-GPXB4P8-HT83X8N",
          'Content-Type': 'application/json',
        },
      }
    );

    if (!invoiceRes.data.id) {
      throw new Error('Missing invoice ID');
    }

    const paymentRes = await axios.post(
      'https://api.nowpayments.io/v1/invoice-payment',
      {
        iid: invoiceRes.data.id,
        pay_currency: payCurrency,
      },
      {
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY || "HTZD0B6-Q8N4DFX-GPXB4P8-HT83X8N",
          'Content-Type': 'application/json',
        },
      }
    );

    const generatedAddress = paymentRes.data.pay_address;
    if (!generatedAddress) {
      return res.status(500).json({ error: 'Failed to generate payment address' });
    }

    if (
      (networkLower === 'bep20' && !generatedAddress.startsWith('0x')) ||
      (networkLower === 'trc20' && !generatedAddress.startsWith('T'))
    ) {
      return res.status(500).json({ error: `Invalid ${network} address format` });
    }

    const pending = new PendingDeposit({
      userId,
      currency: currencyLower,
      network: networkLower,
      pay_address: generatedAddress,
      invoiceData: paymentRes.data,
    });

    await pending.save();
    res.status(200).json(paymentRes.data);
  } catch (err) {
    console.error('Create Invoice Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create invoice',
      details: err.response?.data || err.message,
    });
  }
};

const handleReferralBonus = async (userId, actually_paid) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const bonusA = actually_paid * 0.15;
    const bonusB = actually_paid * 0.07;
    const bonusC = actually_paid * 0.05;

    if (user.referredBy) {
      const levelA = await User.findById(user.referredBy);
      if (levelA) {
        await User.findByIdAndUpdate(levelA._id, {
          $inc: { balance: bonusA },
          $push: {
            teamRevenueHistory: {
              amount: bonusA,
              level: 'A',
              createdAt: new Date(),
            },
          },
        });

        if (levelA.referredBy) {
          const levelB = await User.findById(levelA.referredBy);
          if (levelB) {
            await User.findByIdAndUpdate(levelB._id, {
              $inc: { balance: bonusB },
              $push: {
                teamRevenueHistory: {
                  amount: bonusB,
                  level: 'B',
                  createdAt: new Date(),
                },
              },
            });

            if (levelB.referredBy) {
              const levelC = await User.findById(levelB.referredBy);
              if (levelC) {
                await User.findByIdAndUpdate(levelC._id, {
                  $inc: { balance: bonusC },
                  $push: {
                    teamRevenueHistory: {
                      amount: bonusC,
                      level: 'C',
                      createdAt: new Date(),
                    },
                  },
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Referral bonus error:', err);
  }
};

const handleWebhook = async (req, res) => {
  try {
    const {
      payment_id,
      order_id,
      payment_status,
      pay_amount,
      pay_currency,
      actually_paid,
      pay_address,
    } = req.body;

    const userId = order_id?.split('_')[1];
    if (!userId || !payment_id) return res.status(400).send('Missing required data');

    const duplicate = await Deposit.exists({ paymentId: payment_id });
    if (duplicate) return res.status(200).send('Already processed');

    if (payment_status === 'finished' || payment_status === 'partially_paid') {
      const isFirstDeposit = !(await Deposit.exists({ userId }));

      await new Deposit({
        userId,
        paymentId: payment_id,
        amount: Number(actually_paid),
        currency: pay_currency,
        address: pay_address,
        status: payment_status,
        timestamp: new Date(),
      }).save();

      await PendingDeposit.deleteOne({ userId, pay_address });

      if (isFirstDeposit && Number(pay_amount) >= 48) {
        const bonus = Number(pay_amount) * 0.07;
        await User.findByIdAndUpdate(userId, {
          $inc: { balance: bonus },
          $set: { level: 1 },
        });
      }

      await User.findByIdAndUpdate(userId, {
        $inc: { balance: Number(actually_paid) },
      });

      await handleReferralBonus(userId, Number(actually_paid));
    }

    res.status(200).send('Webhook received');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook failed');
  }
};

module.exports = {
  createNowPaymentInvoice,
  handleWebhook,
};
