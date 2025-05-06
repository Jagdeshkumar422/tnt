// models/Explore.js
const mongoose = require("mongoose");

const ExploreSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  heading: {
    type: String,
    required: true
  },
  para: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model("Explore", ExploreSchema);
