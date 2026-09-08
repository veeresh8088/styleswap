const User = require('../models/User');
const Listing = require('../models/Listing');
const Transaction = require('../models/Transaction');
const { LISTING_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

// @desc User Dashboard (Listings, Exchanges, Orders)
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // User's own listings
    const myListings = await Listing.find({ sellerId: userId })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    // Incoming exchange requests (others proposing to trade for user's items)
    const incomingExchanges = await Transaction.find({
      sellerId: userId,
      type: TRANSACTION_TYPES.EXCHANGE
    })
      .populate('listingId')
      .populate('exchangeItemId')
      .populate('buyerId', 'name email profileImage phone')
      .sort({ createdAt: -1 });

    // Outgoing exchange requests (user proposed to trade for others' items)
    const outgoingExchanges = await Transaction.find({
      buyerId: userId,
      type: TRANSACTION_TYPES.EXCHANGE
    })
      .populate('listingId')
      .populate('exchangeItemId')
      .populate('sellerId', 'name email profileImage')
      .sort({ createdAt: -1 });

    // User's purchases (items bought)
    const purchases = await Transaction.find({
      buyerId: userId,
      type: TRANSACTION_TYPES.PURCHASE
    })
      .populate('listingId')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    // User's sales (items sold to others)
    const sales = await Transaction.find({
      sellerId: userId,
      type: TRANSACTION_TYPES.PURCHASE
    })
      .populate('listingId')
      .populate('buyerId', 'name email deliveryAddress')
      .sort({ createdAt: -1 });

    // Summary statistics
    const stats = {
      totalListings: myListings.length,
      activeListings: myListings.filter((l) => l.status === LISTING_STATUS.APPROVED).length,
      soldItems: myListings.filter((l) => l.status === LISTING_STATUS.SOLD).length,
      exchangedItems: myListings.filter((l) => l.status === LISTING_STATUS.EXCHANGED).length,
      pendingIncomingExchanges: incomingExchanges.filter((e) => e.status === TRANSACTION_STATUS.PENDING).length
    };

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        stats,
        myListings,
        incomingExchanges,
        outgoingExchanges,
        purchases,
        sales
      });
    }

    res.render('pages/user/dashboard', {
      title: 'My Dashboard - Styleswap',
      user: req.user,
      stats,
      myListings,
      incomingExchanges,
      outgoingExchanges,
      purchases,
      sales
    });
  } catch (error) {
    next(error);
  }
};

// @desc Render Profile Page
exports.renderProfile = (req, res) => {
  res.render('pages/user/profile', {
    title: 'Edit Profile & Settings - Styleswap',
    user: req.user
  });
};

// @desc Update Profile Details
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, street, city, province, postalCode, country } = req.body;

    const user = await User.findById(req.user._id);

    user.name = name || user.name;
    user.phone = phone !== undefined ? phone : user.phone;
    user.bio = bio !== undefined ? bio : user.bio;

    user.address = {
      street: street || user.address?.street || '',
      city: city || user.address?.city || '',
      province: province || user.address?.province || '',
      postalCode: postalCode || user.address?.postalCode || '',
      country: country || user.address?.country || 'Thailand'
    };

    if (req.file) {
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    await user.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    }

    req.flash('success', 'Your profile details have been saved.');
    res.redirect('/user/profile');
  } catch (error) {
    next(error);
  }
};

// @desc Change Password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
      req.flash('error', 'Incorrect current password.');
      return res.redirect('/user/profile#security');
    }

    user.password = newPassword;
    await user.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }

    req.flash('success', 'Your password has been changed successfully.');
    res.redirect('/user/profile#security');
  } catch (error) {
    next(error);
  }
};

// @desc View Public User Profile & Their Active Listings
exports.getPublicUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.isBanned) {
      req.flash('error', 'User not found or account is unavailable.');
      return res.redirect('/listings');
    }

    const listings = await Listing.find({
      sellerId: user._id,
      status: LISTING_STATUS.APPROVED
    }).populate('category', 'name slug');

    res.render('pages/user/public-profile', {
      title: `${user.name}'s Thrift Collection - Styleswap`,
      profileUser: user,
      listings
    });
  } catch (error) {
    next(error);
  }
};
