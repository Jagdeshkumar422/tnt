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
    const userId = req.user.id; // Current user (the root of downline)

    // Initialize arrays for levels 1–6
    const levelUsers = Array(7).fill().map(() => []); // Index 1–6 used

    // Fetch all users referred directly or indirectly (up to 6 levels deep)
    let currentLevelIds = [userId];
    for (let level = 1; level <= 6; level++) {
      if (currentLevelIds.length === 0) break;

      // Find users whose uplineA is in the current level's IDs
      const users = await User.find({ uplineA: { $in: currentLevelIds } }).select(
        '_id userId level uplineA'
      );

      // Group users by their 'level' field
      users.forEach((user) => {
        const userLevel = user.level || level; // Fallback to computed level if 'level' is missing
        if (userLevel >= 1 && userLevel <= 6) {
          levelUsers[userLevel].push(user);
        }
      });

      // Prepare IDs for the next level
      currentLevelIds = users.map((u) => u._id);
    }

    // Format each level's data
    const levelData = await Promise.all(
      levelUsers.slice(1).map(async (users, idx) => {
        const level = idx + 1;
        const userCount = users.length;

        // Get user details and bonuses for this level
        const userDetails = await Promise.all(
          users.map(async (user) => {
            // Get total bonuses earned from this specific user
            const bonuses = await BonusHistory.aggregate([
              {
                $match: {
                  userId: userId, // Bonus earned by this user
                  sourceUserId: user._id, // From this specific user
                  level: level,
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: '$amount' },
                },
              },
            ]);

            return {
              userId: user._id || user._id.toString(), // Use userId or _id
              profit: bonuses[0]?.total.toFixed(3) || '0.000',
            };
          })
        );

        return {
          level,
          count: userCount,
          users: userDetails, // Array of users with their details
        };
      })
    );

    res.status(200).json(levelData);
  } catch (err) {
    console.error('Error fetching team levels:', err);
    res.status(500).json({ error: 'Failed to fetch team data' });
  }
};

