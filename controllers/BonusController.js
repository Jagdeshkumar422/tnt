const mongoose = require("mongoose");
const BonusHistory = require("../models/BonusHistory");
const User = require('../models/User');
const Deposit = require("../models/Deposit")
const withdraw = require("../models/WithdrawalRequest")

exports.getUserBonusSummary = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayMatch = {
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    };

    const totalMatch = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    const [todayStats, totalStats, totalDeposit, totalWithdraw] = await Promise.all([
      BonusHistory.aggregate([
        { $match: todayMatch },
        {
          $group: {
            _id: { $toLower: "$type" },
            total: { $sum: "$amount" },
          },
        },
      ]),
      BonusHistory.aggregate([
        { $match: totalMatch },
        {
          $group: {
            _id: { $toLower: "$type" },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Deposit.aggregate([
        { $match: totalMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      withdraw.aggregate([
        { $match: totalMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const formatStats = (stats) => {
      const result = { reservation: 0, team: 0, referral: 0 };
      stats.forEach((s) => {
        const type = s._id;
        if (result.hasOwnProperty(type)) {
          result[type] = s.total;
        }
      });
      return result;
    };

    const today = formatStats(todayStats);
    const total = formatStats(totalStats);

    res.json({
      todayReservationProfit: today.reservation,
      todayTeamRevenue: today.team,
      todayReferralRevenue: today.referral,
      todayTotalRevenue: today.reservation + today.team + today.referral,

      totalReservationProfit: total.reservation,
      totalTeamRevenue: total.team,
      totalReferralRevenue: total.referral,
      totalRevenue: total.reservation + total.team + total.referral,

      totalDeposit: totalDeposit[0]?.total || 0,
      totalWithdraw: totalWithdraw[0]?.total || 0,
    });

  } catch (err) {
    console.error("Error fetching user bonus summary:", err);
    res.status(500).json({ error: "Server error" });
  }
};



exports.getTeamLevels = async (req, res) => {
 try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Fetch only users who were referred by YOU in A, B, or C
    const level1 = await User.find({ uplineA: userId }).select("userId name email balance");
    const level2 = await User.find({ uplineB: userId }).select("userId name email balance");
    const level3 = await User.find({ uplineC: userId }).select("userId name email balance");

    const result = [
      {
        level: 1,
        count: level1.length,
        users: level1
      },
      {
        level: 2,
        count: level2.length,
        users: level2
      },
      {
        level: 3,
        count: level3.length,
        users: level3
      }
    ];

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching referred users by upline levels:", err);
    res.status(500).json({ message: "Server error" });
  }
};

