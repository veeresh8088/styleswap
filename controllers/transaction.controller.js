const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Conversation = require('../models/Conversation');
const {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  LISTING_STATUS,
  LISTING_TYPES,
  OFFER_STATUS,
  ORDER_STATUSES
} = require('../config/constants');

// Helper to push notification message into Conversation
async function sendSwapNotificationMessage(listingId, buyerId, sellerId, senderId, text, options = {}) {
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
      type = 'swap',
      swapId = null,
      actionStatus = 'none',
      metadata = {}
    } = options;

    if (swapId && (actionStatus === 'accepted' || actionStatus === 'rejected')) {
      conversation.messages.forEach(msg => {
        if (
          (msg.swapId && msg.swapId.toString() === swapId.toString()) ||
          (msg.type === 'swap' && msg.actionStatus === 'pending')
        ) {
          msg.actionStatus = actionStatus;
        }
      });
    }

    conversation.messages.push({
      sender: senderId,
      text,
      type,
      swapId,
      actionStatus,
      metadata,
      createdAt: new Date(),
      read: false
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    return conversation;
  } catch (err) {
    console.error('Failed to append chat notification for swap/exchange:', err.message);
  }
}

// @desc Buy Listing (Direct Purchase)
exports.buyListing = async (req, res, next) => {
  try {
    const { listingId, deliveryAddress, notes } = req.body;

    const listing = await Listing.findById(listingId).populate('sellerId', 'name email');

    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    if (sellerId && sellerId.toString() === req.user._id.toString()) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'You cannot buy your own listing' });
      }
      req.flash('error', 'You cannot buy your own item.');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'This item is no longer available for purchase' });
      }
      req.flash('error', 'This item is no longer available for purchase.');
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check if another buyer has an active accepted offer on this listing
    const activeAcceptedOffer = await Offer.findOne({
      listingId: listing._id,
      status: OFFER_STATUS.ACCEPTED
    });
    if (activeAcceptedOffer && activeAcceptedOffer.buyerId.toString() !== req.user._id.toString()) {
      const msg = 'This item has an accepted offer reserved for another buyer.';
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: msg });
      }
      req.flash('error', msg);
      return res.redirect(`/listings/${listing._id}`);
    }

    const itemPrice = Number(listing.price) || 0;
    const shippingFee = itemPrice >= 999 ? 0 : 79;
    const protectionFee = 29;
    const totalPaid = itemPrice + shippingFee + protectionFee;
    const paymentReference = `UPI-${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
    const trackingNumber = `DLV-IN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    const transaction = await Transaction.create({
      listingId: listing._id,
      buyerId: req.user._id,
      sellerId: sellerId || listing.sellerId,
      type: TRANSACTION_TYPES.PURCHASE,
      amount: itemPrice,
      shippingFee,
      protectionFee,
      totalPaid,
      paymentMethod: 'UPI',
      paymentStatus: 'paid',
      paymentReference,
      trackingNumber,
      estimatedDelivery,
      status: TRANSACTION_STATUS.COMPLETED,
      deliveryAddress: deliveryAddress || req.user.formattedAddress || 'Provided upon checkout',
      notes: notes || '',
      isSwapPurchase: listing.type === LISTING_TYPES.EXCHANGE
    });

    // Mark listing as sold
    listing.status = LISTING_STATUS.SOLD;
    await listing.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({
        success: true,
        message: 'Purchase completed successfully!',
        data: transaction
      });
    }

    req.flash('success', `Congratulations! You have successfully purchased "${listing.title}". Order reference: #${transaction._id.toString().slice(-6).toUpperCase()}`);
    res.redirect(`/checkout/success/${transaction._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc Render Checkout & Payment Page
exports.renderCheckout = async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId)
      .populate('sellerId', 'name email profileImage location phone')
      .populate('category', 'name');

    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    if (sellerId && sellerId.toString() === req.user._id.toString()) {
      req.flash('error', 'You cannot purchase your own item.');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      req.flash('error', 'This item is no longer available.');
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check if another buyer has an active accepted offer on this listing
    const activeAcceptedOffer = await Offer.findOne({
      listingId: listing._id,
      status: OFFER_STATUS.ACCEPTED
    });
    if (activeAcceptedOffer && activeAcceptedOffer.buyerId.toString() !== req.user._id.toString()) {
      req.flash('error', 'This item is reserved for another buyer at an accepted offer price.');
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check if buyer has an accepted offer for this item
    const acceptedOffer = activeAcceptedOffer && activeAcceptedOffer.buyerId.toString() === req.user._id.toString()
      ? activeAcceptedOffer
      : null;

    // Pricing calculation in ₹ INR (use accepted offer price if present)
    const itemPrice = acceptedOffer ? Number(acceptedOffer.offeredPrice) : (Number(listing.price) || 0);
    const shippingFee = itemPrice >= 999 ? 0 : 79;
    const protectionFee = 29;
    const totalAmount = itemPrice + shippingFee + protectionFee;

    // Delivery estimate: 3 to 4 business days
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    res.render('pages/checkout', {
      title: `Checkout - ${listing.title} | Styleswap`,
      listing,
      itemPrice,
      shippingFee,
      protectionFee,
      totalAmount,
      estimatedDelivery,
      isSwapCheckout: false,
      swapTransaction: null,
      acceptedOffer
    });
  } catch (error) {
    next(error);
  }
};


// @desc Process Checkout & Payment
exports.processCheckout = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const {
      fullName,
      phone,
      deliveryAddress,
      city,
      state,
      pincode,
      paymentMethod,
      upiId,
      notes
    } = req.body;

    const listing = await Listing.findById(listingId).populate('sellerId', 'name email');

    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    if (sellerId && sellerId.toString() === req.user._id.toString()) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'You cannot buy your own item' });
      }
      req.flash('error', 'You cannot purchase your own item.');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Item is no longer available' });
      }
      req.flash('error', 'This item is no longer available.');
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check if another buyer has an active accepted offer
    const activeAcceptedOffer = await Offer.findOne({
      listingId: listing._id,
      status: OFFER_STATUS.ACCEPTED
    });
    if (activeAcceptedOffer && activeAcceptedOffer.buyerId.toString() !== req.user._id.toString()) {
      const msg = 'This item has an accepted offer reserved for another buyer.';
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: msg });
      }
      req.flash('error', msg);
      return res.redirect(`/listings/${listing._id}`);
    }

    // Check if buyer has an accepted offer
    const acceptedOffer = activeAcceptedOffer && activeAcceptedOffer.buyerId.toString() === req.user._id.toString()
      ? activeAcceptedOffer
      : null;

    const itemPrice = acceptedOffer ? Number(acceptedOffer.offeredPrice) : (Number(listing.price) || 0);
    const shippingFee = itemPrice >= 999 ? 0 : 79;
    const protectionFee = 29;
    const totalPaid = itemPrice + shippingFee + protectionFee;

    // Payment reference and status
    const method = paymentMethod || 'UPI';
    let paymentStatus = 'paid';
    let paymentReference = '';

    if (method === 'UPI') {
      paymentReference = `UPI-${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (method === 'Card') {
      paymentReference = `CARD-AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
    } else if (method === 'NetBanking') {
      paymentReference = `NB-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    } else if (method === 'COD') {
      paymentStatus = 'cod';
      paymentReference = `COD-ESCROW-${Date.now().toString().slice(-6)}`;
    } else {
      paymentReference = `PAY-${Date.now().toString().slice(-8)}`;
    }

    const trackingNumber = `DLV-IN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    const fullFormattedAddress = [
      fullName,
      deliveryAddress,
      city,
      state,
      pincode ? `PIN: ${pincode}` : '',
      phone ? `Ph: ${phone}` : ''
    ].filter(Boolean).join(', ');

    const transaction = await Transaction.create({
      listingId: listing._id,
      buyerId: req.user._id,
      sellerId: sellerId || listing.sellerId,
      type: TRANSACTION_TYPES.PURCHASE,
      amount: itemPrice,
      shippingFee,
      protectionFee,
      totalPaid,
      paymentMethod: method,
      paymentStatus,
      paymentReference,
      trackingNumber,
      estimatedDelivery,
      status: TRANSACTION_STATUS.COMPLETED,
      orderStatus: 'Order Placed',
      statusHistory: [
        {
          status: 'Order Placed',
          note: acceptedOffer ? `Order placed at accepted offer price of ₹${itemPrice.toLocaleString('en-IN')}` : 'Order placed and payment confirmed',
          updatedAt: new Date()
        }
      ],
      offerId: acceptedOffer ? acceptedOffer._id : null,
      deliveryAddress: fullFormattedAddress || req.user.formattedAddress || 'Styleswap Verified Address',
      phone: phone || req.user.phone || '',
      city: city || '',
      state: state || '',

      pincode: pincode || '',
      notes: notes || '',
      isSwapPurchase: listing.type === LISTING_TYPES.EXCHANGE
    });

    // Mark listing as sold
    listing.status = LISTING_STATUS.SOLD;
    await listing.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        data: transaction
      });
    }

    req.flash('success', `Payment received! Your order #${transaction._id.toString().slice(-6).toUpperCase()} has been confirmed.`);
    res.redirect(`/checkout/success/${transaction._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc Order Confirmation / Payment Success Receipt Page
exports.renderOrderSuccess = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate({
        path: 'listingId',
        populate: { path: 'category', select: 'name' }
      })
      .populate('exchangeItemId')
      .populate('buyerId', 'name email phone profileImage')
      .populate('sellerId', 'name email phone profileImage location')
      .populate('shipments.item')
      .populate('shipments.sender', 'name email phone profileImage')
      .populate('shipments.receiver', 'name email phone profileImage');

    if (!transaction) {
      req.flash('error', 'Order details not found.');
      return res.redirect('/user/dashboard#orders');
    }

    const isAuthorized =
      req.user.role === 'admin' ||
      transaction.buyerId._id.toString() === req.user._id.toString() ||
      transaction.sellerId._id.toString() === req.user._id.toString();

    if (!isAuthorized) {
      req.flash('error', 'Unauthorized to view this order confirmation.');
      return res.redirect('/user/dashboard');
    }

    res.render('pages/order-success', {
      title: `Order Confirmed - #${transaction._id.toString().slice(-6).toUpperCase()} | Styleswap`,
      transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc Swap Protection & Cash Difference Checkout Page
exports.renderSwapCheckout = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate({
        path: 'listingId',
        populate: { path: 'category', select: 'name' }
      })
      .populate({
        path: 'exchangeItemId',
        populate: { path: 'category', select: 'name' }
      })
      .populate('buyerId', 'name email phone profileImage')
      .populate('sellerId', 'name email phone profileImage location');

    if (!transaction || transaction.type !== TRANSACTION_TYPES.EXCHANGE) {
      req.flash('error', 'Swap transaction not found.');
      return res.redirect('/user/dashboard#exchanges');
    }

    const isAuthorized =
      req.user.role === 'admin' ||
      transaction.buyerId._id.toString() === req.user._id.toString() ||
      transaction.sellerId._id.toString() === req.user._id.toString();

    if (!isAuthorized) {
      req.flash('error', 'Unauthorized to access this swap checkout.');
      return res.redirect('/user/dashboard#exchanges');
    }

    const swapCourierFee = 99; // Standard India-wide swap doorstep pickup & drop assurance
    const protectionFee = 29; // Thrift quality check assurance
    const cashTopUp = transaction.cashTopUp || 0;
    const totalAmount = swapCourierFee + protectionFee + cashTopUp;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    res.render('pages/checkout', {
      title: `Swap Checkout & Courier Assurance | Styleswap`,
      listing: transaction.listingId,
      swapTransaction: transaction,
      isSwapCheckout: true,
      itemPrice: cashTopUp,
      shippingFee: swapCourierFee,
      protectionFee,
      totalAmount,
      estimatedDelivery
    });
  } catch (error) {
    next(error);
  }
};

// @desc Process Swap Checkout
exports.processSwapCheckout = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const {
      fullName,
      phone,
      deliveryAddress,
      city,
      state,
      pincode,
      paymentMethod,
      notes
    } = req.body;

    const transaction = await Transaction.findById(transactionId)
      .populate('listingId')
      .populate('exchangeItemId');

    if (!transaction || transaction.type !== TRANSACTION_TYPES.EXCHANGE) {
      if (req.originalUrl.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'))) {
        return res.status(404).json({ success: false, message: 'Swap transaction not found' });
      }
      req.flash('error', 'Swap transaction not found.');
      return res.redirect('/user/dashboard#exchanges');
    }

    const swapCourierFee = 99;
    const protectionFee = 29;
    const cashTopUp = transaction.cashTopUp || 0;
    const totalPaid = swapCourierFee + protectionFee + cashTopUp;

    const method = paymentMethod || 'UPI';
    const paymentStatus = method === 'COD' ? 'cod' : 'paid';
    const paymentReference = `SWAP-PAY-${Date.now().toString().slice(-8)}`;
    const trackingNumber = `SWP-IN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    const fullFormattedAddress = [
      fullName,
      deliveryAddress,
      city,
      state,
      pincode ? `PIN: ${pincode}` : '',
      phone ? `Ph: ${phone}` : ''
    ].filter(Boolean).join(', ');

    // Set payment confirmed, but overall status is 'accepted' (In Progress - completion requires delivery of both shipments)
    transaction.status = TRANSACTION_STATUS.ACCEPTED;
    transaction.orderStatus = 'Confirmed';
    transaction.paymentMethod = method;
    transaction.paymentStatus = paymentStatus;
    transaction.paymentReference = paymentReference;
    transaction.shippingFee = swapCourierFee;
    transaction.protectionFee = protectionFee;
    transaction.totalPaid = totalPaid;
    transaction.estimatedDelivery = estimatedDelivery;
    if (fullFormattedAddress) transaction.deliveryAddress = fullFormattedAddress;
    if (phone) transaction.phone = phone;
    if (city) transaction.city = city;
    if (state) transaction.state = state;
    if (pincode) transaction.pincode = pincode;
    if (notes) transaction.notes = notes;

    // Advance both shipments to 'Confirmed'
    if (transaction.shipments && transaction.shipments.length >= 2) {
      transaction.shipments.forEach(s => {
        s.status = 'Confirmed';
        s.statusHistory.push({
          status: 'Confirmed',
          note: 'Swap cash top-up payment received. Courier pickup scheduled.',
          updatedAt: new Date()
        });
      });
    } else {
      const trackingNumberA = `SWP-A-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const trackingNumberB = `SWP-B-${Math.floor(10000000 + Math.random() * 90000000)}`;
      transaction.trackingNumber = `${trackingNumberA} / ${trackingNumberB}`;
      transaction.shipments = [
        {
          shipmentLabel: 'Shipment A',
          item: transaction.exchangeItemId,
          sender: transaction.buyerId,
          receiver: transaction.sellerId,
          trackingNumber: trackingNumberA,
          pickupAddress: fullFormattedAddress || 'Buyer Address on Record',
          deliveryAddress: 'Seller Address on Record',
          status: 'Confirmed',
          statusHistory: [
            { status: 'Order Placed', note: 'Exchange proposal agreed', updatedAt: new Date() },
            { status: 'Confirmed', note: 'Cash top-up payment confirmed', updatedAt: new Date() }
          ]
        },
        {
          shipmentLabel: 'Shipment B',
          item: transaction.listingId,
          sender: transaction.sellerId,
          receiver: transaction.buyerId,
          trackingNumber: trackingNumberB,
          pickupAddress: 'Seller Address on Record',
          deliveryAddress: fullFormattedAddress || 'Buyer Address on Record',
          status: 'Confirmed',
          statusHistory: [
            { status: 'Order Placed', note: 'Exchange proposal agreed', updatedAt: new Date() },
            { status: 'Confirmed', note: 'Cash top-up payment confirmed', updatedAt: new Date() }
          ]
        }
      ];
    }

    // Mark both items as exchanged
    if (transaction.listingId) {
      transaction.listingId.status = LISTING_STATUS.EXCHANGED;
      await transaction.listingId.save();
    }
    if (transaction.exchangeItemId) {
      transaction.exchangeItemId.status = LISTING_STATUS.EXCHANGED;
      await transaction.exchangeItemId.save();
    }

    await transaction.save();

    if (req.originalUrl.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'))) {
      return res.status(200).json({
        success: true,
        message: 'Swap payment and courier scheduled successfully!',
        data: transaction
      });
    }

    req.flash('success', 'Swap payment confirmed! Doorstep exchange courier scheduled.');
    res.redirect(`/checkout/success/${transaction._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc Propose Exchange
exports.proposeExchange = async (req, res, next) => {
  try {
    const {
      listingId,
      exchangeItemId,
      notes,
      cashTopUp,
      offerTitle,
      offerDescription,
      offerPrice,
      offerCondition,
      offerSize,
      offerCategory
    } = req.body;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Invalid listing ID' });
      }
      req.flash('error', 'Invalid listing ID.');
      return res.redirect('/listings');
    }

    const targetListing = await Listing.findById(listingId);
    if (!targetListing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Target listing not found' });
      }
      req.flash('error', 'The requested listing was not found.');
      return res.redirect('/listings');
    }

    if (targetListing.sellerId.toString() === req.user._id.toString()) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'You cannot propose an exchange with yourself' });
      }
      req.flash('error', 'You cannot propose an exchange for your own item.');
      return res.redirect(`/listings/${targetListing._id}`);
    }

    if (targetListing.status !== LISTING_STATUS.APPROVED) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Target item is not available for exchange' });
      }
      req.flash('error', 'Target item is not available for exchange.');
      return res.redirect(`/listings/${targetListing._id}`);
    }

    let finalExchangeItemId = exchangeItemId;

    // Support quick offer: create a new listing on-the-fly if user does not have an active listing selected
    if ((!finalExchangeItemId || !mongoose.Types.ObjectId.isValid(finalExchangeItemId)) && offerTitle && offerTitle.trim()) {
      let defaultCategory = targetListing.category;
      if (offerCategory && mongoose.Types.ObjectId.isValid(offerCategory)) {
        defaultCategory = offerCategory;
      }

      const newListing = await Listing.create({
        sellerId: req.user._id,
        title: offerTitle.trim(),
        description: offerDescription && offerDescription.trim() 
          ? offerDescription.trim() 
          : `Pre-loved item offered in wardrobe swap for "${targetListing.title}".`,
        category: defaultCategory,
        size: offerSize || 'Free Size / Standard',
        condition: offerCondition || 'Gently Used (Good Condition)',
        price: Math.max(0, Number(offerPrice) || 0),
        images: ['/images/placeholder-item.jpg'],
        type: LISTING_TYPES.EXCHANGE,
        status: LISTING_STATUS.APPROVED,
        location: req.user.address?.city ? `${req.user.address.city}, ${req.user.address.province || 'India'}` : 'India'
      });

      finalExchangeItemId = newListing._id;
    }

    if (!finalExchangeItemId || !mongoose.Types.ObjectId.isValid(finalExchangeItemId)) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Please select an item or enter an item title to offer for swap' });
      }
      req.flash('error', 'Please select an item from your wardrobe or describe an item to offer in exchange.');
      return res.redirect(`/listings/${targetListing._id}`);
    }

    // Verify user owns the item they are offering
    const offeredItem = await Listing.findOne({
      _id: finalExchangeItemId,
      sellerId: req.user._id,
      status: LISTING_STATUS.APPROVED
    });

    if (!offeredItem) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Please select a valid active listing to offer' });
      }
      req.flash('error', 'Please select a valid active listing from your collection to propose in exchange.');
      return res.redirect(`/listings/${targetListing._id}`);
    }

    // Check if an existing pending proposal already exists for this pair
    const existingProposal = await Transaction.findOne({
      listingId: targetListing._id,
      exchangeItemId: offeredItem._id,
      status: TRANSACTION_STATUS.PENDING
    });

    if (existingProposal) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'An exchange proposal for this item is already pending' });
      }
      req.flash('info', 'You already have a pending exchange proposal with this item.');
      return res.redirect(`/listings/${targetListing._id}`);
    }

    const cashDiff = Math.max(0, Number(cashTopUp) || 0);

    const transaction = await Transaction.create({
      listingId: targetListing._id,
      buyerId: req.user._id,
      sellerId: targetListing.sellerId,
      type: TRANSACTION_TYPES.EXCHANGE,
      exchangeItemId: offeredItem._id,
      cashTopUp: cashDiff,
      amount: cashDiff,
      paymentMethod: cashDiff > 0 ? 'Barter+Cash' : 'Barter',
      paymentStatus: 'pending',
      status: TRANSACTION_STATUS.PENDING,
      orderStatus: 'Order Placed',
      notes: notes || ''
    });

    // Send swap proposal notification in chat
    const topUpText = cashDiff > 0 ? ` + ₹${cashDiff.toLocaleString('en-IN')} cash top-up` : '';
    await sendSwapNotificationMessage(
      targetListing._id,
      req.user._id,
      targetListing.sellerId,
      req.user._id,
      `🔄 Wardrobe Swap Proposal: I offered "${offeredItem.title}" (₹${offeredItem.price || 0}) in exchange for "${targetListing.title}"${topUpText}.${notes ? `\n"${notes.trim()}"` : ''}`,
      {
        type: 'swap',
        swapId: transaction._id,
        actionStatus: 'pending',
        metadata: {
          offeredItemTitle: offeredItem.title,
          offeredItemPrice: offeredItem.price || 0,
          targetItemTitle: targetListing.title,
          targetListingId: targetListing._id,
          cashTopUp: cashDiff,
          note: notes ? notes.trim() : ''
        }
      }
    );

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({
        success: true,
        message: 'Exchange proposal submitted successfully',
        data: transaction
      });
    }

    const topUpMessage = cashDiff > 0 ? ` with a ₹${cashDiff.toLocaleString('en-IN')} cash top-up` : '';
    req.flash('success', `Your swap proposal for "${targetListing.title}" with your "${offeredItem.title}"${topUpMessage} has been sent to the owner.`);
    res.redirect('/user/dashboard#exchanges');
  } catch (error) {
    next(error);
  }
};

// Helper to check if request strictly expects JSON (vs browser HTML form submission)
const isJsonReq = (req) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) return false;
  return Boolean(req.xhr || req.is('json') || accept.includes('application/json') || req.originalUrl.startsWith('/api/'));
};

// @desc Respond to Exchange (Accept or Reject)
exports.respondToExchange = async (req, res, next) => {
  try {
    const { id } = req.params;
    let action = (req.params.action || req.body?.action || '').toLowerCase().trim();
    const responseNote = req.body?.responseNote || req.body?.note || '';
    const wantsJson = isJsonReq(req);

    if (action === 'decline') action = 'reject';

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Invalid exchange transaction ID' });
      }
      req.flash('error', 'Invalid exchange proposal ID.');
      return res.redirect('/user/dashboard#exchanges');
    }

    const transaction = await Transaction.findById(id)
      .populate('listingId')
      .populate('exchangeItemId');

    if (!transaction || transaction.type !== TRANSACTION_TYPES.EXCHANGE) {
      // Check if this id references a SwapRequest model
      const SwapRequest = require('../models/SwapRequest');
      const swapReq = await SwapRequest.findById(id);
      if (swapReq) {
        const swapController = require('./swap.controller');
        return swapController.respondToSwap(req, res, next);
      }
      if (wantsJson) {
        return res.status(404).json({ success: false, message: 'Exchange proposal not found' });
      }
      req.flash('error', 'Exchange proposal not found.');
      return res.redirect('/user/dashboard#exchanges');
    }

    // Sanitize any legacy invalid orderStatus values (like 'Pending') to valid schema values
    if (!ORDER_STATUSES.includes(transaction.orderStatus)) {
      transaction.orderStatus = 'Order Placed';
    }

    // Verify current user is the owner of the listing that received the offer, or admin
    const sellerIdStr = (transaction.sellerId?._id || transaction.sellerId || '').toString();
    const buyerIdStr = (transaction.buyerId?._id || transaction.buyerId || '').toString();
    const isSeller = sellerIdStr === req.user._id.toString();
    const isBuyer = buyerIdStr === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (action === 'accept' && !isSeller && !isAdmin) {
      if (wantsJson) {
        return res.status(403).json({ success: false, message: 'Only the item owner can accept this exchange proposal' });
      }
      req.flash('error', 'You are not authorized to accept this exchange proposal.');
      return res.redirect('/user/dashboard#exchanges');
    }

    if ((action === 'reject' || action === 'cancel') && !isSeller && !isBuyer && !isAdmin) {
      if (wantsJson) {
        return res.status(403).json({ success: false, message: 'Unauthorized to respond to this exchange proposal' });
      }
      req.flash('error', 'Unauthorized to respond to this exchange proposal.');
      return res.redirect('/user/dashboard#exchanges');
    }

    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
      const alreadyMsg = `This exchange proposal has already been ${transaction.status}`;
      if (wantsJson) {
        return res.status(400).json({ success: false, message: alreadyMsg });
      }
      req.flash('info', alreadyMsg);
      return res.redirect('/user/dashboard#exchanges');
    }

    const targetListingId = transaction.listingId?._id || transaction.listingId;
    const buyerIdObj = transaction.buyerId?._id || transaction.buyerId;
    const sellerIdObj = transaction.sellerId?._id || transaction.sellerId;

    if (action === 'accept') {
      // 0. Validate both items exist and are eligible for exchange
      const targetItem = transaction.listingId;
      const offeredItem = transaction.exchangeItemId;

      if (!targetItem || !offeredItem) {
        if (wantsJson) {
          return res.status(400).json({ success: false, message: 'One or both items in this exchange proposal are no longer available' });
        }
        req.flash('error', 'One or both items are no longer available.');
        return res.redirect('/user/dashboard#exchanges');
      }

      if (targetItem.status !== LISTING_STATUS.APPROVED || offeredItem.status !== LISTING_STATUS.APPROVED) {
        if (wantsJson) {
          return res.status(400).json({ success: false, message: 'One or both items have already been sold or exchanged' });
        }
        req.flash('error', 'One or both items have already been sold or exchanged.');
        return res.redirect('/user/dashboard#exchanges');
      }

      const hasCashTopUp = (transaction.cashTopUp || 0) > 0;
      transaction.status = hasCashTopUp ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.ACCEPTED;
      transaction.orderStatus = 'Confirmed';
      transaction.responseNote = responseNote || 'Exchange accepted by seller';

      const trackingNumberA = `SWP-A-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const trackingNumberB = `SWP-B-${Math.floor(10000000 + Math.random() * 90000000)}`;
      transaction.trackingNumber = `${trackingNumberA} / ${trackingNumberB}`;

      if (!transaction.estimatedDelivery) {
        const est = new Date();
        est.setDate(est.getDate() + 4);
        transaction.estimatedDelivery = est;
      }

      const targetTitle = transaction.listingId ? transaction.listingId.title : 'Item';
      const offeredTitle = transaction.exchangeItemId ? transaction.exchangeItemId.title : 'Offered Item';

      if (!transaction.shipments || transaction.shipments.length < 2) {
        transaction.shipments = [
          {
            shipmentLabel: 'Shipment A',
            item: transaction.exchangeItemId?._id || transaction.exchangeItemId,
            sender: buyerIdObj,
            receiver: sellerIdObj,
            trackingNumber: trackingNumberA,
            pickupAddress: transaction.deliveryAddress || 'Address on record',
            deliveryAddress: 'Seller Address on record',
            status: 'Confirmed',
            statusHistory: [
              { status: 'Order Placed', note: 'Exchange proposal agreed', updatedAt: new Date() },
              { status: 'Confirmed', note: 'Swap accepted. Courier pickup scheduled.', updatedAt: new Date() }
            ]
          },
          {
            shipmentLabel: 'Shipment B',
            item: targetListingId,
            sender: sellerIdObj,
            receiver: buyerIdObj,
            trackingNumber: trackingNumberB,
            pickupAddress: 'Seller Address on record',
            deliveryAddress: transaction.deliveryAddress || 'Address on record',
            status: 'Confirmed',
            statusHistory: [
              { status: 'Order Placed', note: 'Exchange proposal agreed', updatedAt: new Date() },
              { status: 'Confirmed', note: 'Swap accepted. Courier pickup scheduled.', updatedAt: new Date() }
            ]
          }
        ];
      }

      await transaction.save();

      // Mark both listings as exchanged safely
      if (typeof targetItem.save === 'function') {
        targetItem.status = LISTING_STATUS.EXCHANGED;
        await targetItem.save();
      } else {
        await Listing.findByIdAndUpdate(targetItem._id || targetItem, { status: LISTING_STATUS.EXCHANGED });
      }

      if (typeof offeredItem.save === 'function') {
        offeredItem.status = LISTING_STATUS.EXCHANGED;
        await offeredItem.save();
      } else {
        await Listing.findByIdAndUpdate(offeredItem._id || offeredItem, { status: LISTING_STATUS.EXCHANGED });
      }

      // Send chat notification for accepted swap
      await sendSwapNotificationMessage(
        targetListingId,
        buyerIdObj,
        sellerIdObj,
        req.user._id,
        `✅ Swap Accepted! The wardrobe exchange of "${offeredTitle}" for "${targetTitle}" has been confirmed.\n📦 2-Way Courier Scheduled:\n• Shipment A (${offeredTitle}): ${trackingNumberA}\n• Shipment B (${targetTitle}): ${trackingNumberB}`,
        {
          type: 'swap',
          swapId: transaction._id,
          actionStatus: 'accepted',
          metadata: {
            offeredItemTitle: offeredTitle,
            targetItemTitle: targetTitle,
            targetListingId,
            trackingNumber: `${trackingNumberA} / ${trackingNumberB}`,
            transactionId: transaction._id,
            shipments: [
              { label: 'Shipment A', trackingNumber: trackingNumberA, status: 'Confirmed', itemTitle: offeredTitle },
              { label: 'Shipment B', trackingNumber: trackingNumberB, status: 'Confirmed', itemTitle: targetTitle }
            ]
          }
        }
      );

      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: 'Swap accepted successfully! Both items are marked as exchanged.',
          data: transaction
        });
      }

      req.flash('success', 'Swap accepted! Both items have been marked as exchanged.');
    } else if (action === 'reject' || action === 'decline' || action === 'cancel') {
      transaction.status = TRANSACTION_STATUS.REJECTED;
      transaction.orderStatus = 'Cancelled';
      transaction.responseNote = responseNote || (isBuyer ? 'Exchange cancelled by proposer' : 'Exchange declined by owner');
      await transaction.save();

      // Send chat notification for declined swap
      const targetTitle = transaction.listingId ? transaction.listingId.title : 'Item';
      await sendSwapNotificationMessage(
        targetListingId,
        buyerIdObj,
        sellerIdObj,
        req.user._id,
        `❌ Swap Closed: The swap proposal for "${targetTitle}" was ${isBuyer ? 'withdrawn/cancelled by the proposer' : 'declined by the owner'}.${responseNote ? `\nNote: ${responseNote}` : ''}`,
        {
          type: 'swap',
          swapId: transaction._id,
          actionStatus: 'rejected',
          metadata: {
            targetItemTitle: targetTitle,
            targetListingId,
            note: responseNote || ''
          }
        }
      );

      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: 'Swap proposal declined.',
          data: transaction
        });
      }

      req.flash('info', 'Swap proposal declined.');
    } else {
      if (wantsJson) {
        return res.status(400).json({ success: false, message: 'Invalid action. Choose accept or decline.' });
      }
      req.flash('error', 'Invalid action. Choose accept or decline.');
      return res.redirect('/user/dashboard#exchanges');
    }

    res.redirect('/user/dashboard#exchanges');
  } catch (error) {
    next(error);
  }
};
