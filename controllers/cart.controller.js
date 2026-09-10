const Cart = require('../models/Cart');
const Listing = require('../models/Listing');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { LISTING_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

// Helper to get or create user's cart
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId }).populate({
    path: 'items.listingId',
    populate: { path: 'sellerId', select: 'name email profileImage' }
  });

  if (!cart) {
    cart = await Cart.create({ userId, items: [], loyaltyPointsToRedeem: 0 });
    cart = await Cart.findById(cart._id).populate({
      path: 'items.listingId',
      populate: { path: 'sellerId', select: 'name email profileImage' }
    });
  }

  // Filter out any items that were deleted or already sold
  const validItems = cart.items.filter(item => item.listingId && item.listingId.status === LISTING_STATUS.APPROVED);
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  return cart;
}

// @desc Render Cart Page
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const user = await User.findById(req.user._id);

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.listingId.price) || 0), 0);
    const shippingFee = subtotal === 0 ? 0 : (subtotal >= 999 ? 0 : 79);
    const protectionFee = subtotal === 0 ? 0 : 29;

    // Loyalty Points: 10 points = ₹100 => 1 point = ₹10
    // Maximum points user can apply: up to available user points and up to subtotal
    const userPoints = user.loyaltyPoints || 0;
    const maxRedeemablePoints = Math.min(userPoints, Math.floor(subtotal / 10));
    
    // Ensure points to redeem does not exceed balance or subtotal
    let pointsToRedeem = Math.min(cart.loyaltyPointsToRedeem || 0, maxRedeemablePoints);
    if (pointsToRedeem < 0) pointsToRedeem = 0;
    
    // ₹ discount: 10 points = ₹100
    const pointsDiscount = (pointsToRedeem / 10) * 100;
    const totalAmount = Math.max(0, subtotal - pointsDiscount) + shippingFee + protectionFee;

    res.render('pages/cart', {
      title: 'Your Thrift Cart (₹) - Styleswap',
      cart,
      subtotal,
      shippingFee,
      protectionFee,
      userPoints,
      pointsToRedeem,
      pointsDiscount,
      totalAmount
    });
  } catch (error) {
    next(error);
  }
};

