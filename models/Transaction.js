const mongoose = require('mongoose');
const { TRANSACTION_TYPES, TRANSACTION_STATUS, ORDER_STATUSES } = require('../config/constants');

const transactionSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Transaction must reference a listing']
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must reference a buyer/proposer']
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must reference a seller/recipient']
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, 'Transaction type is required']
    },
    exchangeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.PENDING
    },
    deliveryAddress: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      default: ''
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Card', 'NetBanking', 'COD', 'Barter', 'Barter+Cash'],
      default: 'UPI'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cod', 'failed'],
      default: 'paid'
    },
    paymentReference: {
      type: String,
      default: ''
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    protectionFee: {
      type: Number,
      default: 0,
      min: 0
    },
    cashTopUp: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    loyaltyPointsUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    loyaltyPointsDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    isSwapPurchase: {
      type: Boolean,
      default: false
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Order Placed'
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
          enum: ORDER_STATUSES
        },
        note: {
          type: String,
          default: ''
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    ],
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null
    },
    swapRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwapRequest',
      default: null
    },
    trackingNumber: {
      type: String,
      default: ''
    },
    shipments: [
      {
        shipmentLabel: {
          type: String,
          default: 'Shipment 1'
        },
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Listing',
          required: true
        },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        receiver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        trackingNumber: {
          type: String,
          required: true
        },
        pickupAddress: {
          type: String,
          default: ''
        },
        deliveryAddress: {
          type: String,
          default: ''
        },
        status: {
          type: String,
          enum: ORDER_STATUSES,
          default: 'Confirmed'
        },
        statusHistory: [
          {
            status: {
              type: String,
              required: true,
              enum: ORDER_STATUSES
            },
            note: {
              type: String,
              default: ''
            },
            updatedAt: {
              type: Date,
              default: Date.now
            },
            updatedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User'
            }
          }
        ]
      }
    ],
    estimatedDelivery: {
      type: Date
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    responseNote: {
      type: String,
      maxlength: [500, 'Response note cannot exceed 500 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);


transactionSchema.index({ listingId: 1, buyerId: 1, sellerId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
