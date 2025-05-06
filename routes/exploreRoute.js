// routes/explore.js
const express = require("express");
const { createExplore, getExplore } = require("../controllers/exploreController");
const upload = require("../middlewares/upload");
const router = express.Router();


// Get all explore cards (max 3)
router.get("/explore", getExplore);

// Add a new card
router.post("/explore", upload.single("image"), createExplore);

module.exports = router;
