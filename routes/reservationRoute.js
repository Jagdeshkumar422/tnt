const express = require("express");
const router = express.Router();
const {
  reserveNft,
  getReservedNfts,
  sellNFT,
} = require("../controllers/reservationController");

router.post("/reserve", reserveNft);
router.get("/reserved/:userId", getReservedNfts);
router.post("/sell", sellNFT);
// GET /last-reservation/:userId


module.exports = router;
