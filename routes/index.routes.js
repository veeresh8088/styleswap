const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const { LISTING_STATUS } = require('../config/constants');
const { forbidAdmin } = require('../middleware/auth.middleware');

// @desc Home Page
router.get('/', forbidAdmin, async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    // Featured pre-loved wares (at least 8, falling back to popular active items)
    let featuredListings = await Listing.find({
      status: LISTING_STATUS.APPROVED,
      featured: true
    })
      .populate('sellerId', 'name profileImage')
      .populate('category', 'name')
      .limit(8);

    if (featuredListings.length < 8) {
      const existingIds = featuredListings.map(f => f._id);
      const moreFeatured = await Listing.find({
        status: LISTING_STATUS.APPROVED,
        _id: { $nin: existingIds }
      })
        .populate('sellerId', 'name profileImage')
        .populate('category', 'name')
        .sort({ viewsCount: -1, createdAt: -1 })
        .limit(8 - featuredListings.length);
      featuredListings = featuredListings.concat(moreFeatured);
    }

    // Latest arrivals (12 fresh drops)
    const latestListings = await Listing.find({
      status: LISTING_STATUS.APPROVED
    })
      .populate('sellerId', 'name profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(12);

    // Categories with counts for the homepage grid
    const categoriesWithStats = await Promise.all(
      categories.map(async (cat) => {
        const count = await Listing.countDocuments({
          category: cat._id,
          status: LISTING_STATUS.APPROVED
        });
        return {
          ...cat.toObject(),
          count
        };
      })
    );

    res.render('pages/home', {
      title: 'Styleswap - Second-Hand Fashion & Thrift Exchange India',
      categories: categoriesWithStats,
      featuredListings: featuredListings.length > 0 ? featuredListings : latestListings.slice(0, 4),
      latestListings
    });
  } catch (error) {
    next(error);
  }
});

// @desc About Styleswap
router.get('/about', forbidAdmin, (req, res) => {
  res.render('pages/about', {
    title: 'About Us - Styleswap'
  });
});

module.exports = router;
