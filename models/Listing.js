const mongoose = require('mongoose');
const { LISTING_TYPES, LISTING_STATUS, CONDITIONS } = require('../config/constants');

const listingSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Listing must belong to a seller']
    },
    originalSellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    ownerHistory: [
      {
        previousOwner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        newOwner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        transferredAt: {
          type: Date,
          default: Date.now
        },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Transaction'
        },
        type: {
          type: String,
          default: 'swap'
        }
      }
    ],
    title: {
      type: String,
      required: [true, 'Please provide a title for the listing'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description'],
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please select a category']
    },
    size: {
      type: String,
      trim: true,
      default: 'Free Size / Standard'
    },
    measurements: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative']
    },
    condition: {
      type: String,
      enum: CONDITIONS,
      default: 'Gently Used (Good Condition)'
    },
    images: {
      type: [String],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'Please upload at least one image'
      }
    },
    type: {
      type: String,
      enum: Object.values(LISTING_TYPES),
      default: LISTING_TYPES.SELL
    },
    status: {
      type: String,
      enum: Object.values(LISTING_STATUS),
      default: LISTING_STATUS.APPROVED
    },
    exchangePreferences: {
      type: String,
      maxlength: [500, 'Exchange preference cannot exceed 500 characters'],
      default: ''
    },
    location: {
      type: String,
      default: 'Bengaluru, Karnataka'
    },
    featured: {
      type: Boolean,
      default: false
    },
    viewsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high-performance search and filtering
listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ category: 1, status: 1, type: 1, size: 1 });
listingSchema.index({ sellerId: 1 });

module.exports = mongoose.model('Listing', listingSchema);
