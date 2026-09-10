const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Listing = require('../models/Listing');
const Offer = require('../models/Offer');
const SwapRequest = require('../models/SwapRequest');
const Transaction = require('../models/Transaction');

// Helper to synchronize live offer and swap statuses onto conversation messages
async function syncConversationMessages(conversation) {
  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return conversation;
  }

  let modified = false;

  for (const msg of conversation.messages) {
    // 1. Detect and sync Offer messages
    const isOfferText = typeof msg.text === 'string' && (
      msg.text.includes('Price Offer') || 
      msg.text.includes('Offer Accepted') || 
      msg.text.includes('Offer Declined') || 
      msg.text.includes('Offer Closed')
    );
    if (msg.type === 'offer' || isOfferText) {
      if (msg.type !== 'offer') {
        msg.type = 'offer';
        modified = true;
      }

      // Try finding the referenced or matching offer
      let offer = null;
      const candidateOfferId = msg.offerId || (msg.metadata && msg.metadata.offerId);
      if (candidateOfferId && mongoose.Types.ObjectId.isValid(candidateOfferId)) {
        offer = await Offer.findById(candidateOfferId);
      }
      if (!offer && conversation.listingId) {
        const listingId = conversation.listingId._id || conversation.listingId;
        const buyerId = conversation.buyerId?._id || conversation.buyerId;
        const sellerId = conversation.sellerId?._id || conversation.sellerId;
        offer = (await Offer.findOne({ listingId, buyerId }).sort({ createdAt: -1 })) ||
                (await Offer.findOne({ listingId, sellerId }).sort({ createdAt: -1 })) ||
                (await Offer.findOne({ listingId }).sort({ createdAt: -1 }));
      }

      if (offer) {
        if (!msg.offerId || msg.offerId.toString() !== offer._id.toString()) {
          msg.offerId = offer._id;
          modified = true;
        }
        const rawStatus = (offer.status || '').toLowerCase();
        const liveStatus = rawStatus === 'accepted' ? 'accepted' : (rawStatus === 'rejected' || rawStatus === 'cancelled' ? 'rejected' : 'pending');
        if (msg.actionStatus !== liveStatus) {
          msg.actionStatus = liveStatus;
          modified = true;
        }
        if (!msg.metadata) msg.metadata = {};
        if (!msg.metadata.offeredPrice && offer.offeredPrice) {
          msg.metadata.offeredPrice = offer.offeredPrice;
          modified = true;
        }
        const targetListingId = (conversation.listingId && conversation.listingId._id) ? conversation.listingId._id : conversation.listingId;
        if (!msg.metadata.checkoutUrl && targetListingId) {
          msg.metadata.checkoutUrl = `/checkout/${targetListingId}`;
          modified = true;
        }
      }
    }

    // 2. Detect and sync Swap messages
    const isSwapText = typeof msg.text === 'string' && (
      msg.text.includes('Swap Proposal') || 
      msg.text.includes('Swap Accepted') || 
      msg.text.includes('Swap Declined') || 
      msg.text.includes('Swap Closed') ||
      msg.text.includes('Wardrobe Swap')
    );
    if (msg.type === 'swap' || isSwapText) {
      if (msg.type !== 'swap') {
        msg.type = 'swap';
        modified = true;
      }

      let swapObj = null;
      const candidateSwapId = msg.swapId || (msg.metadata && msg.metadata.swapId);
      if (candidateSwapId && mongoose.Types.ObjectId.isValid(candidateSwapId)) {
        swapObj = (await SwapRequest.findById(candidateSwapId).populate('targetListingId offeredListingId proposerId receiverId')) ||
                  (await Transaction.findById(candidateSwapId).populate('listingId exchangeItemId buyerId sellerId shipments.item'));
      }

      if (!swapObj && conversation.listingId) {
        const listingId = conversation.listingId._id || conversation.listingId;
        const buyerId = conversation.buyerId?._id || conversation.buyerId;
        const sellerId = conversation.sellerId?._id || conversation.sellerId;

        swapObj = await SwapRequest.findOne({
          $or: [
            { targetListingId: listingId, proposerId: buyerId, receiverId: sellerId },
            { targetListingId: listingId, proposerId: sellerId, receiverId: buyerId },
            { offeredListingId: listingId, proposerId: buyerId, receiverId: sellerId },
            { offeredListingId: listingId, proposerId: sellerId, receiverId: buyerId },
            { targetListingId: listingId },
            { offeredListingId: listingId }
          ]
        }).populate('targetListingId offeredListingId proposerId receiverId').sort({ createdAt: -1 });

        if (!swapObj) {
          swapObj = await Transaction.findOne({
            type: 'exchange',
            $or: [
              { listingId, buyerId, sellerId },
              { listingId, buyerId: sellerId, sellerId: buyerId },
              { exchangeItemId: listingId, buyerId, sellerId },
              { exchangeItemId: listingId, buyerId: sellerId, sellerId: buyerId },
              { listingId },
              { exchangeItemId: listingId }
            ]
          }).populate('listingId exchangeItemId buyerId sellerId shipments.item').sort({ createdAt: -1 });
        }
      }

      if (swapObj) {
        if (!msg.swapId || msg.swapId.toString() !== swapObj._id.toString()) {
          msg.swapId = swapObj._id;
          modified = true;
        }

        const rawStatus = (swapObj.status || '').toLowerCase();
        let liveStatus = 'pending';
        if (rawStatus === 'completed') liveStatus = 'completed';
        else if (rawStatus === 'accepted') liveStatus = 'accepted';
        else if (rawStatus === 'rejected' || rawStatus === 'cancelled') liveStatus = 'rejected';
        else liveStatus = 'pending';

        if (!msg.metadata) msg.metadata = {};

        // Find linked exchange transaction if any
        let tx = null;
        if (swapObj.transactionId) {
          tx = await Transaction.findById(swapObj.transactionId).populate('shipments.item');
        } else if (swapObj.type === 'exchange') {
          tx = swapObj;
        } else {
          tx = await Transaction.findOne({ swapRequestId: swapObj._id }).populate('shipments.item');
        }

        if (tx) {
          if (tx.status === 'completed') {
            liveStatus = 'completed';
          } else if (tx.status === 'accepted') {
            liveStatus = 'accepted';
          }

          if (tx.shipments && tx.shipments.length >= 2) {
            msg.metadata.shipments = tx.shipments.map(s => ({
              label: s.shipmentLabel,
              trackingNumber: s.trackingNumber,
              status: s.status,
              itemTitle: s.item?.title || ''
            }));
            if (tx.shipments[0].status === 'Delivered' && tx.shipments[1].status === 'Delivered') {
              liveStatus = 'completed';
            }
            modified = true;
          }

          msg.metadata.transactionId = tx._id.toString();
          if (tx.trackingNumber) {
            msg.metadata.trackingNumber = tx.trackingNumber;
          }
          modified = true;
        }

        if (msg.actionStatus !== liveStatus) {
          msg.actionStatus = liveStatus;
          modified = true;
        }

        msg.metadata.status = liveStatus;
        msg.metadata.swapId = swapObj._id.toString();

        const proposerId = swapObj.proposerId?._id || swapObj.proposerId || swapObj.buyerId?._id || swapObj.buyerId;
        const receiverId = swapObj.receiverId?._id || swapObj.receiverId || swapObj.sellerId?._id || swapObj.sellerId;
        if (proposerId) msg.metadata.proposerId = proposerId.toString();
        if (receiverId) msg.metadata.receiverId = receiverId.toString();

        const targetListing = swapObj.targetListingId || swapObj.listingId;
        const offeredListing = swapObj.offeredListingId || swapObj.exchangeItemId;
        if (targetListing) {
          msg.metadata.targetListingId = (targetListing._id || targetListing).toString();
          msg.metadata.targetItemTitle = targetListing.title || msg.metadata.targetItemTitle || 'Product B';
        }
        if (offeredListing) {
          msg.metadata.offeredListingId = (offeredListing._id || offeredListing).toString();
          msg.metadata.offeredItemTitle = offeredListing.title || msg.metadata.offeredItemTitle || 'Product A';
        }
        if (typeof swapObj.cashTopUp === 'number') {
          msg.metadata.cashTopUp = swapObj.cashTopUp;
        }
      }
    }
  }

  if (modified && typeof conversation.save === 'function') {
    try {
      if (typeof conversation.markModified === 'function') {
        conversation.markModified('messages');
      }
      await conversation.save();
    } catch (e) {
      // Ignore background save errors
    }
  }

  return conversation;
}

