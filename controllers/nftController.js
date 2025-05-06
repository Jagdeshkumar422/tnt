const NFT = require("../models/NFTModel");

exports.createNft = async (req, res) => {
  try {
    const { price } = req.body;
    const image = req.files?.image?.[0]?.path;

    if (!price || !image) {
      return res.status(400).json({ message: "Price and image are required." });
    }

    const newNFT = new NFT({
      price,
      image,
    });


    await newNFT.save(); // Save to MongoDB
    res.status(201).json({ message: "NFT created", nft: newNFT });
  } catch (err) {
    console.error("MongoDB Save Error:", err);
    res.status(500).json({ message: "Failed to create NFT", error: err.message });
  }
};


exports.getNft = async(req, res) => {
    try {
      const nfts = await NFT.find();
      res.json(nfts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch NFTs" });
    }
  };