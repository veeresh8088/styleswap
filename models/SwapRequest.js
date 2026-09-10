const mongoose = require('mongoose');
const { SWAP_REQUEST_STATUS } = require('../config/constants');

const swapRequestSchema = new mongoose.Schema(
  {
    targetListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Swap request must target a product listing']
    },
    offeredListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Swap request must offer an item in exchange']
    },
    proposerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Swap request must have a proposer']
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Swap request must have a receiver/seller']
    },
    cashTopUp: {
      type: Number,
      default: 0,
      min: [0, 'Cash top up cannot be negative']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(SWAP_REQUEST_STATUS),
      default: SWAP_REQUEST_STATUS.PENDING
    },
    responseNote: {
      type: String,
      trim: true,
      default: ''
    },
    counterOffer: {
      counterListingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        default: null
      },
      counterCashTopUp: {
        type: Number,
        default: 0
      },
      note: {
        type: String,
        default: ''
      },
      createdAt: {
        type: Date
      }
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    }
  },
  {
    timestamps: true
  }
);

swapRequestSchema.index({ targetListingId: 1, proposerId: 1 });
swapRequestSchema.index({ receiverId: 1, status: 1 });
swapRequestSchema.index({ proposerId: 1, status: 1 });

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
