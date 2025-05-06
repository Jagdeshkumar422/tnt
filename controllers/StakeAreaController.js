const HighestBid = require("../models/StakeArea");

exports.getStakeArea = async (req, res) => {
  try {
    const cards = await HighestBid.find();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.createStakeArea = async (req, res) => {
  try {
    const { title, level, stake, minAmount, maxAmount, income, fee } = req.body;
    const image = req.file?.path; // Use req.file for single image


    if (!title || !level || !stake || !minAmount || !maxAmount || !income || !fee || !image) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newCard = new HighestBid({ title, level, stake, minAmount, maxAmount, income, fee, image });
    await newCard.save();

    res.status(201).json({ message: "Card added successfully", card: newCard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

