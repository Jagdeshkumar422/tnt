// routes/explore.js
const express = require("express");

const upload = require("../middlewares/upload");
const { getBid, createBid } = require("../controllers/HighestBidController");
const router = express.Router();


// Get all explore cards (max 3)
router.get("/bid", getBid);

// Add a new card
router.post("/bid", upload.single("image"), createBid);

module.exports = router;
