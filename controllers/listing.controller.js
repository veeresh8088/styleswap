const Listing = require('../models/Listing');
const Category = require('../models/Category');
const User = require('../models/User');
const Offer = require('../models/Offer');
const SwapRequest = require('../models/SwapRequest');
const { LISTING_STATUS, LISTING_TYPES, CONDITIONS, ROLES, SIZES, ALL_SIZES } = require('../config/constants');
const { generateListingRecommendations } = require('../services/ai.service');

// @desc Get All Listings (with search, category filter, price, condition, size, sort)
exports.getListings = async (req, res, next) => {
  try {
    const {
      search,
      category,
      type,
      condition,
      size,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = 1,
      limit = 24
    } = req.query;

    const query = {
      status: LISTING_STATUS.APPROVED
    };

    // Keyword Search
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
        { size: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Category Filter (ID or Slug)
    let selectedCategory = null;
    if (category && category !== 'all') {
      const cleanCat = category.trim();
      if (cleanCat.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = cleanCat;
        selectedCategory = await Category.findById(cleanCat);
      } else {
        const catObj = await Category.findOne({ slug: new RegExp(`^${cleanCat}$`, 'i') });
        if (catObj) {
          query.category = catObj._id;
          selectedCategory = catObj;
        }
      }
    }

    // Type Filter (sell, exchange, both)
    if (type && type !== 'all' && Object.values(LISTING_TYPES).includes(type)) {
      if (type === LISTING_TYPES.SELL) {
        query.type = { $in: [LISTING_TYPES.SELL, LISTING_TYPES.BOTH] };
      } else if (type === LISTING_TYPES.EXCHANGE) {
        query.type = { $in: [LISTING_TYPES.EXCHANGE, LISTING_TYPES.BOTH] };
      } else {
        query.type = type;
      }
    }

    // Condition Filter
    if (condition && condition !== 'all' && CONDITIONS.includes(condition)) {
      query.condition = condition;
    }

    // Size Filter
    if (size && size !== 'all') {
      query.size = size;
    }

    // Price Filter (₹)
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(minPrice)) query.price.$gte = Number(minPrice);
      if (maxPrice && !isNaN(maxPrice)) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') sortOptions = { price: 1 };
    else if (sort === 'price-desc') sortOptions = { price: -1 };
    else if (sort === 'popular') sortOptions = { viewsCount: -1 };
    else if (sort === 'oldest') sortOptions = { createdAt: 1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Listing.countDocuments(query);
    const listings = await Listing.find(query)
      .populate('sellerId', 'name profileImage')
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    const totalPages = Math.ceil(total / limitNum) || 1;

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        count: listings.length,
        total,
        page: pageNum,
        totalPages,
        data: listings
      });
    }

    res.render('pages/listings/index', {
      title: selectedCategory ? `${selectedCategory.name} - Second-Hand Wares` : 'Browse Second-Hand Fashion & Accessories (₹)',
      listings,
      categories,
      selectedCategory,
      conditions: CONDITIONS,
      sizes: ALL_SIZES,
      query: req.query,
      pagination: {
        page: pageNum,
        totalPages,
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Single Listing Detail
exports.getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('sellerId', 'name email profileImage phone createdAt address formattedAddress')
      .populate('category', 'name slug');

    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    // Increment view count asynchronously
    listing.viewsCount = (listing.viewsCount || 0) + 1;
    await listing.save({ validateBeforeSave: false });

    // Fetch related listings in the same category
    const categoryId = listing.category ? (listing.category._id || listing.category) : null;
    const relatedListings = categoryId
      ? await Listing.find({
          category: categoryId,
          _id: { $ne: listing._id },
          status: LISTING_STATUS.APPROVED
        })
          .limit(4)
          .populate('sellerId', 'name profileImage')
      : [];

    // If user is logged in, find their own active listings that can be offered for exchange
    let userExchangeableItems = [];
    let userActiveOffer = null;
    let sellerIncomingOffers = [];
    let sellerIncomingSwaps = [];

    const sellerObjId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    const isOwner = Boolean(
      req.user &&
      sellerObjId &&
      req.user._id.toString() === sellerObjId.toString()
    );

    if (req.user) {
      if (!isOwner) {
        userExchangeableItems = await Listing.find({
          sellerId: req.user._id,
          _id: { $ne: listing._id },
          status: LISTING_STATUS.APPROVED
        });

        userActiveOffer = await Offer.findOne({
          listingId: listing._id,
          buyerId: req.user._id
        }).sort({ createdAt: -1 });
      } else {
        // If owner, fetch pending offers & swaps to manage directly
        sellerIncomingOffers = await Offer.find({
          listingId: listing._id,
          status: 'pending'
        }).populate('buyerId', 'name profileImage');

        sellerIncomingSwaps = await SwapRequest.find({
          targetListingId: listing._id,
          status: 'pending'
        })
          .populate('offeredListingId')
          .populate('proposerId', 'name profileImage');
      }
    }

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        data: listing,
        related: relatedListings
      });
    }

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    res.render('pages/listings/show', {
      title: `${listing.title} - Styleswap`,
      listing,
      relatedListings,
      userExchangeableItems,
      userActiveOffer,
      sellerIncomingOffers,
      sellerIncomingSwaps,
      categories,
      conditions: CONDITIONS,
      sizes: ALL_SIZES,
      isOwner
    });
  } catch (error) {
    next(error);
  }
};

