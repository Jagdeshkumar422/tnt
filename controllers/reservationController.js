const Reservation = require("../models/Reservation");
const User = require("../models/User");
const Nft = require("../models/NFTModel");

// Reserve an NFT
exports.reserveNft = async (req, res) => {
  const { userId, nftId } = req.body;

  if (!userId || !nftId) {
    return res.status(400).json({ error: "Missing userId or nftId" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.balance < 50) {
      return res.status(403).json({ error: "Insufficient balance. Minimum $50 required." });
    }

    const lastReservation = await Reservation.findOne({ userId }).sort({ reservedAt: -1 });
    if (lastReservation) {
      const now = new Date();
      const diffHours = (now - lastReservation.reservedAt) / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remaining = (24 - diffHours).toFixed(2);
        return res.status(429).json({ error: `Please wait ${remaining} hours before reserving again.` });
      }
    }

    const nft = await Nft.findById(nftId);
    if (!nft) {
      return res.status(404).json({ error: "NFT not found" });
    }

    const reservation = new Reservation({
      userId,
      nftId,
      reservedAt: new Date(),
      status: "reserved",
      amount: nft.price || 100,  // Assuming amount is the NFT price
    });

    await reservation.save();
    return res.status(201).json({ message: "NFT reserved successfully" });

  } catch (error) {
    console.error("Reservation error:", error);
    return res.status(500).json({ error: "Failed to reserve NFT" });
  }
};

// Get reserved NFTs for a user
exports.getReservedNfts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId parameter" });
    }
    const reservations = await Reservation.find({ userId }).populate('nftId');
    res.json({ nfts: reservations });
  } catch (err) {
    console.error("Fetch reservations error:", err);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};

// Sell an NFT
exports.sellNFT = async (req, res) => {
  const { reservationId } = req.body;

  if (!reservationId) {
    return res.status(400).json({ error: "Missing reservationId" });
  }

  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    const user = await User.findById(reservation.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const amount = reservation.amount || 100;
    const level = Number(user.level) || 1;

    // Determine profit percent based on user level
    let profitPercent = 0.018; // default for level 1
    if (level === 2) profitPercent = 0.022;
    else if (level === 3) profitPercent = 0.028;
    else if (level === 4) profitPercent = 0.032;
    else if (level === 5) profitPercent = 0.036;
    else if (level >= 6) profitPercent = 0.04;

    const profit = parseFloat((amount * profitPercent).toFixed(2));

    // Add profit to user's balance
    user.balance += profit;
    await user.save();

    // Team revenue sharing
    const teamProfit = amount * profitPercent;
    const teamRevenue = [
      { ref: user.teamA, percent: 0.15 },
      { ref: user.teamB, percent: 0.07 },
      { ref: user.teamC, percent: 0.05 },
    ];

    for (const { ref, percent } of teamRevenue) {
      if (ref) {
        const refUser = await User.findById(ref);
        if (refUser) {
          const bonus = parseFloat((teamProfit * percent).toFixed(2));
          refUser.balance += bonus;
          await refUser.save();
        }
      }
    }

    // Mark reservation as sold
    reservation.status = 'sold';
    reservation.soldAt = new Date();
    reservation.profit = profit;
    await reservation.save();

    res.status(200).json({ message: `NFT sold successfully (Level ${level})`, profit });

  } catch (err) {
    console.error('Sell failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
