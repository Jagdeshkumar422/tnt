const HighestBid = require("../models/HighestBid");

exports.getBid = async (req, res) => {
  try {
    const cards = await HighestBid.find().limit(3);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.createBid = async (req, res) => {
  try {
    const count = await HighestBid.countDocuments();
    if (count >= 3) {
      return res.status(400).json({ message: "Limit of 3 explore cards reached" });
    }

    const { price } = req.body;
    const image = req.file?.path; // Use req.file for single image


    if (!price || !image) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newCard = new HighestBid({ price, image });
    await newCard.save();

    res.status(201).json({ message: "Card added successfully", card: newCard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