// @desc Render Dedicated Make an Offer Page
exports.renderOfferPage = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('sellerId', 'name email profileImage location')
      .populate('category', 'name slug');

    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    const sellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    if (sellerId && req.user._id.toString() === sellerId.toString()) {
      req.flash('error', 'You cannot make an offer on your own listing.');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      req.flash('error', 'This item is no longer available.');
      return res.redirect(`/listings/${listing._id}`);
    }

    res.render('pages/listings/offer', {
      title: `Make an Offer on ${listing.title} - Styleswap`,
      listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc Render Dedicated Propose Swap Page
exports.renderSwapPage = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('sellerId', 'name email profileImage location')
      .populate('category', 'name slug');

    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    const swapSellerId = listing.sellerId ? (listing.sellerId._id || listing.sellerId) : null;
    if (swapSellerId && req.user._id.toString() === swapSellerId.toString()) {
      req.flash('error', 'You cannot swap with your own listing.');
      return res.redirect(`/listings/${listing._id}`);
    }

    if (listing.status !== LISTING_STATUS.APPROVED) {
      req.flash('error', 'This item is no longer available.');
      return res.redirect(`/listings/${listing._id}`);
    }

    // Find current user's active wardrobe items (approved or pending)
    const userExchangeableItems = await Listing.find({
      sellerId: req.user._id,
      _id: { $ne: listing._id },
      status: { $in: [LISTING_STATUS.APPROVED, LISTING_STATUS.PENDING] }
    });

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    res.render('pages/listings/swap', {
      title: `Propose Swap for ${listing.title} - Styleswap`,
      listing,
      userExchangeableItems,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc Render Create Listing Form
exports.renderCreateListing = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.render('pages/listings/create', {
      title: 'Sell or Swap Second-Hand Ware - Styleswap',
      categories,
      conditions: CONDITIONS,
      listingTypes: LISTING_TYPES,
      sizes: SIZES,
      allSizes: ALL_SIZES
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create New Listing
exports.createListing = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      size,
      measurements,
      price,
      condition,
      type,
      exchangePreferences,
      location
    } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else {
      // Fallback sample image if none provided
      images = ['/images/placeholder-item.jpg'];
    }

    const listing = await Listing.create({
      sellerId: req.user._id,
      title,
      description,
      category,
      size: size || 'Free Size / Standard',
      measurements: measurements || '',
      price: type === LISTING_TYPES.EXCHANGE ? 0 : Number(price) || 0,
      condition,
      images,
      type: type || LISTING_TYPES.SELL,
      status: LISTING_STATUS.APPROVED, // Default approved for active marketplace
      exchangePreferences: exchangePreferences || '',
      location: location || (req.user.address ? `${req.user.address.city}, ${req.user.address.province}` : 'Bengaluru, Karnataka')
    });

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(201).json({
        success: true,
        message: 'Listing created successfully',
        data: listing
      });
    }

    req.flash('success', 'Your pre-loved item has been listed successfully!');
    res.redirect(`/listings/${listing._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc Render Edit Listing Form
exports.renderEditListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    // Check ownership or admin
    if (
      listing.sellerId.toString() !== req.user._id.toString() &&
      req.user.role !== ROLES.ADMIN
    ) {
      req.flash('error', 'You are not authorized to edit this listing.');
      return res.redirect(`/listings/${listing._id}`);
    }

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.render('pages/listings/edit', {
      title: `Edit: ${listing.title} - Styleswap`,
      listing,
      categories,
      conditions: CONDITIONS,
      listingTypes: LISTING_TYPES,
      sizes: SIZES,
      allSizes: ALL_SIZES
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update Listing
exports.updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    // Check ownership or admin
    if (
      listing.sellerId.toString() !== req.user._id.toString() &&
      req.user.role !== ROLES.ADMIN
    ) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      req.flash('error', 'You are not authorized to edit this listing.');
      return res.redirect(`/listings/${listing._id}`);
    }

    const {
      title,
      description,
      category,
      size,
      measurements,
      price,
      condition,
      type,
      exchangePreferences,
      location,
      status
    } = req.body;

    // Process new photos if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
      listing.images = [...listing.images, ...newImages];
    }

    if (title) listing.title = title;
    if (description) listing.description = description;
    if (category) listing.category = category;
    if (size) listing.size = size;
    if (measurements !== undefined) listing.measurements = measurements;
    if (condition) listing.condition = condition;
    if (type) {
      listing.type = type;
      if (type === LISTING_TYPES.EXCHANGE) listing.price = 0;
      else if (price !== undefined) listing.price = Number(price);
    } else if (price !== undefined) {
      listing.price = Number(price);
    }
    if (exchangePreferences !== undefined) listing.exchangePreferences = exchangePreferences;
    if (location) listing.location = location;

    // Admin can update status directly
    if (req.user.role === ROLES.ADMIN && status) {
      listing.status = status;
    }

    await listing.save();

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: 'Listing updated successfully',
        data: listing
      });
    }

    req.flash('success', 'Listing updated successfully!');
    res.redirect(`/listings/${listing._id}`);
  } catch (error) {
    next(error);
  }
};

// @desc Delete Listing
exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
      }
      req.flash('error', 'Listing not found.');
      return res.redirect('/listings');
    }

    // Check ownership or admin
    if (
      listing.sellerId.toString() !== req.user._id.toString() &&
      req.user.role !== ROLES.ADMIN
    ) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      req.flash('error', 'You are not authorized to delete this listing.');
      return res.redirect(`/listings/${listing._id}`);
    }

    await Listing.findByIdAndDelete(req.params.id);

    if (req.originalUrl.startsWith('/api/')) {
      return res.status(200).json({
        success: true,
        message: 'Listing deleted successfully'
      });
    }

    req.flash('success', 'Listing deleted successfully.');
    res.redirect('/user/dashboard');
  } catch (error) {
    next(error);
  }
};

// @desc AI Recommendation for Item Title, Description, Price (₹ INR), and Size
// @route POST /api/listings/ai-recommendation
// @route POST /listings/ai-recommendation
exports.getAIRecommendation = async (req, res, next) => {
  try {
    const { keywords, categoryId, condition, size, currentPrice, currentDescription } = req.body;

    let categoryName = '';
    if (categoryId) {
      const cat = await Category.findById(categoryId);
      if (cat) categoryName = cat.name;
    }

    const recommendation = await generateListingRecommendations({
      keywords: keywords || '',
      categoryName,
      condition: condition || 'Gently Used (Good Condition)',
      size: size || '',
      currentPrice: currentPrice || 0,
      currentDescription: currentDescription || ''
    });

    return res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('AI Recommendation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate AI recommendations',
      error: error.message
    });
  }
};
