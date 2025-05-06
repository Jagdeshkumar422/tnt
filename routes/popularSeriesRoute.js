// routes/explore.js
const express = require("express");

const upload = require("../middlewares/upload");
const { getPopular, createPopular } = require("../controllers/PopularSeriesController");
const router = express.Router();


// Get all explore cards (max 3)
router.get("/popular", getPopular);

// Add a new card
router.post("/popular", upload.single("image"), createPopular);

module.exports = router;
