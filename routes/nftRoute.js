const express = require('express');
const router = express.Router();
const Nft = require('../models/Nft');

// Create new NFT
router.post('/nft/create', async (req, res) => {
  try {
    const { name, hash, price, image } = req.body;

    if (!name || !hash || !price || !image) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newNft = new Nft({ name, hash, price, image });
    await newNft.save();

    res.status(201).json({ message: 'NFT created successfully', nft: newNft });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all NFTs
router.get('/nft', async (req, res) => {
  try {
    const nfts = await Nft.find();
    res.json(nfts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch NFTs' });
  }
});

module.exports = router;
