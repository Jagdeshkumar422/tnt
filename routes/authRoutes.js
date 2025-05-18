const express = require('express');
const { sendOtp, register, getCountries, login , sendResetOtp, resetPassword, getUsers, getwallet, getBalance, depositeHistory } = require('../controllers/authController');
const { googleAuthenticator, confirm2FABinding, getgoogleSecretkey, sendEmailCode } = require('../controllers/googleVerificationController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/register', register);
router.get('/countries', getCountries);
router.post('/login', login);
router.get("/user/:id", getUsers)
router.post('/send-reset-otp', sendResetOtp);
router.post('/reset-password', resetPassword);
router.get('/users/:userId/address', getwallet)
router.get('/users/:userId/balance', getBalance)
router.get('/users/:userId/deposits', depositeHistory)
// routes/auth.js
router.post('/send-email-code', sendEmailCode);
router.get("/google-secret",auth, getgoogleSecretkey)
router.post('/verify-2fa',auth, googleAuthenticator);

module.exports = router;
