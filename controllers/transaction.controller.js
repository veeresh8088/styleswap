const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const User = require('../models/User');
const {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  LISTING_STATUS,
  LISTING_TYPES
} = require('../config/constants');

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

    if (listing.sellerId._id.toString() === req.user._id.toString()) {
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
      sellerId: listing.sellerId._id,
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

    if (listing.sellerId._id.toString() === req.user._id.toString()) {
      req.flash('error', 'You cannot purchase your own item.');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      req.flash('error', 'This item is no longer available.');
      return res.redirect(`/listings/${listing._id}`);
    }

    // Pricing calculation in ₹ INR
    const itemPrice = Number(listing.price) || 0;
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
      swapTransaction: null
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

    if (listing.sellerId._id.toString() === req.user._id.toString()) {
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

    const itemPrice = Number(listing.price) || 0;
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
      sellerId: listing.sellerId._id,
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
      .populate('sellerId', 'name email phone profileImage location');

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
      if (req.originalUrl.startsWith('/api/')) {
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

    transaction.status = TRANSACTION_STATUS.COMPLETED;
    transaction.paymentMethod = method;
    transaction.paymentStatus = paymentStatus;
    transaction.paymentReference = paymentReference;
    transaction.shippingFee = swapCourierFee;
    transaction.protectionFee = protectionFee;
    transaction.totalPaid = totalPaid;
    transaction.trackingNumber = trackingNumber;
    transaction.estimatedDelivery = estimatedDelivery;
    if (fullFormattedAddress) transaction.deliveryAddress = fullFormattedAddress;
    if (phone) transaction.phone = phone;
    if (city) transaction.city = city;
    if (state) transaction.state = state;
    if (pincode) transaction.pincode = pincode;
    if (notes) transaction.notes = notes;

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

    if (req.originalUrl.startsWith('/api/')) {
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
      notes: notes || ''
    });

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

// @desc Respond to Exchange (Accept or Reject)
exports.respondToExchange = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, responseNote } = req.body;

    const transaction = await Transaction.findById(id)
      .populate('listingId')
      .populate('exchangeItemId');

    if (!transaction || transaction.type !== TRANSACTION_TYPES.EXCHANGE) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Exchange transaction not found' });
      }
      req.flash('error', 'Exchange proposal not found.');
      return res.redirect('/user/dashboard#exchanges');
    }

    // Verify current user is the owner of the listing that received the offer
    if (transaction.sellerId.toString() !== req.user._id.toString()) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Unauthorized to respond to this proposal' });
      }
      req.flash('error', 'You are not authorized to respond to this exchange proposal.');
      return res.redirect('/user/dashboard#exchanges');
    }

    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: `This proposal has already been ${transaction.status}` });
      }
      req.flash('info', `This proposal was already ${transaction.status}.`);
      return res.redirect('/user/dashboard#exchanges');
    }

    if (action === 'accept') {
      transaction.status = TRANSACTION_STATUS.COMPLETED;
      transaction.responseNote = responseNote || 'Exchange accepted';
      await transaction.save();

      // Mark both listings as exchanged
      if (transaction.listingId) {
        transaction.listingId.status = LISTING_STATUS.EXCHANGED;
        await transaction.listingId.save();
      }

      if (transaction.exchangeItemId) {
        transaction.exchangeItemId.status = LISTING_STATUS.EXCHANGED;
        await transaction.exchangeItemId.save();
      }

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({
          success: true,
          message: 'Exchange accepted successfully!',
          data: transaction
        });
      }

      req.flash('success', 'Exchange accepted! Both items have been marked as exchanged.');
    } else {
      transaction.status = TRANSACTION_STATUS.REJECTED;
      transaction.responseNote = responseNote || 'Exchange declined';
      await transaction.save();

      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({
          success: true,
          message: 'Exchange proposal rejected',
          data: transaction
        });
      }

      req.flash('info', 'Exchange proposal declined.');
    }

    res.redirect('/user/dashboard#exchanges');
  } catch (error) {
    next(error);
  }
};
