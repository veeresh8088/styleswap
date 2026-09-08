require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const { LISTING_STATUS } = require('../config/constants');

async function testQuery() {
  await connectDB();
  console.log('LISTING_STATUS.APPROVED is:', LISTING_STATUS.APPROVED);
  const count = await Listing.countDocuments({ status: LISTING_STATUS.APPROVED });
  console.log('Count with { status: "approved" }:', count);

  const all = await Listing.find({ status: LISTING_STATUS.APPROVED }).select('title status sellerId category').lean();
  console.log('Total approved found:', all.length);

  // Check how many have sellerId and category populated
  const populated = await Listing.find({ status: LISTING_STATUS.APPROVED })
    .populate('sellerId', 'name')
    .populate('category', 'name')
    .limit(20)
    .lean();
  console.log('Sample populated:');
  populated.slice(0, 5).forEach(p => console.log(' -', p.title, '| Seller:', p.sellerId?.name, '| Cat:', p.category?.name));
  
  process.exit(0);
}

testQuery();
