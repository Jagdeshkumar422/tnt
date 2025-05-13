const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const BASE_URL = 'https://api.binance.com';

const getDepositHistory = async () => {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = crypto.createHmac('sha256', process.env.BINANCE_API_SECRET)
    .update(query)
    .digest('hex');

  const url = `${BASE_URL}/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;

  const headers = { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY };

  const response = await axios.get(url, { headers });
  return response.data;
};

module.exports = { getDepositHistory };
