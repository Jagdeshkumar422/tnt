const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  nft: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nft',
    required: true
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reservedAt: {
    type: Date,
    default: Date.now
  },
  collected: {
    type: Boolean,
    default: true
  },
  sold: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Reservation', reservationSchema);