// @desc Add Item to Cart
exports.addToCart = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const listing = await Listing.findById(listingId);

    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      req.flash('error', 'Item not found.');
      return res.redirect('/listings');
    }

    if (listing.sellerId.toString() === req.user._id.toString()) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'You cannot add your own item to cart' });
      }
      req.flash('error', 'You cannot add your own item to cart.');
      return res.redirect(`/listings/${listingId}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'This item is no longer available' });
      }
      req.flash('error', 'This item is no longer available.');
      return res.redirect(`/listings/${listingId}`);
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    const alreadyInCart = cart.items.some(item => item.listingId.toString() === listingId);
    if (alreadyInCart) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(200).json({ success: true, message: 'Item is already in your cart' });
      }
      req.flash('info', 'This unique thrift item is already in your cart.');
      return res.redirect('/cart');
    }

    cart.items.push({ listingId: listing._id });
    await cart.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Added to cart successfully', cartCount: cart.items.length });
    }

    req.flash('success', `"${listing.title}" added to your thrift bag!`);
    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// @desc Remove Item from Cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const cart = await Cart.findOne({ userId: req.user._id });

    if (cart) {
      cart.items = cart.items.filter(item => item.listingId.toString() !== listingId);
      await cart.save();
    }

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Item removed from cart' });
    }

    req.flash('info', 'Item removed from your cart.');
    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// @desc Apply Loyalty Points to Cart
exports.applyLoyaltyPoints = async (req, res, next) => {
  try {
    const { points } = req.body;
    const pointsNum = Math.max(0, parseInt(points, 10) || 0);

    const user = await User.findById(req.user._id);
    const cart = await getOrCreateCart(req.user._id);
    const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.listingId.price) || 0), 0);

    const userBalance = user.loyaltyPoints || 0;
    const maxAllowed = Math.min(userBalance, Math.floor(subtotal / 10));

    if (pointsNum > maxAllowed) {
      req.flash('error', `You can apply at most ${maxAllowed} points (₹${maxAllowed * 10}) for this order.`);
      return res.redirect('/cart');
    }

    cart.loyaltyPointsToRedeem = pointsNum;
    await cart.save();

    req.flash('success', pointsNum > 0 ? `Applied ${pointsNum} Loyalty Points! Saved ₹${(pointsNum / 10) * 100}!` : 'Loyalty points removed.');
    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// @desc Render Cart Checkout
exports.renderCartCheckout = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    if (cart.items.length === 0) {
      req.flash('info', 'Your cart is empty. Please add items to checkout.');
      return res.redirect('/listings');
    }

    const user = await User.findById(req.user._id);
    const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.listingId.price) || 0), 0);
    const shippingFee = subtotal >= 999 ? 0 : 79;
    const protectionFee = 29;

    const userPoints = user.loyaltyPoints || 0;
    const pointsToRedeem = Math.min(cart.loyaltyPointsToRedeem || 0, userPoints, Math.floor(subtotal / 10));
    const pointsDiscount = (pointsToRedeem / 10) * 100;
    const totalAmount = Math.max(0, subtotal - pointsDiscount) + shippingFee + protectionFee;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    res.render('pages/checkout', {
      title: 'Cart Checkout - Styleswap',
      isCartCheckout: true,
      cart,
      listing: cart.items[0].listingId, // primary preview
      itemPrice: subtotal,
      shippingFee,
      protectionFee,
      totalAmount,
      pointsToRedeem,
      pointsDiscount,
      userPoints,
      estimatedDelivery,
      isSwapCheckout: false,
      swapTransaction: null,
      acceptedOffer: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc Process Cart Checkout & Order Placement
exports.processCartCheckout = async (req, res, next) => {
  try {
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

    const cart = await getOrCreateCart(req.user._id);
    if (cart.items.length === 0) {
      req.flash('error', 'Your cart is empty.');
      return res.redirect('/listings');
    }

    const user = await User.findById(req.user._id);
    const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.listingId.price) || 0), 0);
    const shippingFee = subtotal >= 999 ? 0 : 79;
    const protectionFee = 29;

    const userPoints = user.loyaltyPoints || 0;
    const pointsToRedeem = Math.min(cart.loyaltyPointsToRedeem || 0, userPoints, Math.floor(subtotal / 10));
    const pointsDiscount = (pointsToRedeem / 10) * 100;
    const totalAmount = Math.max(0, subtotal - pointsDiscount) + shippingFee + protectionFee;

    const createdTransactions = [];
    const pointsDiscountPerItem = cart.items.length > 0 ? pointsDiscount / cart.items.length : 0;
    const pointsUsedPerItem = cart.items.length > 0 ? Math.floor(pointsToRedeem / cart.items.length) : 0;

    for (const cartItem of cart.items) {
      const listing = await Listing.findById(cartItem.listingId._id);
      if (!listing || listing.status !== LISTING_STATUS.APPROVED) continue;

      const itemVal = Number(listing.price) || 0;
      const itemFinalTotal = Math.max(0, itemVal - pointsDiscountPerItem) + (shippingFee / cart.items.length) + (protectionFee / cart.items.length);
      const trackingNumber = `DLV-IN-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

      const tx = await Transaction.create({
        listingId: listing._id,
        buyerId: req.user._id,
        sellerId: listing.sellerId,
        type: TRANSACTION_TYPES.PURCHASE,
        amount: itemVal,
        shippingFee: Math.round(shippingFee / cart.items.length),
        protectionFee: Math.round(protectionFee / cart.items.length),
        totalPaid: Math.round(itemFinalTotal),
        loyaltyPointsUsed: pointsUsedPerItem,
        loyaltyPointsDiscount: Math.round(pointsDiscountPerItem),
        paymentMethod: paymentMethod || 'UPI',
        paymentStatus: 'paid',
        paymentReference: paymentMethod === 'COD' ? 'COD-PAY-ON-DELIVERY' : `UPI-${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`,
        trackingNumber,
        estimatedDelivery,
        status: TRANSACTION_STATUS.COMPLETED,
        deliveryAddress: `${fullName || req.user.name}, ${deliveryAddress}, ${city || ''}, ${state || ''} - ${pincode || ''}`,
        phone: phone || req.user.phone || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        notes: notes || '',
        orderStatus: 'Order Placed',
        statusHistory: [{
          status: 'Order Placed',
          note: `Order placed with payment via ${paymentMethod || 'UPI'}. Insurance & pan-India courier dispatch initiated.`,
          updatedAt: new Date()
        }]
      });

      // Mark listing as sold
      listing.status = LISTING_STATUS.SOLD;
      await listing.save();
      createdTransactions.push(tx);
    }

    // Deduct redeemed points from user
    if (pointsToRedeem > 0) {
      user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) - pointsToRedeem);
      await user.save();
    }

    // Clear cart
    cart.items = [];
    cart.loyaltyPointsToRedeem = 0;
    await cart.save();

    req.flash('success', `Order placed successfully for ${createdTransactions.length} item(s)! Saved ₹${pointsDiscount} with Loyalty Points.`);
    
    if (createdTransactions.length > 0) {
      return res.redirect(`/checkout/success/${createdTransactions[0]._id}`);
    } else {
      return res.redirect('/user/dashboard');
    }
  } catch (error) {
    next(error);
  }
};
