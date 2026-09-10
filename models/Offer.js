const mongoose = require('mongoose');
const { OFFER_STATUS } = require('../config/constants');

const offerSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Offer must reference a listing']
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Offer must have a buyer']
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Offer must have a seller']
    },
    offeredPrice: {
      type: Number,
      required: [true, 'Offer price is required'],
      min: [1, 'Offer price must be at least ₹1']
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.PENDING
    },
    sellerResponseNote: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

offerSchema.index({ listingId: 1, buyerId: 1 });
offerSchema.index({ sellerId: 1, status: 1 });

module.exports = mongoose.model('Offer', offerSchema);
