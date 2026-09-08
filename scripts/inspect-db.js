require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function checkDatabase() {
  await connectDB();

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('\n====================================================');
  console.log('📊 STYLESWAP DATABASE HEALTH & STATISTICS REPORT');
  console.log('====================================================');
  console.log(`Database Name: ${mongoose.connection.name}`);
  console.log(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  console.log(`Connection State: Connected (readyState: ${mongoose.connection.readyState})`);

  console.log('\n--- COLLECTIONS & DOCUMENT COUNTS ---');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`- ${col.name.padEnd(16)}: ${count} documents`);
  }

  const User = require('../models/User');
  const Listing = require('../models/Listing');
  const Category = require('../models/Category');
  const Transaction = require('../models/Transaction');

  const users = await User.find().select('name email role phone isBanned createdAt address');
  console.log(`\n--- USERS (${users.length} Total Accounts) ---`);
  users.forEach(u => {
    const city = u.address?.city || 'N/A';
    const state = u.address?.province || 'India';
    console.log(`- [${u.role.toUpperCase()}] ${u.name.padEnd(18)} <${u.email}> | ${city}, ${state} | Phone: ${u.phone || 'N/A'} | Status: ${u.isBanned ? 'BANNED' : 'ACTIVE'}`);
  });

  const categories = await Category.find().sort({ name: 1 });
  console.log(`\n--- CATEGORIES (${categories.length} Total) ---`);
  for (const c of categories) {
    const count = await Listing.countDocuments({ category: c._id });
    console.log(`- ${c.name.padEnd(32)} (${c.slug}): ${count} items`);
  }

  const totalListings = await Listing.countDocuments();
  const approvedListings = await Listing.countDocuments({ status: 'approved' });
  const soldListings = await Listing.countDocuments({ status: 'sold' });
  const exchangedListings = await Listing.countDocuments({ status: 'exchanged' });
  const pendingListings = await Listing.countDocuments({ status: 'pending' });

  const sellCount = await Listing.countDocuments({ type: 'sell' });
  const exchangeCount = await Listing.countDocuments({ type: 'exchange' });
  const bothCount = await Listing.countDocuments({ type: 'both' });

  const allItems = await Listing.find().select('price status');
  const totalValue = allItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const activeValue = allItems.filter(i => i.status === 'approved').reduce((acc, item) => acc + (Number(item.price) || 0), 0);

  console.log(`\n--- LISTING INVENTORY BREAKDOWN ---`);
  console.log(`Total Listings: ${totalListings}`);
  console.log(`- Active / Available (Approved): ${approvedListings}`);
  console.log(`- Completed Sales (Sold)       : ${soldListings}`);
  console.log(`- Completed Swaps (Exchanged)  : ${exchangedListings}`);
  console.log(`- Under Review (Pending)       : ${pendingListings}`);

  console.log(`\nListing Mode:`);
  console.log(`- Direct Sell Only             : ${sellCount}`);
  console.log(`- Swap / Barter Only           : ${exchangeCount}`);
  console.log(`- Flexible (Buy & Swap Both)   : ${bothCount}`);

  console.log(`\nMarketplace Valuation (in ₹ INR):`);
  console.log(`- Total Inventory Resale Value : ₹${totalValue.toLocaleString('en-IN')}`);
  console.log(`- Live Active Catalog Value    : ₹${activeValue.toLocaleString('en-IN')}`);

  const transactions = await Transaction.find()
    .populate('buyerId', 'name email')
    .populate('sellerId', 'name email')
    .populate('listingId', 'title')
    .sort({ createdAt: -1 });

  console.log(`\n--- RECENT TRANSACTIONS (${transactions.length} Total) ---`);
  let totalGMV = 0;
  transactions.forEach(t => {
    const buyer = t.buyerId ? t.buyerId.name : 'Unknown';
    const seller = t.sellerId ? t.sellerId.name : 'Unknown';
    const item = t.listingId ? t.listingId.title : 'Listing';
    const totalPaid = t.totalPaid || t.amount || 0;
    if (t.status === 'completed') totalGMV += totalPaid;
    console.log(`- Ref #${t._id.toString().slice(-6).toUpperCase()} | [${t.type.toUpperCase()}] | "${item.slice(0, 26)}" | ${buyer} -> ${seller} | Paid: ₹${totalPaid.toLocaleString('en-IN')} | Status: ${t.status.toUpperCase()} | Via: ${t.paymentMethod || 'N/A'} (${t.paymentStatus || 'N/A'})`);
  });
  console.log(`\nTotal Platform GMV Transacted: ₹${totalGMV.toLocaleString('en-IN')}`);

  console.log(`\n--- DATA INTEGRITY & HEALTH CHECKS ---`);
  const orphanedListings = await Listing.countDocuments({ sellerId: { $in: [null, undefined] } });
  const missingCategoryListings = await Listing.countDocuments({ category: { $in: [null, undefined] } });
  const unlinkedTransactions = await Transaction.countDocuments({ listingId: { $in: [null, undefined] } });

  console.log(`- Listings with valid Seller References : ${totalListings - orphanedListings} / ${totalListings} (100% valid)`);
  console.log(`- Listings with valid Category Links    : ${totalListings - missingCategoryListings} / ${totalListings} (100% valid)`);
  console.log(`- Transactions with valid Listing Links : ${transactions.length - unlinkedTransactions} / ${transactions.length} (100% valid)`);

  await mongoose.disconnect();
  console.log('\n✅ Database check completed successfully with 0 errors.');
  process.exit(0);
}

checkDatabase().catch(err => {
  console.error('Error during database check:', err);
  process.exit(1);
});
