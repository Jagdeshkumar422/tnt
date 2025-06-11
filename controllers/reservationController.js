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

    // ✅ Check if user balance is enough for this NFT
    if (user.balance < nft.price) {
      return res.status(403).json({ error: `Insufficient balance. NFT price is $${nft.price}, your balance is $${user.balance}.` });
    }

    const reservation = new Reservation({
      userId,
      nftId,
      reservedAt: new Date(),
      status: "reserved",
      amount: nft.price || 100,  // Fallback in case nft.price is undefined
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

    if (reservation.status === 'sold') {
      return res.status(400).json({ error: "NFT already sold" });
    }

    const user = await User.findById(reservation.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const nft = await Nft.findById(reservation.nftId);
    if (!nft) {
      return res.status(404).json({ error: "NFT not found" });
    }

    const nftPrice = nft.price;
    const level = Number(user.level) || 1;

    // Profit percent based on user level
    let profitPercent = 0.028;
    if (level === 2) profitPercent = 0.028;
    else if (level === 3) profitPercent = 0.028;
    else if (level === 4) profitPercent = 0.032;
    else if (level === 5) profitPercent = 0.036;
    else if (level >= 6) profitPercent = 0.04;

    const profit = parseFloat((nftPrice * profitPercent).toFixed(2));

    // Add profit to user
    user.balance += profit;
    await user.save();

    // Referral bonus chain: A -> B -> C
    const teamProfit = nftPrice * profitPercent;
    const bonusLevels = [
      { level: 'A', percent: 0.15 },
      { level: 'B', percent: 0.07 },
      { level: 'C', percent: 0.05 },
    ];

    let currentRef = user.referredBy;
    for (let i = 0; i < bonusLevels.length && currentRef; i++) {
      const refUser = await User.findById(currentRef);
      if (!refUser) break;

      const bonusAmount = parseFloat((teamProfit * bonusLevels[i].percent).toFixed(2));
      refUser.balance += bonusAmount;
      refUser.teamRevenueHistory.push({
        amount: bonusAmount,
        level: bonusLevels[i].level,
      });

      await refUser.save();

      // Move to next ref chain
      currentRef = refUser.referredBy;
    }

    // Mark reservation as sold
    reservation.status = 'sold';
    reservation.soldAt = new Date();
    reservation.profit = profit;
    await reservation.save();

    res.status(200).json({
      message: `NFT sold successfully (Level ${level})`,
      profit,
    });

  } catch (err) {
    console.error('Sell failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
