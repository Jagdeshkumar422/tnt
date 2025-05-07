const HighestBid = require("../models/PopularSeries");

exports.getPopular = async (req, res) => {
  try {
    const cards = await HighestBid.find().limit(5);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.createPopular = async (req, res) => {
  try {
    const { price, price1 } = req.body;
    const image = req.file?.path; // Use req.file for single image


    if (!price || !price1 || !image) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newCard = new HighestBid({ price, price1, image });
    await newCard.save();

    res.status(201).json({ message: "Card added successfully", card: newCard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

