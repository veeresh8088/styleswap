const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    points: {
      type: Number,
      required: true,
      min: 1
    },
    amountEquivalent: {
      type: Number, // 10 points = ₹100 => amount = points * 10
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      enum: ['welcome_bonus', 'order_discount', 'item_swap_bonus', 'admin_adjustment'],
      default: 'welcome_bonus'
    },
    description: {
      type: String,
      default: ''
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
