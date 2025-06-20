const express = require("express");
const upload = require("../middleware/upload");
const {
  getBanners,
  updateBanner,
  seedBanners,
} = require("../controllers/bannerController");
const router = require("express").Router(); 

// Routes
router.get("/banners", getBanners);
router.post("/banners", seedBanners); // Call this only once
router.put("/banners/:order", upload.single("image"), updateBanner);

module.exports = router;
