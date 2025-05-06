const mongoose = require("mongoose");

const popularSeries = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
 
  price: {
    type: String,
    required: true
  },
  price1: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model("popular", popularSeries);