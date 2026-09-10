const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    type: {
      type: String,
      enum: ['text', 'offer', 'swap', 'system'],
      default: 'text'
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null
    },
    swapId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    actionStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered', 'none'],
      default: 'none'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Conversation must link to a product listing']
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Conversation must have a buyer']
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Conversation must have a seller']
    },
    messages: [messageSchema],
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ listingId: 1, buyerId: 1, sellerId: 1 }, { unique: true });
conversationSchema.index({ buyerId: 1, lastMessageAt: -1 });
conversationSchema.index({ sellerId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
