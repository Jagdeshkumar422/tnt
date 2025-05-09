const express = require('express');
const { sendOtp, register, getCountries, login , sendResetOtp, resetPassword } = require('../controllers/authController');
const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/register', register);
router.get('/countries', getCountries);
router.post('/login', login);

router.post('/send-reset-otp', sendResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
