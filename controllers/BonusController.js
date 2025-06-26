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

    const user = await User.findById(userId)
      .populate("uplineA", "userId name email level")
      .populate("uplineB", "userId name email level")
      .populate("uplineC", "userId name email level");

    if (!user) return res.status(404).json({ message: "User not found" });

    const uplines = {
      A: user.uplineA
        ? {
            id: user.uplineA._id,
            userId: user.uplineA.userId,
            name: user.uplineA.name,
            email: user.uplineA.email,
            level: user.uplineA.level,
          }
        : null,
      B: user.uplineB
        ? {
            id: user.uplineB._id,
            userId: user.uplineB.userId,
            name: user.uplineB.name,
            email: user.uplineB.email,
            level: user.uplineB.level,
          }
        : null,
      C: user.uplineC
        ? {
            id: user.uplineC._id,
            userId: user.uplineC.userId,
            name: user.uplineC.name,
            email: user.uplineC.email,
            level: user.uplineC.level,
          }
        : null,
    };

    res.status(200).json({ uplines });
  } catch (err) {
    console.error("Error fetching uplines:", err);
    res.status(500).json({ error: "Failed to fetch uplines" });
  }
};

