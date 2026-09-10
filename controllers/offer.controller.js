const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
const Conversation = require('../models/Conversation');
const { OFFER_STATUS, LISTING_STATUS } = require('../config/constants');

// Helper to check if request strictly expects JSON (vs browser HTML form submission)
const isJsonRequest = (req) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) return false;
  return Boolean(req.xhr || req.is('json') || accept.includes('application/json'));
};

// Helper to push notification message into Conversation
async function sendOfferNotificationMessage(listingId, buyerId, sellerId, senderId, text, options = {}) {
  try {
    let conversation = await Conversation.findOne({
      listingId,
      buyerId,
      sellerId
    });
    if (!conversation) {
      conversation = await Conversation.create({
        listingId,
        buyerId,
        sellerId,
        messages: []
      });
    }

    const {
      type = 'offer',
      offerId = null,
      actionStatus = 'none',
      metadata = {}
    } = options;

    // If an action update occurs, update previous pending offer messages in this conversation
    if (offerId && (actionStatus === 'accepted' || actionStatus === 'rejected')) {
      conversation.messages.forEach(msg => {
        if (
          (msg.offerId && msg.offerId.toString() === offerId.toString()) ||
          (msg.type === 'offer' && msg.actionStatus === 'pending')
        ) {
          msg.actionStatus = actionStatus;
        }
      });
    }

    conversation.messages.push({
      sender: senderId,
      text,
      type,
      offerId,
      actionStatus,
      metadata,
      createdAt: new Date(),
      read: false
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    return conversation;
  } catch (err) {
    console.error('Failed to append chat notification for offer:', err.message);
  }
}

// @desc Submit Price Offer on a Listing
exports.createOffer = async (req, res, next) => {
  try {
    const listingId = req.body.listingId || req.params.id;
    const { offeredPrice, message } = req.body;
    const wantsJson = isJsonRequest(req);

    const listing = await Listing.findById(listingId);
    if (!listing) {
      if (wantsJson) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found');
      return res.redirect('/listings');
    }

    const buyerId = req.user._id;
    const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;

    if (!sellerId) {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Seller information unavailable for this listing' });
      }
      req.flash('error', 'Seller information unavailable for this listing');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (buyerId.toString() === sellerId.toString()) {
      const msg = 'You cannot make an offer on your own listing';
      if (wantsJson) {
        return res.status(400).json({ success: false, message: msg });
      }
      req.flash('error', msg);
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      const msg = 'This item is no longer available for offers';
      if (wantsJson) {
        return res.status(400).json({ success: false, message: msg });
      }
      req.flash('error', msg);
      return res.redirect(`/listings/${listing._id}`);
    }

    const priceNum = Number(offeredPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      const msg = 'Please enter a valid offer price in ₹ (Rupees)';
      if (wantsJson) {
        return res.status(400).json({ success: false, message: msg });
      }
      req.flash('error', msg);
      return res.redirect(`/listings/${listing._id}/offer`);
    }

    // Check if an accepted offer already exists for this listing
    const acceptedOffer = await Offer.findOne({
      listingId: listing._id,
      status: OFFER_STATUS.ACCEPTED
    });
    if (acceptedOffer) {
      const msg = 'An offer for this listing has already been accepted';
      if (wantsJson) {
        return res.status(400).json({ success: false, message: msg });
      }
      req.flash('error', msg);
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check if user already has a pending offer
    const existingPending = await Offer.findOne({
      listingId: listing._id,
      buyerId,
      status: OFFER_STATUS.PENDING
    });

    if (existingPending) {
      // Update existing pending offer
      existingPending.offeredPrice = priceNum;
      existingPending.message = message ? message.trim() : existingPending.message;
      await existingPending.save();

      // Post notification message in conversation
      await sendOfferNotificationMessage(
        listing._id,
        buyerId,
        sellerId,
        buyerId,
        `🏷️ Price Offer Updated: I revised my offer to ₹${priceNum.toLocaleString('en-IN')} for "${listing.title}".${message ? `\n"${message.trim()}"` : ''}`,
        {
          type: 'offer',
          offerId: existingPending._id,
          actionStatus: 'pending',
          metadata: {
            offeredPrice: priceNum,
            originalPrice: listing.price,
            targetItemTitle: listing.title,
            listingId: listing._id,
            note: message ? message.trim() : ''
          }
        }
      );

      const updateMsg = `Your pending offer has been updated to ₹${priceNum.toLocaleString('en-IN')}!`;
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: updateMsg,
          data: existingPending
        });
      }
      req.flash('success', updateMsg);
      return res.redirect(`/listings/${listing._id}`);
    }

    const offer = await Offer.create({
      listingId: listing._id,
      buyerId,
      sellerId,
      offeredPrice: priceNum,
      message: message ? message.trim() : '',
      status: OFFER_STATUS.PENDING
    });

    // Post notification message in conversation
    await sendOfferNotificationMessage(
      listing._id,
      buyerId,
      sellerId,
      buyerId,
      `🏷️ New Price Offer: I submitted an offer of ₹${priceNum.toLocaleString('en-IN')} for "${listing.title}".${message ? `\n"${message.trim()}"` : ''}`,
      {
        type: 'offer',
        offerId: offer._id,
        actionStatus: 'pending',
        metadata: {
          offeredPrice: priceNum,
          originalPrice: listing.price,
          targetItemTitle: listing.title,
          listingId: listing._id,
          note: message ? message.trim() : ''
        }
      }
    );

    const successMsg = `Offer of ₹${priceNum.toLocaleString('en-IN')} sent to the seller!`;
    if (wantsJson) {
      return res.status(201).json({
        success: true,
        message: successMsg,
        data: offer
      });
    }
    req.flash('success', successMsg);
    return res.redirect(`/listings/${listing._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc Respond to Offer (Accept or Reject)
exports.respondToOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    let action = (req.params.action || req.body?.action || '').toLowerCase().trim();
    const note = req.body?.note || req.body?.responseNote || '';
    const wantsJson = isJsonRequest(req);

    if (action === 'decline') action = 'reject';

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Invalid offer ID' });
      }
      req.flash('error', 'Invalid offer ID');
      return res.redirect('/user/dashboard#offers');
    }

    const offer = await Offer.findById(id).populate('listingId').populate('buyerId', 'name email');
    if (!offer) {
      if (wantsJson) {
        return res.status(404).json({ success: false, message: 'Offer not found' });
      }
      req.flash('error', 'Offer not found');
      return res.redirect('/user/dashboard#offers');
    }

    const sellerIdStr = (offer.sellerId?._id || offer.sellerId || '').toString();
    const buyerIdStr = (offer.buyerId?._id || offer.buyerId || '').toString();
    const isSeller = sellerIdStr === req.user._id.toString();
    const isBuyer = buyerIdStr === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (action === 'accept' && !isSeller && !isAdmin) {
      if (wantsJson) {
        return res.status(403).json({ success: false, message: 'Only the listing seller can accept this offer' });
      }
      req.flash('error', 'Only the listing seller can accept this offer');
      return res.redirect('/user/dashboard#offers');
    }

    if ((action === 'reject' || action === 'cancel') && !isSeller && !isBuyer && !isAdmin) {
      if (wantsJson) {
        return res.status(403).json({ success: false, message: 'Unauthorized to respond to this offer' });
      }
      req.flash('error', 'Unauthorized to respond to this offer');
      return res.redirect('/user/dashboard#offers');
    }

    if (offer.status !== OFFER_STATUS.PENDING) {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: `Offer is already ${offer.status}` });
      }
      req.flash('info', `Offer is already ${offer.status}`);
      return res.redirect('/user/dashboard#offers');
    }

    const targetListingId = offer.listingId?._id || offer.listingId;
    const buyerIdObj = offer.buyerId?._id || offer.buyerId;
    const sellerIdObj = offer.sellerId?._id || offer.sellerId;
    const itemTitle = offer.listingId?.title || 'Item';
    const checkoutUrl = targetListingId ? `/checkout/${targetListingId}` : '/checkout';

    if (action === 'accept') {
      if (offer.listingId && offer.listingId.status !== LISTING_STATUS.APPROVED) {
        if (wantsJson) {
          return res.status(400).json({ success: false, message: 'This item is no longer available' });
        }
        req.flash('error', 'This item is no longer available');
        return res.redirect('/user/dashboard#offers');
      }

      offer.status = OFFER_STATUS.ACCEPTED;
      offer.sellerResponseNote = note || 'Offer accepted by seller';
      await offer.save();

      // Reject all other pending offers for this listing to prevent conflicting prices
      if (targetListingId) {
        await Offer.updateMany(
          {
            listingId: targetListingId,
            _id: { $ne: offer._id },
            status: OFFER_STATUS.PENDING
          },
          {
            $set: {
              status: OFFER_STATUS.REJECTED,
              sellerResponseNote: 'Another offer was accepted for this item.'
            }
          }
        );
      }

      // Post acceptance notification message in conversation
      await sendOfferNotificationMessage(
        targetListingId,
        buyerIdObj,
        sellerIdObj,
        req.user._id,
        `✅ Offer Accepted! Your offer of ₹${Number(offer.offeredPrice).toLocaleString('en-IN')} for "${itemTitle}" was accepted by the seller.\n🛒 You can now checkout this item at your accepted offer price: ${checkoutUrl}`,
        {
          type: 'offer',
          offerId: offer._id,
          actionStatus: 'accepted',
          metadata: {
            offeredPrice: offer.offeredPrice,
            originalPrice: offer.listingId?.price || 0,
            targetItemTitle: itemTitle,
            listingId: targetListingId,
            checkoutUrl
          }
        }
      );

      const acceptMsg = `Offer of ₹${Number(offer.offeredPrice).toLocaleString('en-IN')} accepted! Buyer can now complete checkout at this discounted price.`;
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: acceptMsg,
          data: offer
        });
      }
      req.flash('success', acceptMsg);
      return res.redirect('/user/dashboard#offers');
    } else if (action === 'reject' || action === 'cancel') {
      offer.status = OFFER_STATUS.REJECTED;
      offer.sellerResponseNote = note || (isBuyer ? 'Offer cancelled by buyer' : 'Offer declined by seller');
      await offer.save();

      // Post rejection notification message in conversation
      await sendOfferNotificationMessage(
        targetListingId,
        buyerIdObj,
        sellerIdObj,
        req.user._id,
        `❌ Offer Closed: The offer of ₹${Number(offer.offeredPrice).toLocaleString('en-IN')} for "${itemTitle}" was ${isBuyer ? 'withdrawn/cancelled by the buyer' : 'closed/declined by the seller'}.${note ? `\nNote: ${note}` : ''}`,
        {
          type: 'offer',
          offerId: offer._id,
          actionStatus: 'rejected',
          metadata: {
            offeredPrice: offer.offeredPrice,
            targetItemTitle: itemTitle,
            listingId: targetListingId,
            note: note || ''
          }
        }
      );

      const closeMsg = isBuyer ? 'Offer cancelled.' : 'Offer declined.';
      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: closeMsg,
          data: offer
        });
      }
      req.flash('info', closeMsg);
      return res.redirect('/user/dashboard#offers');
    } else {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Invalid action. Choose accept or decline.' });
      }
      req.flash('error', 'Invalid action. Choose accept or decline.');
      return res.redirect('/user/dashboard#offers');
    }
  } catch (error) {
    next(error);
  }
};

// @desc Get Current Buyer's Offer Status on a Listing
exports.getListingOfferStatus = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const offer = await Offer.findOne({
      listingId,
      buyerId: req.user._id
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: offer || null
    });
  } catch (error) {
    next(error);
  }
};
