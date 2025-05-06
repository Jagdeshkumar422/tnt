// models/Explore.js
const mongoose = require("mongoose");

const BidSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
 
  price: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model("highestbed", BidSchema);