// @desc Get Active Conversation directly by conversationId
exports.getActiveConversation = async (req, res, next) => {
  try {
    const conversationId = req.query.conversationId || req.params.conversationId;
    if (!conversationId || conversationId === 'undefined' || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('buyerId', 'name profileImage email')
      .populate('sellerId', 'name profileImage email')
      .populate('listingId', 'title price images status');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const currentUserId = req.user._id.toString();
    const buyerId = (conversation.buyerId?._id || conversation.buyerId || '').toString();
    const sellerId = (conversation.sellerId?._id || conversation.sellerId || '').toString();

    const isAdmin = req.user.role === 'admin';

    if (buyerId !== currentUserId && sellerId !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this conversation' });
    }

    await syncConversationMessages(conversation);

    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get or Start Conversation for a Listing
exports.getOrCreateConversation = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    if (listingId === 'active' || listingId === 'undefined') {
      return exports.getActiveConversation(req, res, next);
    }

    const { conversationId } = req.query;

    // Prioritize explicitly requested conversationId if valid
    if (conversationId && conversationId !== 'undefined' && mongoose.Types.ObjectId.isValid(conversationId)) {
      const conv = await Conversation.findById(conversationId)
        .populate('buyerId', 'name profileImage email')
        .populate('sellerId', 'name profileImage email')
        .populate('listingId', 'title price images status');
      if (conv) {
        await syncConversationMessages(conv);
        return res.status(200).json({ success: true, data: conv });
      }
    }

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID provided' });
    }

    const listing = await Listing.findById(listingId).populate('sellerId', 'name profileImage');
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const currentUserId = req.user._id;
    const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    if (!sellerId) {
      return res.status(400).json({ success: false, message: 'Seller information unavailable for this listing' });
    }

    const isSeller = currentUserId.toString() === sellerId.toString();
    let conversation;

    if (isSeller) {
      conversation = await Conversation.findOne({
        listingId: listing._id,
        sellerId: currentUserId
      })
        .populate('buyerId', 'name profileImage email')
        .populate('sellerId', 'name profileImage email')
        .populate('listingId', 'title price images status')
        .sort({ lastMessageAt: -1 });

      if (!conversation) {
        return res.status(200).json({
          success: true,
          data: {
            listingId: listing,
            messages: []
          }
        });
      }
    } else {
      conversation = await Conversation.findOne({
        listingId: listing._id,
        buyerId: currentUserId,
        sellerId
      })
        .populate('buyerId', 'name profileImage email')
        .populate('sellerId', 'name profileImage email')
        .populate('listingId', 'title price images status');

      if (!conversation) {
        conversation = await Conversation.create({
          listingId: listing._id,
          buyerId: currentUserId,
          sellerId,
          messages: []
        });

        conversation = await Conversation.findById(conversation._id)
          .populate('buyerId', 'name profileImage email')
          .populate('sellerId', 'name profileImage email')
          .populate('listingId', 'title price images status');
      }
    }

    await syncConversationMessages(conversation);

    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};

// @desc Send Message in Conversation
exports.sendMessage = async (req, res, next) => {
  try {
    let { listingId, text, conversationId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    if (listingId === 'undefined' || listingId === 'null' || !listingId) listingId = null;
    if (conversationId === 'undefined' || conversationId === 'null' || !conversationId) conversationId = null;

    const currentUserId = req.user._id.toString();
    let conversation;

    // 1. Try finding by conversationId if provided and valid
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findById(conversationId);
    }

    // 2. Try finding by listingId if provided and valid
    if (!conversation && listingId && listingId !== 'active' && mongoose.Types.ObjectId.isValid(listingId)) {
      const listing = await Listing.findById(listingId);
      if (listing) {
        const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId).toString() : null;
        if (sellerId) {
          const isSeller = sellerId === currentUserId;
          if (isSeller) {
            conversation = await Conversation.findOne({
              listingId: listing._id,
              sellerId: req.user._id
            }).sort({ lastMessageAt: -1 });
          } else {
            conversation = await Conversation.findOne({
              listingId: listing._id,
              buyerId: req.user._id,
              sellerId
            });

            if (!conversation) {
              conversation = await Conversation.create({
                listingId: listing._id,
                buyerId: req.user._id,
                sellerId,
                messages: []
              });
            }
          }
        }
      }
    }

    // 3. Fallback: Find user's latest conversation if neither was found
    if (!conversation) {
      conversation = await Conversation.findOne({
        $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }]
      }).sort({ lastMessageAt: -1 });
    }

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found. Please select an item to chat about.' });
    }

    // Security: Only buyer or seller can post
    const buyerId = (conversation.buyerId?._id || conversation.buyerId || '').toString();
    const sellerId = (conversation.sellerId?._id || conversation.sellerId || '').toString();

    if (buyerId !== currentUserId && sellerId !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to post in this conversation' });
    }

    const newMessage = {
      sender: req.user._id,
      text: text.trim(),
      type: 'text',
      actionStatus: 'none',
      metadata: {},
      createdAt: new Date(),
      read: false
    };

    conversation.messages.push(newMessage);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: newMessage,
        conversationId: conversation._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get All User Conversations (Messages Inbox)
