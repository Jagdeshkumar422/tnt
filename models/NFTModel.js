const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  price: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model("NFT", NFTSchema);
