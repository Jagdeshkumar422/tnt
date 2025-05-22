const express = require('express');
const router = express.Router();

// Assuming you have a database model for deposits
const Deposit = require('../models/Deposit'); // Example: MongoDB model
const { createNowPaymentInvoice, handleWebhook } = require('../controllers/nowPayments');

router.post('/create-nowpayment', createNowPaymentInvoice);
router.post('/webhook', handleWebhook);

module.exports = router;