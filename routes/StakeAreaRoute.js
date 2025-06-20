// routes/explore.js
const express = require("express");

const upload = require("../middleware/upload");
const { getStakeArea, createStakeArea } = require("../controllers/StakeAreaController");
const router = express.Router();


// Get all explore cards (max 3)
router.get("/stake", getStakeArea);

// Add a new card
router.post("/stake", upload.single("image"), createStakeArea);

module.exports = router;