exports.getUserConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ buyerId: userId }, { sellerId: userId }] };

    const conversations = await Conversation.find(filter)
      .populate('listingId', 'title price images status')
      .populate('buyerId', 'name profileImage')
      .populate('sellerId', 'name profileImage')
      .sort({ lastMessageAt: -1 });

    if (conversations && conversations.length > 0) {
      await Promise.all(conversations.map(c => syncConversationMessages(c)));
    }

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, data: conversations });
    }

    res.render('pages/user/messages', {
      title: 'Messages & Inquiries - Styleswap',
      conversations,
      activeConversationId: req.query.conversationId || (conversations.length > 0 ? conversations[0]._id.toString() : null)
    });
  } catch (error) {
    next(error);
  }
};

// @desc Open or Start Conversation for a Listing and render Message Page
exports.openConversationForListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const listing = await Listing.findById(listingId).populate('sellerId', 'name profileImage');
    
    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/messages');
    }

    const buyerId = req.user._id;
    const sellerId = listing.sellerId ? listing.sellerId._id : null;

    if (!sellerId) {
      req.flash('error', 'Seller profile unavailable.');
      return res.redirect('/messages');
    }

    if (buyerId.toString() === sellerId.toString()) {
      req.flash('info', 'This is your own listing.');
      return res.redirect('/messages');
    }

    let conversation = await Conversation.findOne({
      listingId: listing._id,
      buyerId,
      sellerId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        listingId: listing._id,
        buyerId,
        sellerId,
        messages: []
      });
    }

    return res.redirect(`/messages?conversationId=${conversation._id}`);
  } catch (error) {
    next(error);
  }
};

