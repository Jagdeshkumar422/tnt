const express = require('express');
const { sendOtp, register, getCountries, login , sendResetOtp, resetPassword, getUsers, getwallet, getBalance, depositeHistory, updateUser, changePasswordSendCode, changePassword, getTodayTeamRevenue, getCommunityStats } = require('../controllers/authController');
const { googleAuthenticator, confirm2FABinding, getgoogleSecretkey, sendEmailCode } = require('../controllers/googleVerificationController');
const auth = require('../middleware/auth');
const router = express.Router();
const User = require("../models/User")

router.post('/send-otp', sendOtp);
router.post('/register', register);
router.get('/countries', getCountries);
router.post('/login', login);
router.get('/teamrevenue/:userId', getTodayTeamRevenue);
router.get("/user/:id", getUsers)
router.put("/user/update", updateUser)
router.post('/send-reset-otp', sendResetOtp);
router.post('/send-reset-code', changePasswordSendCode);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);
router.get('/users/:userId/address', getwallet)
router.get('/users/:userId/balance', getBalance)
router.get('/users/:userId/deposits', depositeHistory)
// routes/auth.js
router.post('/send-email-code', sendEmailCode);
router.post('/verify-2fa',auth, googleAuthenticator);
router.get('/google-secret',auth, getgoogleSecretkey);
router.get('/community-stats', getCommunityStats);
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }); // latest first
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users");
  }
});

// POST /api/add-reward/:id
router.post('/add-reward/:id', async (req, res) => {
  const { amount } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    // user.rewards += Number(amount);
    user.balance += Number(amount);
    await user.save();

    res.json({ message: "Reward added successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to add reward");
  }
});


module.exports = router;
