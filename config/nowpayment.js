// backend/config/nowpayment.js
require('dotenv').config();
const axios = require('axios');

// const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_API_KEY = "GBEF217-3S5MGFV-JWRPNTQ-G7Y2KE4";
// const NOWPAYMENTS_API_KEY = "XBFJZXA-77P4DVW-K91BPXY-HA9DNG7";

const nowPaymentsClient = axios.create({
  baseURL: 'https://api.nowpayments.io/v1',
  headers: {
    'x-api-key': NOWPAYMENTS_API_KEY,
    'Content-Type': 'application/json',
  },
});

// Create new payment
const createPayment = async (paymentData) => {
  const response = await nowPaymentsClient.post('/payment', paymentData);
  return response.data;
};

module.exports = {
  createPayment,
};
