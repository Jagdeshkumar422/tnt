const express = require('express');
const { sendOtp, register, getCountries, login , sendResetOtp, resetPassword, getUsers, getwallet, getBalance, depositeHistory, updateUser, changePasswordSendCode, changePassword, getTodayTeamRevenue, getCommunityStats, updateProfilePic, getTeamRevenue } = require('../controllers/authController');
const { googleAuthenticator, confirm2FABinding, getgoogleSecretkey, sendEmailCode } = require('../controllers/googleVerificationController');
const auth = require('../middleware/auth');
const router = express.Router();
const User = require("../models/User")
const upload = require("../middlewares/upload")

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
router.post('/update-profile-pic', auth, upload.single('image'), updateProfilePic);
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

const jwt = require("jsonwebtoken");

// Hardcoded credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "secure123"; // Store securely in env in production

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;


  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, "secretKey", { expiresIn: "1h" }); // Replace with env key
    return res.json({ token });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

router.get('/teams/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Team A: users directly referred by this user
    const teamA = await User.find({ referredBy: userId })
      .select('userId username balance email profilePic');

    // Team B: users referred by teamA users
    const teamAIds = teamA.map(u => u._id);
    const teamB = await User.find({ referredBy: { $in: teamAIds } })
      .select('userId username balance email profilePic');

    // Team C: users referred by teamB users
    const teamBIds = teamB.map(u => u._id);
    const teamC = await User.find({ referredBy: { $in: teamBIds } })
      .select('userId username balance email profilePic');

    res.json({
      A: teamA,
      B: teamB,
      C: teamC
    });
  } catch (err) {
    console.error('Error fetching team data:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/user/:userId/add-balance', async (req, res) => {
  const { userId } = req.params;
  const { balance } = req.body;
  console.log(balance)

  const parsedAmount = parseFloat(balance);
  if (!balance || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Invalid amount. Must be a number greater than 0.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.balance = (user.balance || 0) + parsedAmount;
    await user.save();

    res.json({ message: 'Balance updated', user });
  } catch (err) {
    console.error('Error adding balance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/user/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id)
  try {
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
})

router.get('/team-members', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('teamA', 'username email createdAt profilePic level balance')
      .populate('teamB', 'username email createdAt profilePic level balance')
      .populate('teamC', 'username email createdAt profilePic level balance');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      teamA: user.teamA,
      teamB: user.teamB,
      teamC: user.teamC,
    });
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/community-stats/:userId', async (req, res) => {
  const { userId } = req.params;
  const { time } = req.query;

  const now = new Date();
  let startDate = null;
  let endDate = null;

  switch (time) {
    case 'Today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'Yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'This week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'This month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
  }

  const timeFilter = startDate && endDate
    ? { createdAt: { $gte: startDate, $lt: endDate } }
    : {};

  try {
    const teamA = await User.find({ referredBy: userId, ...timeFilter });
    const teamAIds = teamA.map(u => u._id);
    const teamB = await User.find({ referredBy: { $in: teamAIds }, ...timeFilter });
    const teamBIds = teamB.map(u => u._id);
    const teamC = await User.find({ referredBy: { $in: teamBIds }, ...timeFilter });

    const calcStats = (arr) => ({
      registered: arr.length,
      active: arr.filter(u => u.balance > 0).length
    });

    res.json({
      totalRegistered: teamA.length + teamB.length + teamC.length,
      activeUsers: [...teamA, ...teamB, ...teamC].filter(u => u.balance > 0).length,
      levels: {
        A: calcStats(teamA),
        B: calcStats(teamB),
        C: calcStats(teamC),
      },
    });
  } catch (error) {
    console.error("Community Stats Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get('/team-revenue', auth, getTeamRevenue);


module.exports = router;
