const axios = require('axios');
const Deposit = require('../models/Deposit');
const PendingDeposit = require('../models/PendingDeposit'); // Import the new model
const User = require('../models/User');

const createNowPaymentInvoice = async (req, res) => {
  const { amount, userId, currency, network } = req.body;

  const currencyNetworkMap = {
    'usdt': {
      'bep20': 'usdtbsc',
      'trc20': 'usdttrc20',
    },
  };

  const payCurrency = currencyNetworkMap[currency.toLowerCase()]?.[network.toLowerCase()];
  if (!payCurrency) {
    console.log(`Unsupported currency or network: ${currency}, ${network}`);
    return res.status(400).json({ error: 'Unsupported currency or network' });
  }

  try {
    // Step 1: Check for an existing pending deposit address
    const existingDeposit = await PendingDeposit.findOne({
      userId,
      currency: currency.toLowerCase(),
      network: network.toLowerCase(),
    });

    if (existingDeposit) {
      console.log(`Found existing deposit address for user ${userId}:`, existingDeposit.pay_address);
      return res.status(200).json(existingDeposit.invoiceData);
    }

    // Step 2: Create a new invoice if no existing address is found
    console.log('Creating invoice with payload:', {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: payCurrency,
      order_id: `deposit_${userId}_${Date.now()}`,
      order_description: `Deposit for user ${userId}`,
      ipn_callback_url: `${process.env.BACKEND_URL}/payments/webhook`,
      success_url: `${process.env.FRONTEND_URL}/recharge/success`,
      cancel_url: `${process.env.FRONTEND_URL}/recharge/cancel`,
    });

    const invoiceResponse = await axios.post(
      'https://api.nowpayments.io/v1/invoice',
      {
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: payCurrency,
        order_id: `deposit_${userId}_${Date.now()}`,
        order_description: `Deposit for user ${userId}`,
        ipn_callback_url: `${process.env.BACKEND_URL}/payments/webhook`,
        success_url: `${process.env.FRONTEND_URL}/recharge/success`,
        cancel_url: `${process.env.FRONTEND_URL}/recharge/cancel`,
      },
      {
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Invoice response:', invoiceResponse.data);

    if (!invoiceResponse.data.id) {
      throw new Error('Invoice ID not found in response');
    }

    console.log('Creating payment for invoice ID:', invoiceResponse.data.id);
    const paymentResponse = await axios.post(
      'https://api.nowpayments.io/v1/invoice-payment',
      {
        iid: invoiceResponse.data.id,
        pay_currency: payCurrency,
      },
      {
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Payment response:', paymentResponse.data);

    if (!paymentResponse.data.pay_address) {
      console.error('No pay_address in payment response:', paymentResponse.data);
      return res.status(500).json({ error: 'Failed to generate deposit address', details: paymentResponse.data });
    }

    // Validate the network of the generated address
    const generatedAddress = paymentResponse.data.pay_address;
    if (network.toLowerCase() === 'bep20' && !generatedAddress.startsWith('0x')) {
      return res.status(500).json({ error: 'Generated address does not match BEP20 network' });
    }
    if (network.toLowerCase() === 'trc20' && !generatedAddress.startsWith('T')) {
      return res.status(500).json({ error: 'Generated address does not match TRC20 network' });
    }

    // Step 3: Save the deposit address to PendingDeposit
    const pendingDeposit = new PendingDeposit({
      userId,
      currency: currency.toLowerCase(),
      network: network.toLowerCase(),
      pay_address: paymentResponse.data.pay_address,
      invoiceData: paymentResponse.data,
    });
    await pendingDeposit.save();
    console.log(`Saved pending deposit for user ${userId}:`, paymentResponse.data.pay_address);

    res.status(200).json(paymentResponse.data);
  } catch (error) {
    console.error('Error creating invoice or payment:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create invoice or payment', details: error.response?.data || error.message });
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

    const userId = order_id.split('_')[1];

    if (payment_status === 'finished' || payment_status === 'partially_paid') {
      // Save the deposit
      const deposit = new Deposit({
        userId,
        paymentId: payment_id,
        amount: actually_paid,
        currency: pay_currency,
        address: pay_address,
        status: payment_status,
        timestamp: new Date(),
      });
      await deposit.save();
      console.log(`Deposit recorded: User ${userId} deposited ${actually_paid} ${pay_currency}`);

      // Delete the pending deposit
      await PendingDeposit.deleteOne({ userId, pay_address });
      console.log(`Deleted pending deposit for user ${userId} after successful payment`);

      // Check if it's the user's first deposit
      const previousDeposits = await Deposit.find({ userId });
      if (previousDeposits.length === 1 && Number(pay_amount) >= 50) {
        // Give bonus and set level to 1
        const bonus = Number(pay_amount) * 0.07;

        await User.findByIdAndUpdate(userId, {
          $inc: { balance: bonus }, // assuming you store user's balance
          $set: { level: 1 }, // assuming you store user level
        });

        console.log(`First deposit bonus of ${bonus} added to user ${userId}. Level set to 1.`);
      }
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook failed');
  }
};


module.exports = { createNowPaymentInvoice, handleWebhook };