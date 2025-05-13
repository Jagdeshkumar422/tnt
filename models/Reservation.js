const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // assumes a User model exists
    required: true,
  },
  nftName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['reserved', 'sold'],
    default: 'reserved',
  },
  profit: {
    type: Number,
    default: 0,
  },
  soldAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update updatedAt on save
reservationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;
