const express = require("express");
const router = express.Router();
const { createNft, getNft } = require("../controllers/nftController");
const upload = require("../middlewares/upload");

// Apply multer middleware for file uploads
router.post("/create", upload.fields([{ name: "image", maxCount: 1 }]), createNft);
router.get("/nft", getNft)

module.exports = router;
