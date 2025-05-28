const express = require('express');
const router = express.Router();
const Deposit = require('../models/Deposit');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const auth = require("../middleware/auth")
router.get('/history', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Withdrawals
    const withdrawals = await WithdrawalRequest.find({ userId }).lean();
    const formattedWithdrawals = withdrawals.map(w => ({
      type: 'WithdrawUSDT',
      amount: -Math.abs(w.amount), // Always negative
      createdAt: w.createdAt,
      status: w.status
    }));

    // 2. Deposits
    const deposits = await Deposit.find({ userId }).lean();
    const formattedDeposits = deposits.map(d => ({
      type: 'DepositUSDT',
      amount: Math.abs(d.amount), // Always positive
      createdAt: d.timestamp || d.createdAt,
      status: d.status || 'success'
    }));

    // 3. Reservation Profits (only sold)
    const reservations = await Reservation.find({ userId, status: 'sold' }).lean();
    const formattedReservations = reservations.map(r => ({
      type: 'Reservation Profit',
      amount: r.profit,
      createdAt: r.soldAt || r.updatedAt,
      status: 'success'
    }));

    // 4. Team Revenue
    const user = await User.findById(userId).lean();
    const formattedTeamRevenues = (user.teamRevenueHistory || []).map(t => ({
      type: `Team Revenue (Level ${t.level})`,
      amount: t.amount,
      createdAt: t.createdAt,
      status: 'success'
    }));

    // Combine & sort all history by date (newest first)
    const fullHistory = [
      ...formattedWithdrawals,
      ...formattedDeposits,
      ...formattedReservations,
      ...formattedTeamRevenues
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, history: fullHistory });

  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
