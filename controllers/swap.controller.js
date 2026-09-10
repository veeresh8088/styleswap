const mongoose = require('mongoose');
const SwapRequest = require('../models/SwapRequest');
const Listing = require('../models/Listing');
const Transaction = require('../models/Transaction');
const Conversation = require('../models/Conversation');
const {
  SWAP_REQUEST_STATUS,
  LISTING_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  ORDER_STATUSES
} = require('../config/constants');

function formatUserAddress(user) {
  if (!user) return 'Verified Member Address, India';
  if (user.formattedAddress) return user.formattedAddress;
  if (user.address) {
    const parts = [
      user.address.street,
      user.address.city,
      user.address.province,
      user.address.postalCode,
      user.address.country
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }
  return 'Verified Member Address, India';
}

// Helper to push notification message into Conversation
async function sendSwapNotificationMessage(listingId, buyerId, sellerId, senderId, text, options = {}) {
  try {
    let conversation = await Conversation.findOne({
      listingId,
      buyerId,
      sellerId
    });
    if (!conversation) {
      conversation = await Conversation.findOne({
        listingId,
        $or: [
          { buyerId, sellerId },
          { buyerId: sellerId, sellerId: buyerId }
        ]
      });
    }
    if (!conversation) {
      conversation = await Conversation.create({
        listingId,
        buyerId,
        sellerId,
        messages: []
      });
    }

    const {
      type = 'swap',
      swapId = null,
      actionStatus = 'none',
      metadata = {}
    } = options;

    // Update previous pending swap messages in this conversation if an action response is sent
    if (swapId && (actionStatus === 'accepted' || actionStatus === 'rejected')) {
      conversation.messages.forEach(msg => {
        if (
          (msg.swapId && msg.swapId.toString() === swapId.toString()) ||
          (msg.type === 'swap' && (msg.actionStatus === 'pending' || !msg.actionStatus || msg.actionStatus === 'none'))
        ) {
          msg.actionStatus = actionStatus;
          if (metadata && Object.keys(metadata).length > 0) {
            msg.metadata = { ...(msg.metadata || {}), ...metadata, status: actionStatus };
          }
        }
      });
      if (typeof conversation.markModified === 'function') {
        conversation.markModified('messages');
      }
    }

    conversation.messages.push({
      sender: senderId,
      text,
      type,
      swapId,
      actionStatus,
      metadata: { ...metadata, status: actionStatus },
      createdAt: new Date(),
      read: false
    });
    conversation.lastMessageAt = new Date();
    if (typeof conversation.markModified === 'function') {
      conversation.markModified('messages');
    }
    await conversation.save();

    // Also update any other conversations between buyer and seller referencing this swap
    if (swapId && (actionStatus === 'accepted' || actionStatus === 'rejected')) {
      const otherConversations = await Conversation.find({
        _id: { $ne: conversation._id },
        $or: [
          { buyerId, sellerId },
          { buyerId: sellerId, sellerId: buyerId }
        ]
      });
      for (const otherConv of otherConversations) {
        let changed = false;
        otherConv.messages.forEach(msg => {
          if (
            (msg.swapId && swapId && msg.swapId.toString() === swapId.toString()) ||
            (msg.type === 'swap' && (msg.actionStatus === 'pending' || !msg.actionStatus || msg.actionStatus === 'none'))
          ) {
            msg.actionStatus = actionStatus;
            if (metadata && Object.keys(metadata).length > 0) {
              msg.metadata = { ...(msg.metadata || {}), ...metadata, status: actionStatus };
            }
            changed = true;
          }
        });
        if (changed) {
          if (typeof otherConv.markModified === 'function') {
            otherConv.markModified('messages');
          }
          await otherConv.save();
        }
      }
    }

    return conversation;
  } catch (err) {
    console.error('Failed to append chat notification for swap:', err.message);
  }
}

// @desc Propose Item Swap / Barter
exports.proposeSwap = async (req, res, next) => {
  try {
    const { targetListingId, offeredListingId, cashTopUp, notes } = req.body;

    if (!targetListingId || !offeredListingId) {
      return res.status(400).json({ success: false, message: 'Please specify both the target item and your offered item' });
    }

    if (targetListingId.toString() === offeredListingId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot swap an item with itself' });
    }

    const targetListing = await Listing.findById(targetListingId).populate('sellerId', 'name email');
    if (!targetListing) {
      return res.status(404).json({ success: false, message: 'Target listing not found' });
    }

    if (targetListing.sellerId._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot propose a swap on your own listing' });
    }

    if (targetListing.status !== LISTING_STATUS.APPROVED) {
      return res.status(400).json({ success: false, message: 'Target item is not available for exchange' });
    }

    // Verify proposer owns the offered item and it is approved
    const offeredListing = await Listing.findOne({
      _id: offeredListingId,
      sellerId: req.user._id,
      status: { $in: [LISTING_STATUS.APPROVED, LISTING_STATUS.PENDING] }
    });

    if (!offeredListing) {
      return res.status(400).json({
        success: false,
        message: 'The offered item must be an active listing from your own wardrobe'
      });
    }

    // Check if an identical active swap proposal already exists
    const existingActive = await SwapRequest.findOne({
      targetListingId,
      offeredListingId,
      status: { $in: [SWAP_REQUEST_STATUS.PENDING, SWAP_REQUEST_STATUS.COUNTERED] }
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'A swap proposal for this item pair is already actively pending'
      });
    }

    const cashDiff = Math.max(0, Number(cashTopUp) || 0);

    const swapRequest = await SwapRequest.create({
      targetListingId,
      offeredListingId,
      proposerId: req.user._id,
      receiverId: targetListing.sellerId._id,
      cashTopUp: cashDiff,
      notes: (notes || '').trim(),
      status: SWAP_REQUEST_STATUS.PENDING
    });

    // Send swap proposal notification in chat
    const topUpText = cashDiff > 0 ? ` + ₹${cashDiff.toLocaleString('en-IN')} cash top-up` : '';
    await sendSwapNotificationMessage(
      targetListing._id,
      req.user._id,
      targetListing.sellerId._id,
      req.user._id,
      `🔄 Wardrobe Swap Proposal: I offered "${offeredListing.title}" (₹${offeredListing.price || 0}) in exchange for "${targetListing.title}"${topUpText}.${notes ? `\n"${notes.trim()}"` : ''}`,
      {
        type: 'swap',
        swapId: swapRequest._id,
        actionStatus: 'pending',
        metadata: {
          swapId: swapRequest._id,
          proposerId: req.user._id,
          receiverId: targetListing.sellerId._id,
          offeredListingId: offeredListing._id,
          offeredItemTitle: offeredListing.title,
          offeredItemPrice: offeredListing.price || 0,
          targetItemTitle: targetListing.title,
          targetListingId: targetListing._id,
          cashTopUp: cashDiff,
          note: notes ? notes.trim() : '',
          status: 'pending'
        }
      }
    );

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({
        success: true,
        message: 'Swap proposal submitted successfully to the owner!',
        data: swapRequest
      });
    }

    req.flash('success', `Your swap proposal for "${targetListing.title}" has been sent!`);
    res.redirect(`/listings/${targetListing._id}`);
  } catch (error) {
    next(error);
  }
};

