const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    items: [cartItemSchema],
    loyaltyPointsToRedeem: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
