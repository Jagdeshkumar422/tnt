const mongoose = require('mongoose');
const axios = require('axios');
const Deposit = require('../models/Deposit');
const PendingDeposit = require('../models/PendingDeposit');
const User = require('../models/User');

// Webhook for confirming payment
const handleWebhook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    // Validate required fields
    if (!payment_id || !order_id || !pay_amount || !actually_paid || !pay_address) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send('Missing required data');
    }

    const userId = order_id.split('_')[1];
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send('Invalid order ID format');
    }

    // Check for duplicate deposit
    const duplicate = await Deposit.exists({ paymentId: payment_id }).session(session);
    if (duplicate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).send('Already processed');
    }

    // Process only confirmed or partially paid deposits
    if (payment_status === 'finished' || payment_status === 'partially_paid') {
      // Find user
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).send('User not found');
      }

      // Check if this is the user's first deposit
      const isFirstDeposit = !(await Deposit.exists({ userId }).session(session));

      // Convert amounts to numbers and validate
      const actualAmount = Number(actually_paid);
      const payAmount = Number(pay_amount);
      if (isNaN(actualAmount) || isNaN(payAmount) || actualAmount <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send('Invalid payment amount');
      }

      // Create deposit record
      const deposit = new Deposit({
        userId,
        paymentId: payment_id,
        amount: actualAmount,
        currency: pay_currency,
        address: pay_address,
        status: payment_status,
        timestamp: new Date(),
      });
      await deposit.save({ session });

      // Update user balance with the deposited amount
      await User.findByIdAndUpdate(
        userId,
        { $inc: { balance: actualAmount } },
        { session }
      );

      // Handle first deposit bonus (if applicable)
      if (isFirstDeposit && payAmount >= 50) {
        const bonus = payAmount * 0.07;
        await User.findByIdAndUpdate(
          userId,
          {
            $inc: { balance: bonus },
            $set: { level: 1 },
          },
          { session }
        );
      }

      // Remove pending deposit
      await PendingDeposit.deleteOne({ userId, pay_address }).session(session);

      // Handle referral bonuses
      await handleReferralBonus(userId, actualAmount, session);

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).send('Webhook received');
    } else {
      // If payment is not confirmed, acknowledge but don't process
      await session.abortTransaction();
      session.endSession();
      res.status(200).send('Webhook received but payment not confirmed');
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Webhook error:', err);
    res.status(500).send('Webhook failed');
  }
};

// Handle referral bonus logic (updated to use session)
const handleReferralBonus = async (userId, actually_paid, session) => {
  try {
    const user = await User.findById(userId).session(session);
    if (!user) return;

    const bonusA = actually_paid * 0.15;
    const bonusB = actually_paid * 0.07;
    const bonusC = actually_paid * 0.05;

    if (user.referredBy) {
      const levelA = await User.findById(user.referredBy).session(session);
      if (levelA) {
        await User.findByIdAndUpdate(
          levelA._id,
          {
            $inc: { balance: bonusA },
            $push: {
              teamRevenueHistory: {
                amount: bonusA,
                level: 'A',
                createdAt: new Date(),
              },
            },
          },
          { session }
        );

        if (levelA.referredBy) {
          const levelB = await User.findById(levelA.referredBy).session(session);
          if (levelB) {
            await User.findByIdAndUpdate(
              levelB._id,
              {
                $inc: { balance: bonusB },
                $push: {
                  teamRevenueHistory: {
                    amount: bonusB,
                    level: 'B',
                    createdAt: new Date(),
                  },
                },
              },
              { session }
            );

            if (levelB.referredBy) {
              const levelC = await User.findById(levelB.referredBy).session(session);
              if (levelC) {
                await User.findByIdAndUpdate(
                  levelC._id,
                  {
                    $inc: { balance: bonusC },
                    $push: {
                      teamRevenueHistory: {
                        amount: bonusC,
                        level: 'C',
                        createdAt: new Date(),
                      },
                    },
                  },
                  { session }
                );
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Referral bonus error:', err);
    throw err; // Rethrow to let the transaction handle the rollback
  }
};

module.exports = {
  createNowPaymentInvoice,
  handleWebhook,
};