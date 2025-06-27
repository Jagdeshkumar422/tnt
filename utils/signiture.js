const crypto = require('crypto');

// Test payload
const payload = {
  payment_id: "4387417058",
  payment_status: "finished",
  price_amount: 100,
  pay_amount: 100,
  pay_currency: "usdtbsc",
  order_id: "order-1234567890-685c3d27636a386602e23700",
  order_description: "User deposit for Mmt3x"
};

// Replace with your NOWPAYMENTS_IPN_SECRET from .env or NowPayments dashboard
const ipnSecret = 'V73S9nNob70WUzinJG3JXgGA6TTdDj6J';

// Sort payload by keys and convert to JSON string
const sortedBody = JSON.stringify(payload, Object.keys(payload).sort());
console.log('Sorted Payload:', sortedBody);

// Generate HMAC-SHA512 signature
const hmac = crypto.createHmac('sha512', ipnSecret).update(sortedBody).digest('hex');
console.log('x-nowpayments-sig:', hmac);