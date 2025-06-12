const express = require("express");
const router = express.Router();
const { createNft, getNft } = require("../controllers/nftController");
const upload = require("../middlewares/upload");
const NFT = require("../models/NFTModel"); 
// Apply multer middleware for file uploads
router.post("/create", upload.fields([{ name: "image", maxCount: 1 }]), createNft);
router.get("/nft", getNft)
router.post("/nfts/json", async (req, res) => {
  try {
    const nftArray = req.body;

    if (!Array.isArray(nftArray) || nftArray.length === 0) {
      return res.status(400).json({ message: "NFT array is required" });
    }

    // Validate each item
    for (const nft of nftArray) {
      if (!nft.price || !nft.image) {
        return res.status(400).json({ message: "Each NFT must have price and image" });
      }
    }

    // Insert all NFTs
    const savedNFTs = await NFT.insertMany(nftArray);

    res.status(201).json({ message: "NFTs created", data: savedNFTs });
  } catch (err) {
    console.error("Error saving NFTs:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
});
module.exports = router;
