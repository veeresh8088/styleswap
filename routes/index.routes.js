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

    // Hero showcase: Curate exactly 2 Women/Girls Western One-Piece Dresses and 1 Men Fashion piece
    // 1. Primary Girl Western Dress (e.g. Forever New Satin Dress / White Cutout Dress)
    const girlDress1 = await Listing.findOne({
      status: LISTING_STATUS.APPROVED,
      'images.0': { $exists: true },
      title: { $regex: /Forever New Teal Satin Dress|Zara White Cutout Dress|Mango Black Wrap Dress|Forever New Blue Satin Dress/i }
    }).populate('category', 'name slug').populate('sellerId', 'name');

    // 2. Secondary Girl Western Dress (e.g. Na-Kd Ribbed Dress / Forever New Wine Wrap Dress)
    const girlDress2 = await Listing.findOne({
      status: LISTING_STATUS.APPROVED,
      'images.0': { $exists: true },
      _id: { $ne: girlDress1?._id },
      title: { $regex: /Na-Kd Black Ribbed Dress|Forever New Wine Wrap Dress|Zara Green Satin Dress|Bombay Catsey Pink Tiered Dress/i }
    }).populate('category', 'name slug').populate('sellerId', 'name');

    // 3. Men Fashion Piece (e.g. UCB Grey Casual Blazer / Boohoo Green Blazer)
    const menWear = await Listing.findOne({
      status: LISTING_STATUS.APPROVED,
      'images.0': { $exists: true },
      title: { $regex: /United Colors Of Benetton Grey Casual Blazer|Boohoo Green Blazer Jacket|Primark Green Tailored Blazer/i }
    }).populate('category', 'name slug').populate('sellerId', 'name');

    // Assemble curated 3-item composition (2 girls dresses + 1 men dress) with dynamic fallback
    const heroListings = [girlDress1, girlDress2, menWear].filter(Boolean);
    if (heroListings.length < 3) {
      const more = await Listing.find({
        status: LISTING_STATUS.APPROVED,
        'images.0': { $exists: true },
        _id: { $nin: heroListings.map(h => h._id) }
      })
        .populate('category', 'name slug')
        .populate('sellerId', 'name')
        .limit(3 - heroListings.length);
      heroListings.push(...more);
    }

    res.render('pages/home', {
      title: 'Styleswap - Second-Hand Fashion & Thrift Exchange India',
      categories: categoriesWithStats,
      heroListings,
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