// Helper to check if request strictly expects JSON (vs browser HTML form submission)
const isJsonRequest = (req) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) return false;
  return Boolean(req.xhr || req.is('json') || accept.includes('application/json') || req.originalUrl.startsWith('/api/'));
};

// @desc Seller Respond to Swap Request (Accept, Reject, or Counter Offer)
exports.respondToSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    let action = (req.params.action || req.body?.action || '').toLowerCase().trim();
    const responseNote = req.body?.responseNote || req.body?.note || '';
    const counterListingId = req.body?.counterListingId;
    const counterCashTopUp = req.body?.counterCashTopUp;
    const counterNote = req.body?.counterNote;
    const wantsJson = isJsonRequest(req);

    if (action === 'decline') action = 'reject';

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Invalid swap request ID' });
      }
      req.flash('error', 'Invalid swap proposal ID');
      return res.redirect('/user/dashboard#exchanges');
    }

    const swapRequest = await SwapRequest.findById(id)
      .populate('targetListingId')
      .populate('offeredListingId')
      .populate('proposerId', 'name email phone address')
      .populate('receiverId', 'name email phone address');

    if (!swapRequest) {
      // Check if this id references an exchange Transaction
      const transaction = await Transaction.findById(id);
      if (transaction && transaction.type === TRANSACTION_TYPES.EXCHANGE) {
        const transactionController = require('./transaction.controller');
        return transactionController.respondToExchange(req, res, next);
      }
      if (wantsJson) {
        return res.status(404).json({ success: false, message: 'Swap request not found' });
      }
      req.flash('error', 'Swap proposal not found');
      return res.redirect('/user/dashboard#exchanges');
    }

    const receiverIdStr = (swapRequest.receiverId?._id || swapRequest.receiverId || '').toString();
    const proposerIdStr = (swapRequest.proposerId?._id || swapRequest.proposerId || '').toString();
    const isReceiver = receiverIdStr === req.user._id.toString();
    const isProposer = proposerIdStr === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // 1. Idempotency & existing state handling (Requirement 4 & 5)
    if (action === 'accept' && (swapRequest.status === SWAP_REQUEST_STATUS.ACCEPTED || swapRequest.status === SWAP_REQUEST_STATUS.COMPLETED)) {
      const existingTx = await Transaction.findOne({ swapRequestId: swapRequest._id }).populate('shipments.item');
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: 'Swap has already been accepted and courier delivery is in progress.',
          data: {
            swapRequest,
            transaction: existingTx,
            status: swapRequest.status
          }
        });
      }
      req.flash('info', 'Swap has already been accepted.');
      return res.redirect('/user/dashboard#exchanges');
    }

    if (swapRequest.status === SWAP_REQUEST_STATUS.REJECTED) {
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: 'This swap proposal has already been declined.',
          data: {
            swapRequest,
            status: 'rejected'
          }
        });
      }
      req.flash('info', 'This swap proposal has already been declined.');
      return res.redirect('/user/dashboard#exchanges');
    }

    // 2. Strict permission checks (Requirement 2 & 4)
    // The acceptance buttons/actions must ONLY be permitted for the actual current owner/receiver of the target listing
    if (action === 'accept' && !isReceiver && !isAdmin) {
      if (wantsJson) {
        return res.status(403).json({ success: false, message: 'Only the item owner can accept this swap proposal' });
      }
      req.flash('error', 'Only the item owner can accept this swap proposal');
      return res.redirect('/user/dashboard#exchanges');
    }

    if ((action === 'reject' || action === 'cancel') && !isReceiver && !isProposer && !isAdmin) {
      if (wantsJson) {
        return res.status(403).json({ success: false, message: 'Unauthorized to respond to this swap proposal' });
      }
      req.flash('error', 'Unauthorized to respond to this swap proposal');
      return res.redirect('/user/dashboard#exchanges');
    }

    if (swapRequest.status !== SWAP_REQUEST_STATUS.PENDING && swapRequest.status !== SWAP_REQUEST_STATUS.COUNTERED) {
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: `This swap proposal is already ${swapRequest.status}`,
          data: { swapRequest, status: swapRequest.status }
        });
      }
      req.flash('info', `This swap proposal is already ${swapRequest.status}`);
      return res.redirect('/user/dashboard#exchanges');
    }

    if (action === 'accept') {
      // 0. Validate both items exist and are eligible for swap
      const targetListing = await Listing.findById(swapRequest.targetListingId?._id || swapRequest.targetListingId);
      const offeredListing = await Listing.findById(swapRequest.offeredListingId?._id || swapRequest.offeredListingId);

      if (!targetListing || !offeredListing) {
        if (wantsJson) {
          return res.status(400).json({ success: false, message: 'One or both items in this swap proposal are no longer available' });
        }
        req.flash('error', 'One or both items are no longer available.');
        return res.redirect('/user/dashboard#exchanges');
      }

      if (targetListing.status !== LISTING_STATUS.APPROVED || offeredListing.status !== LISTING_STATUS.APPROVED) {
        if (wantsJson) {
          return res.status(400).json({ success: false, message: 'One or both items have already been sold or exchanged' });
        }
        req.flash('error', 'One or both items have already been sold or exchanged.');
        return res.redirect('/user/dashboard#exchanges');
      }

      // 1. Lock/Reserve both items as exchanged safely
      if (typeof targetListing.save === 'function') {
        targetListing.status = LISTING_STATUS.EXCHANGED;
        await targetListing.save();
      } else {
        await Listing.findByIdAndUpdate(targetListing._id || targetListing, { status: LISTING_STATUS.EXCHANGED });
      }

      if (typeof offeredListing.save === 'function') {
        offeredListing.status = LISTING_STATUS.EXCHANGED;
        await offeredListing.save();
      } else {
        await Listing.findByIdAndUpdate(offeredListing._id || offeredListing, { status: LISTING_STATUS.EXCHANGED });
      }

      swapRequest.status = SWAP_REQUEST_STATUS.ACCEPTED;
      swapRequest.responseNote = responseNote || 'Swap accepted by seller';

      // 2. Automatically generate the exchange Order/Transaction with TWO physical shipments
      const trackingNumberA = `SWP-A-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const trackingNumberB = `SWP-B-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

      const targetId = swapRequest.targetListingId?._id || swapRequest.targetListingId;
      const offeredId = swapRequest.offeredListingId?._id || swapRequest.offeredListingId;
      const proposerIdObj = swapRequest.proposerId?._id || swapRequest.proposerId;
      const receiverIdObj = swapRequest.receiverId?._id || swapRequest.receiverId;

      const proposerAddress = formatUserAddress(swapRequest.proposerId);
      const receiverAddress = formatUserAddress(swapRequest.receiverId);

      const hasCashTopUp = (swapRequest.cashTopUp || 0) > 0;
      const initialMilestone = hasCashTopUp ? 'Order Placed' : 'Confirmed';

      // Shipment A: Product A (User A / proposer -> User B / receiver)
      const shipmentA = {
        shipmentLabel: 'Shipment A',
        item: offeredId,
        sender: proposerIdObj,
        receiver: receiverIdObj,
        trackingNumber: trackingNumberA,
        pickupAddress: proposerAddress,
        deliveryAddress: receiverAddress,
        status: initialMilestone,
        statusHistory: [
          {
            status: 'Order Placed',
            note: 'Exchange agreed by both parties. Courier scheduled.',
            updatedAt: new Date()
          }
        ]
      };
      if (initialMilestone === 'Confirmed') {
        shipmentA.statusHistory.push({
          status: 'Confirmed',
          note: `Pickup scheduled from ${swapRequest.proposerId?.name || 'User A'}`,
          updatedAt: new Date(),
          updatedBy: req.user._id
        });
      }

      // Shipment B: Product B (User B / receiver -> User A / proposer)
      const shipmentB = {
        shipmentLabel: 'Shipment B',
        item: targetId,
        sender: receiverIdObj,
        receiver: proposerIdObj,
        trackingNumber: trackingNumberB,
        pickupAddress: receiverAddress,
        deliveryAddress: proposerAddress,
        status: initialMilestone,
        statusHistory: [
          {
            status: 'Order Placed',
            note: 'Exchange agreed by both parties. Courier scheduled.',
            updatedAt: new Date()
          }
        ]
      };
      if (initialMilestone === 'Confirmed') {
        shipmentB.statusHistory.push({
          status: 'Confirmed',
          note: `Pickup scheduled from ${swapRequest.receiverId?.name || 'User B'}`,
          updatedAt: new Date(),
          updatedBy: req.user._id
        });
      }

      const transaction = await Transaction.create({
        listingId: targetId,
        exchangeItemId: offeredId,
        buyerId: proposerIdObj,
        sellerId: receiverIdObj,
        type: TRANSACTION_TYPES.EXCHANGE,
        amount: swapRequest.cashTopUp || 0,
        cashTopUp: swapRequest.cashTopUp || 0,
        shippingFee: 99,
        protectionFee: 29,
        totalPaid: (swapRequest.cashTopUp || 0) + 99 + 29,
        paymentMethod: hasCashTopUp ? 'Barter+Cash' : 'Barter',
        paymentStatus: hasCashTopUp ? 'pending' : 'paid',
        status: hasCashTopUp ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.ACCEPTED,
        orderStatus: initialMilestone,
        statusHistory: [
          {
            status: 'Order Placed',
            note: 'Exchange proposal agreed by both parties',
            updatedAt: new Date()
          },
          {
            status: initialMilestone,
            note: hasCashTopUp ? 'Awaiting buyer cash top-up payment' : 'Swap accepted. 2-way courier delivery in progress.',
            updatedAt: new Date(),
            updatedBy: req.user._id
          }
        ],
        trackingNumber: `${trackingNumberA} / ${trackingNumberB}`,
        shipments: [shipmentA, shipmentB],
        estimatedDelivery,
        swapRequestId: swapRequest._id,
        deliveryAddress: proposerAddress
      });

      swapRequest.transactionId = transaction._id;
      await swapRequest.save();

      // Send chat notification for accepted swap
      const offeredTitle = swapRequest.offeredListingId?.title || 'Offered Item';
      const targetTitle = swapRequest.targetListingId?.title || 'Item';
      await sendSwapNotificationMessage(
        targetId,
        proposerIdObj,
        receiverIdObj,
        req.user._id,
        `✅ Swap Proposal Accepted! The wardrobe swap exchanging "${offeredTitle}" for "${targetTitle}" has been confirmed by the owner.\n📦 2-Way Courier Scheduled:\n• Shipment A (${offeredTitle}): ${trackingNumberA}\n• Shipment B (${targetTitle}): ${trackingNumberB}`,
        {
          type: 'swap',
          swapId: swapRequest._id,
          actionStatus: 'accepted',
          metadata: {
            offeredItemTitle: offeredTitle,
            targetItemTitle: targetTitle,
            targetListingId: targetId,
            trackingNumber: `${trackingNumberA} / ${trackingNumberB}`,
            transactionId: transaction._id,
            shipments: [
              { label: 'Shipment A', trackingNumber: trackingNumberA, status: initialMilestone, itemTitle: offeredTitle },
              { label: 'Shipment B', trackingNumber: trackingNumberB, status: initialMilestone, itemTitle: targetTitle }
            ]
          }
        }
      );

      // 3. Reject other pending proposals for both items
      if (targetId && offeredId) {
        await SwapRequest.updateMany(
          {
            _id: { $ne: swapRequest._id },
            status: SWAP_REQUEST_STATUS.PENDING,
            $or: [
              { targetListingId: targetId },
              { offeredListingId: targetId },
              { targetListingId: offeredId },
              { offeredListingId: offeredId }
            ]
          },
          {
            $set: {
              status: SWAP_REQUEST_STATUS.REJECTED,
              responseNote: 'Item exchanged in another confirmed swap.'
            }
          }
        );
      }

      const acceptMsg = 'Swap accepted! Both items are reserved and an exchange order has been initiated in courier tracking.';
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: acceptMsg,
          data: { swapRequest, transactionId: transaction._id }
        });
      }
      req.flash('success', acceptMsg);
      return res.redirect('/user/dashboard#exchanges');

    } else if (action === 'reject' || action === 'cancel') {
      swapRequest.status = SWAP_REQUEST_STATUS.REJECTED;
      swapRequest.responseNote = responseNote || (isProposer ? 'Swap proposal withdrawn by proposer' : 'Swap declined by seller');
      await swapRequest.save();

      const targetId = swapRequest.targetListingId?._id || swapRequest.targetListingId;
      const targetTitle = swapRequest.targetListingId?.title || 'Item';
      const proposerIdObj = swapRequest.proposerId?._id || swapRequest.proposerId;
      const receiverIdObj = swapRequest.receiverId?._id || swapRequest.receiverId;

      // Send chat notification for declined swap
      await sendSwapNotificationMessage(
        targetId,
        proposerIdObj,
        receiverIdObj,
        req.user._id,
        `❌ Swap Proposal Closed: The swap proposal for "${targetTitle}" was ${isProposer ? 'withdrawn/cancelled by the proposer' : 'declined by the owner'}.${responseNote ? `\nNote: ${responseNote}` : ''}`,
        {
          type: 'swap',
          swapId: swapRequest._id,
          actionStatus: 'rejected',
          metadata: {
            targetItemTitle: targetTitle,
            targetListingId: targetId,
            note: responseNote || ''
          }
        }
      );

      const closeMsg = isProposer ? 'Swap proposal withdrawn.' : 'Swap proposal declined.';
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: closeMsg,
          data: swapRequest
        });
      }
      req.flash('info', closeMsg);
      return res.redirect('/user/dashboard#exchanges');

    } else if (action === 'counter') {
      swapRequest.status = SWAP_REQUEST_STATUS.COUNTERED;
      swapRequest.counterOffer = {
        counterListingId: counterListingId || null,
        counterCashTopUp: Math.max(0, Number(counterCashTopUp) || 0),
        note: counterNote || responseNote || '',
        createdAt: new Date()
      };
      await swapRequest.save();

      const counterMsg = 'Counter offer sent to proposer!';
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: counterMsg,
          data: swapRequest
        });
      }
      req.flash('success', counterMsg);
      return res.redirect('/user/dashboard#exchanges');
    } else {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Invalid action. Choose accept, reject, or counter.' });
      }
      req.flash('error', 'Invalid action. Choose accept, reject, or counter.');
      return res.redirect('/user/dashboard#exchanges');
    }
  } catch (error) {
    next(error);
  }
};

