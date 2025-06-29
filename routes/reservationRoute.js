const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Nft = require('../models/Nft');
const auth = require('../middleware/auth');
const User = require("../models/User")

// POST: Reserve an NFT (reference from existing Nft table)
router.post('/reserve/:nftId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const nftId = req.params.nftId;

    const nft = await Nft.findById(nftId);
    if (!nft) return res.status(404).json({ message: 'NFT not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 💰 Check if user has $48+ balance to reserve
    if (user.balance < 48) {
      return res.status(400).json({ message: 'Insufficient balance to reserve. Minimum required: $48' });
    }

    // ⏳ Check last reservation time
    const lastReservation = await Reservation.findOne({ reservedBy: userId })
      .sort({ reservedAt: -1 });

    if (lastReservation) {
      const timeSinceLast = Date.now() - new Date(lastReservation.reservedAt).getTime();
      if (timeSinceLast < 24 * 60 * 60 * 1000) {
        const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - timeSinceLast) / (1000 * 60 * 60));
        return res.status(400).json({
          message: `You can reserve again in ${hoursLeft} hour(s).`
        });
      }
    }

    // 🧾 Create new reservation
    const newReservation = new Reservation({
      nft: nftId,
      reservedBy: userId,
      reservedAt: new Date(),
      collected: true,
      sold: false,
    });

    await newReservation.save();
    res.status(201).json({ message: 'NFT reserved', reservation: newReservation });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



// GET: Appointments (uncollected or previously sold)
router.get('/appointments', auth, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const reservations = await Reservation.find({
      reservedBy: req.user.id,
      reservedAt: { $gte: startOfToday }
    }).populate('nft');

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch today\'s appointments' });
  }
});


// GET: Collected NFTs
router.get('/collected', auth, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const collected = await Reservation.find({
      reservedBy: req.user.id,
      collected: true,
      sold: false,
      reservedAt: { $gte: startOfToday }
    }).populate('nft');

    res.json(collected);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch collected NFTs' });
  }
});

router.get('/last-reservation', auth, async (req, res) => {
  const last = await Reservation.findOne({ reservedBy: req.user.id }).sort({ reservedAt: -1 });
  res.json(last);
});


// POST: Mark NFT as sold

const BonusHistory = require('../models/BonusHistory');



router.post('/sell', auth, async (req, res) => {
  try {
    const reservationId = req.body.reservationId;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    const user = await User.findById(reservation.reservedBy);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const baseAmount = 48;

    // 🧮 Level-based profit rate
    const levelRates = {
      1: 0.025,
      2: 0.027,
      3: 0.029,
      4: 0.032,
      5: 0.035,
      6: 0.039,
      7: 0.045
    };

    const userLevel = user.level || 1;
    const profitRate = levelRates[userLevel] || 0.025; // Default to 2.5% if not matched

    const sellerProfit = baseAmount * profitRate;

    // 💰 Add profit to user balance
    user.balance += sellerProfit;
    await user.save();

    // 📘 Save user's bonus history
    await BonusHistory.create({
      userId: user._id,
      sourceUserId: user._id,
      amount: sellerProfit,
      type: 'reservation',
      level: userLevel
    });

    // ✅ Mark reservation as sold
    reservation.sold = true;
    reservation.collected = false;
    await reservation.save();

    // 👥 Upline commission distribution
    const uplines = [
      { id: user.uplineA, label: 'A', percent: 0.15, level: 1 },
      { id: user.uplineB, label: 'B', percent: 0.10, level: 2 },
      { id: user.uplineC, label: 'C', percent: 0.05, level: 3 }
    ];

    const referralLogs = [];

    for (const { id, percent, level, label } of uplines) {
      if (id) {
        const upline = await User.findById(id);
        if (upline) {
          const teamBonus = sellerProfit * percent;
          upline.balance += teamBonus;
          await upline.save();

          await BonusHistory.create({
            userId: upline._id,
            sourceUserId: user._id,
            amount: teamBonus,
            type: 'team',
            level
          });

          referralLogs.push({
            level: label,
            email: upline.email,
            bonus: teamBonus.toFixed(2)
          });
        }
      }
    }

    return res.json({
      message: 'NFT marked as sold. Revenue distributed.',
      userLevel,
      sellerProfit: sellerProfit.toFixed(2),
      remainingBalance: user.balance.toFixed(2),
      teamBonuses: referralLogs
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});




module.exports = router;
