const express = require("express");
const { getUserBonusSummary, getTeamLevels } = require("../controllers/BonusController");
const auth = require("../middleware/auth");

const router = express.Router()

router.get('/summary/:userId', getUserBonusSummary);
router.get('/levels', auth, getTeamLevels);

const Deposit = require('../models/Deposit');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const BonusHistory = require('../models/BonusHistory');


// GET all fund records and total revenue
router.get('/fund', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [recharges, withdrawals, bonusHistory] = await Promise.all([
      Deposit.find({ userId }).sort({ createdAt: -1 }),
      WithdrawalRequest.find({ userId }).sort({ createdAt: -1 }),
      BonusHistory.find({ userId }).sort({ createdAt: -1 })
    ]);

    // Commission = bonuses from referral or team
    const commissions = bonusHistory.filter(b => ['referral', 'team'].includes(b.type));

    // Transactions = all bonuses (e.g. reservation, level, etc.)
    const transactions = bonusHistory;

    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    res.json({
      recharge: recharges,
      withdraw: withdrawals,
      transaction: transactions,
      commission: commissions,
      totalRevenue: totalRevenue.toFixed(4),
    });
  } catch (err) {
    console.error('Error fetching fund records:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router