// @desc Proposer Respond to Counter Offer (Accept or Decline)
exports.respondToCounter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const swapRequest = await SwapRequest.findById(id)
      .populate('targetListingId')
      .populate('offeredListingId')
      .populate('proposerId')
      .populate('receiverId');

    if (!swapRequest) {
      return res.status(404).json({ success: false, message: 'Swap request not found' });
    }

    if (swapRequest.proposerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (swapRequest.status !== SWAP_REQUEST_STATUS.COUNTERED) {
      return res.status(400).json({ success: false, message: 'Swap request does not have an active counter offer' });
    }

    if (action === 'accept') {
      // If seller requested a different item from proposer's wardrobe
      if (swapRequest.counterOffer.counterListingId) {
        swapRequest.offeredListingId = swapRequest.counterOffer.counterListingId;
      }
      if (swapRequest.counterOffer.counterCashTopUp) {
        swapRequest.cashTopUp = swapRequest.counterOffer.counterCashTopUp;
      }

      swapRequest.targetListingId.status = LISTING_STATUS.EXCHANGED;
      await swapRequest.targetListingId.save();

      const chosenOfferedListing = await Listing.findById(swapRequest.offeredListingId);
      if (chosenOfferedListing) {
        chosenOfferedListing.status = LISTING_STATUS.EXCHANGED;
        await chosenOfferedListing.save();
      }

      swapRequest.status = SWAP_REQUEST_STATUS.ACCEPTED;

      const trackingNumber = `SWP-DLV-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

      const transaction = await Transaction.create({
        listingId: swapRequest.targetListingId._id,
        exchangeItemId: swapRequest.offeredListingId,
        buyerId: swapRequest.proposerId._id,
        sellerId: swapRequest.receiverId._id,
        type: TRANSACTION_TYPES.EXCHANGE,
        amount: swapRequest.cashTopUp || 0,
        cashTopUp: swapRequest.cashTopUp || 0,
        shippingFee: 99,
        protectionFee: 29,
        totalPaid: (swapRequest.cashTopUp || 0) + 99 + 29,
        paymentMethod: swapRequest.cashTopUp > 0 ? 'Barter+Cash' : 'Barter',
        paymentStatus: 'paid',
        status: TRANSACTION_STATUS.COMPLETED,
        orderStatus: 'Confirmed',
        statusHistory: [
          { status: 'Order Placed', note: 'Counter offer accepted', updatedAt: new Date() },
          { status: 'Confirmed', note: 'Courier scheduled for two-way swap', updatedAt: new Date(), updatedBy: req.user._id }
        ],
        trackingNumber,
        estimatedDelivery,
        swapRequestId: swapRequest._id,
        deliveryAddress: swapRequest.proposerId.formattedAddress || 'Customer Address'
      });

      swapRequest.transactionId = transaction._id;
      await swapRequest.save();

      return res.status(200).json({
        success: true,
        message: 'Counter offer accepted! Exchange order initiated.',
        data: { swapRequest, transactionId: transaction._id }
      });
    } else {
      swapRequest.status = SWAP_REQUEST_STATUS.REJECTED;
      await swapRequest.save();

      return res.status(200).json({
        success: true,
        message: 'Counter offer declined.',
        data: swapRequest
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc Get Active Swaps for Current User (Incoming & Outgoing)
exports.getUserSwaps = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const incoming = await SwapRequest.find({ receiverId: userId })
      .populate('targetListingId')
      .populate('offeredListingId')
      .populate('proposerId', 'name profileImage phone email')
      .sort({ createdAt: -1 });

    const outgoing = await SwapRequest.find({ proposerId: userId })
      .populate('targetListingId')
      .populate('offeredListingId')
      .populate('receiverId', 'name profileImage phone email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { incoming, outgoing }
    });
  } catch (error) {
    next(error);
  }
};
