const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Deposit = require('../models/Deposit'); // Create this if you track deposits
const Withdraw = require('../models/WithdrawalRequest'); // Create this if you track withdrawals

// GET /api/admin/users - Get all users with extra info
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .populate('referredBy', 'name') // Get referral name
      .lean();

    // Add computed totals for each user
    for (const user of users) {
      const [deposits, withdrawals] = await Promise.all([
        Deposit.aggregate([
          { $match: { userId: user._id } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Withdraw.aggregate([
          { $match: { userId: user._id } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
      ]);

      user.totalDeposit = deposits[0]?.total || 0;
      user.totalWithdraw = withdrawals[0]?.total || 0;
      user.referralName = user.referredBy?.name || '-';
    }

    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/add-balance - Add balance to user
router.post('/add-balance', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { $inc: { balance: Number(amount) } });
    res.json({ message: 'Balance added successfully' });
  } catch (err) {
    console.error('Failed to add balance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/add-reward - Add reward to user
router.post('/add-reward', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { $inc: { balance: Number(amount) } });
    // Optionally store a reward log here
    res.json({ message: 'Reward added successfully' });
  } catch (err) {
    console.error('Failed to add reward:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error while deleting user' });
  }
});


router.get("/deposits", async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("userId", "userId name email") // Include user info
      .sort({ createdAt: -1 });

    res.json(deposits);
  } catch (err) {
    console.error("Failed to fetch deposits:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /admin/withdrawals?page=1&limit=10
router.get('/withdrawals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await Withdraw.countDocuments();
    const withdrawals = await Withdraw.find()
      .populate("userId", "userId name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      withdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Failed to fetch withdrawals:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
