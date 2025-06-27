const express = require('express');
const router = express.Router();
const { createPayment } = require('../config/nowpayment');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const crypto = require('crypto');

router.post('/deposit/create-deposit', async (req, res) => {
  try {
    const { currency, userId } = req.body;

    if (!currency || !userId) {
      console.error('❌ Deposit creation: Missing currency or userId in request body.');
      return res.status(400).json({ success: false, message: 'Missing currency or userId' });
    }

    const supportedCurrencies = ['usdttrc20', 'usdtbsc', 'bnbbsc', 'busdbsc'];
    if (!supportedCurrencies.includes(currency)) {
      console.warn(`⚠️ Deposit creation: Unsupported currency received: ${currency}`);
      return res.status(400).json({ success: false, message: `Currency ${currency} is not supported` });
    }


    const existingDeposit = await Deposit.findOne({ userId, currency, status: 'waiting' });
    if (existingDeposit) {
      console.log(`ℹ️ Deposit creation: Reusing existing 'waiting' deposit for userId: ${userId}, currency: ${currency}. PaymentId: ${existingDeposit.paymentId}`);
      return res.json({
        success: true,
        address: existingDeposit.payAddress,
        paymentId: existingDeposit.paymentId,
        orderId: existingDeposit.orderId,
        invoice_url: existingDeposit.invoice_url,
        message: 'Existing deposit address reused',
      });
    }


    const orderId = `order-${Date.now()}-${userId}`;
    const paymentData = {
      price_amount: 1, 
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: 'https://api.treasurenftx.xyz/api/deposit/ipn',
      order_id: orderId,
      order_description: 'User deposit for Mmt3x',
    };

    console.log(`🌍 Creating NOWPayments payment for userId: ${userId}, currency: ${currency}, orderId: ${orderId}`);
    const payment = await createPayment(paymentData);

    
    const newDeposit = await Deposit.create({
      userId,
      amount: 0,
      currency,
      paymentId: String(payment.payment_id).trim(),
      orderId: orderId,
      payAddress: payment.pay_address,
      invoice_url: payment.invoice_url || '',
      status: 'waiting', 
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Deposit record created in DB. PaymentId: ${newDeposit.paymentId}, Address: ${newDeposit.payAddress}`);
    return res.json({
      success: true,
      address: payment.pay_address,
      paymentId: payment.payment_id,
      orderId: orderId,
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


router.post('/deposit/ipn', async (req, res) => {
  try {
    console.log('📋 Received IPN headers:', req.headers);
    console.log('📩 Received IPN payload:', JSON.stringify(req.body, null, 2));

    // --- Signature Verification (Crucial for Production) ---
    // Uncomment and configure your IPN secret for security.
    /*
    const signature = req.headers['x-nowpayments-sig'];
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET; // Ensure this env var is set securely
    if (!signature || !ipnSecret) {
      console.error('❌ IPN: Missing IPN signature header or NOWPAYMENTS_IPN_SECRET environment variable. Aborting.');
      return res.status(400).send('Missing IPN signature or secret');
    }

    // Sort the keys of the body object alphabetically before stringifying to ensure consistent hashing
    const sortedBody = JSON.stringify(req.body, Object.keys(req.body).sort());
    const hmac = crypto.createHmac('sha512', ipnSecret).update(sortedBody).digest('hex');

    if (signature !== hmac) {
      console.error('❌ IPN: Invalid IPN signature.', { received: signature, expected: hmac });
      return res.status(401).send('Invalid IPN signature');
    }
    console.log('✅ IPN: Signature verified successfully.');
    */
    // --- End Signature Verification ---

    // Destructure relevant fields from the IPN payload
    const { payment_id, payment_status, actually_paid, order_id } = req.body; // <-- KEY CHANGE: Use 'actually_paid'


    if (!payment_id || !payment_status) {
      console.error('❌ IPN: Missing essential fields (payment_id or payment_status) in payload.', { payment_id, payment_status });
      return res.status(400).send('Missing payment_id or payment_status');
    }

    const paymentId = String(payment_id).trim();
    const orderId = order_id ? String(order_id).trim() : null;
    console.log(`🔍 IPN: Attempting to find deposit for payment_id: "${paymentId}" and order_id: "${orderId || 'N/A'}"`);

   
    const query = { paymentId };
    if (orderId) query.orderId = orderId;


    const deposit = await Deposit.findOne(query);

    if (!deposit) {
 
      const allDepositsSummary = await Deposit.find({}, { paymentId: 1, orderId: 1, _id: 0 }).lean();
      console.error(`❌ IPN: No matching deposit found for payment_id: "${paymentId}" and order_id: "${orderId || 'N/A'}".`, {
        searchedPaymentId: paymentId,
        searchedOrderId: orderId,
        availableDepositsSummary: allDepositsSummary,
      });
      return res.status(404).send('Deposit not found');
    }

    console.log(`✅ IPN: Deposit record found: ${JSON.stringify(deposit, null, 2)}`);


    const finalProcessedStates = ['finished', 'failed', 'expired', 'refunded'];
    if (finalProcessedStates.includes(deposit.status)) {
        console.log(`ℹ️ IPN: Deposit (paymentId: ${paymentId}) already processed with status: "${deposit.status}". Skipping further updates.`);
        return res.status(200).send('Already processed');
    }

    deposit.status = payment_status;
    deposit.updatedAt = new Date();
    console.log(`🔄 IPN: Updating deposit (paymentId: ${paymentId}) status to: "${payment_status}".`);

    const successfulPaymentStatuses = ['finished', 'confirmed', 'sending'];
    const failedOrExpiredStatuses = ['failed', 'expired', 'refunded'];

    if (successfulPaymentStatuses.includes(payment_status)) {
      const actualDepositAmount = parseFloat(actually_paid) || 0; 

      if (actualDepositAmount <= 0) {
        console.warn(`⚠️ IPN: Received zero or negative actual_paid amount (${actualDepositAmount}) for paymentId: ${paymentId}. Skipping user balance update.`);
       
      } else {
        deposit.amount = actualDepositAmount; 
        console.log(`💰 IPN: Deposit (paymentId: ${paymentId}) amount set to actual paid amount: ${deposit.amount}`);

      
        const user = await User.findById(deposit.userId).populate('uplineA uplineB uplineC');
        if (!user) {
          console.error(`❌ IPN: User not found for userId: ${deposit.userId} associated with deposit ${paymentId}. Cannot update balance or bonuses.`);
          // Continue to save deposit status even if user is not found to prevent re-processing this IPN
        } else {
          console.log(`👤 IPN: User found (id: ${user._id}), current balance: ${user.balance}`);

          // Add the deposit amount to the user's main balance
          user.balance = (user.balance || 0) + deposit.amount;
          console.log(`📈 IPN: User ${user._id} balance increased by ${deposit.amount}. New balance: ${user.balance}`);

          // --- Apply First Deposit Bonus ---
          // Check if this is truly the user's first successful deposit
          const previousSuccessfulDepositsCount = await Deposit.countDocuments({
            userId: user._id,
            status: { $in: successfulPaymentStatuses },
            _id: { $ne: deposit._id }, // Exclude the current deposit being processed
          });

          if (previousSuccessfulDepositsCount === 0) {
            const selfBonus = deposit.amount * 0.10; // 10% bonus for first deposit
            user.balance += selfBonus;
            user.bonusHistory.push({
              sourceUser: user._id,
              level: 'direct_first_deposit',
              amount: selfBonus,
              createdAt: new Date(),
            });
            console.log(`🎁 IPN: Applied first deposit bonus of ${selfBonus} to user ${user._id}. New balance: ${user.balance}`);
          } else {
            console.log(`ℹ️ IPN: User ${user._id} already has previous successful deposits. Skipping first deposit bonus.`);
          }

          // --- Apply Upline Bonuses ---
          // Define bonus rates for different upline levels
          const bonusLevels = [
            { field: 'uplineA', rate: 0.15, levelName: 'A' }, // 15% for upline A
            { field: 'uplineB', rate: 0.10, levelName: 'B' }, // 10% for upline B
            { field: 'uplineC', rate: 0.05, levelName: 'C' }, // 5% for upline C
          ];

          for (const { field, rate, levelName } of bonusLevels) {
            if (user[field]) { // Check if the upline user exists
              const bonusAmount = deposit.amount * rate;
              user[field].balance = (user[field].balance || 0) + bonusAmount;
              user[field].bonusHistory.push({
                sourceUser: user._id, // The user who made the deposit
                level: levelName,
                amount: bonusAmount,
                createdAt: new Date(),
              });
              await user[field].save(); // Save the upline user's updated balance and history
              console.log(`🎁 IPN: Applied upline ${levelName} bonus of ${bonusAmount} to user ${user[field]._id}. New balance: ${user[field].balance}`);
            } else {
              console.log(`ℹ️ IPN: No upline ${levelName} found for user ${user._id}. Skipping bonus.`);
            }
          }

          await user.save(); // Save the primary user's updated balance and history
          console.log(`✅ IPN: User (id: ${user._id}) balance and bonus history successfully updated. Final balance: ${user.balance}`);
        }
      }
    } else if (failedOrExpiredStatuses.includes(payment_status)) {
      console.log(`⚠️ IPN: Deposit (paymentId: ${paymentId}) marked as "${payment_status}". No balance update applied.`);
    } else {
      console.log(`ℹ️ IPN: Received intermediate status "${payment_status}" for paymentId: ${paymentId}. Balance not updated yet.`);
    }

    await deposit.save(); // Always save the deposit record with its updated status
    console.log(`✅ IPN: Deposit record (paymentId: ${paymentId}) saved with final status: "${deposit.status}".`);
    res.status(200).send('OK'); // Acknowledge receipt of the IPN

  } catch (err) {
    console.error('❌ IPN handling failed:', err.message, err.stack);
    // Send a 500 status to NOWPayments to indicate an internal server error.
    res.status(500).send('IPN handling failed due to server error');
  }
});

// Admin: Get all deposits
router.get('/getdeposit', async (req, res) => {
  try {
    // Populate userId to show user's name, email, and userId (assuming 'userId' is a field in the User model)
    const deposits = await Deposit.find().populate('userId', 'name email userId');
    console.log('✅ Fetched all deposits successfully.');
    res.json(deposits);
  } catch (err) {
    console.error('❌ Get deposits error:', err.message);
    res.status(500).json({ error: 'Server error retrieving deposits' });
  }
});

module.exports = router;