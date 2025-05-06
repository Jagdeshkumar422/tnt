const Explore = require("../models/Explore");

exports.getExplore = async (req, res) => {
  try {
    const cards = await Explore.find().limit(3);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.createExplore = async (req, res) => {
  try {
    const count = await Explore.countDocuments();
    if (count >= 3) {
      return res.status(400).json({ message: "Limit of 3 explore cards reached" });
    }

    const { heading, para } = req.body;
    const image = req.file?.path; // Use req.file for single image

    console.log("heading:", heading);
    console.log("para:", para);
    console.log("image:", image);

    if (!heading || !para || !image) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newCard = new Explore({ heading, para, image });
    await newCard.save();

    res.status(201).json({ message: "Card added successfully", card: newCard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

