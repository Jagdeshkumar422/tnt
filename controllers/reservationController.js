const Reservation = require("../models/Reservation");
const User = require("../models/User")
// Reserve an NFT
exports.reserveNft = async (req, res) => {
  const { userId, nftName } = req.body;

  if (!userId || !nftName) {
    return res.status(400).json({ error: "Missing userId or nftName" });
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.balance < 50) {
      return res.status(403).json({ error: "Insufficient balance. Minimum $50 required." });
    }

    const lastReservation = await Reservation.findOne({ userId }).sort({ reservedAt: -1 });

    if (lastReservation) {
      const now = new Date();
      const lastTime = new Date(lastReservation.reservedAt);
      const diffHours = (now - lastTime) / (1000 * 60 * 60); // Convert ms to hours

      if (diffHours < 24) {
        const remaining = (24 - diffHours).toFixed(2);
        return res.status(429).json({ error: `Please wait ${remaining} hours before reserving again.` });
      }
    }

    const reservation = new Reservation({
      userId,
      nftName,
      reservedAt: new Date(),
      status: "reserved"
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

    const reservations = await Reservation.find({ userId });
    res.json({ nfts: reservations });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};


// Sell an NFT
// controllers/sellController.js

exports.sellNFT = async (req, res) => {
  const { reservationId } = req.body;

  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation || reservation.status === 'sold') {
      return res.status(400).json({ error: 'Invalid or already sold NFT' });
    }

    const user = await User.findById(reservation.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const amount = reservation.amount || 100; // amount reserved
    const profitPercent = 0.02; // 2% profit
    const profit = parseFloat((amount * profitPercent).toFixed(2));

    // ✅ Add only profit, do NOT add original amount
    user.balance += profit;
    await user.save();

    // ✅ Update reservation status
    reservation.status = 'sold';
    reservation.soldAt = new Date();
    reservation.profit = profit;
    await reservation.save();

    res.status(200).json({ message: 'NFT sold successfully', profit });
  } catch (err) {
    console.error('Sell failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};





