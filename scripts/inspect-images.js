const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('../models/Category');
const Listing = require('../models/Listing');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { directConnection: true });
  const listings = await Listing.find().populate('category', 'name slug').lean();

  console.log(`Total listings in DB: ${listings.length}`);

  const problematicListings = [];

  for (const l of listings) {
    if (!l.images || l.images.length === 0) {
      problematicListings.push({ id: l._id, title: l.title, reason: 'Empty images array' });
      continue;
    }

    const hasBrokenUnsplash = l.images.some(img => img.includes('photo-1542272604-780c96856592'));
    const hasPlaceholder = l.images.some(img => img.includes('placeholder'));
    const hasInvalidUrl = l.images.some(img => !img.startsWith('http') && !img.startsWith('/'));

    if (hasBrokenUnsplash || hasPlaceholder || hasInvalidUrl) {
      problematicListings.push({
        id: l._id,
        title: l.title,
        category: l.category?.name,
        images: l.images,
        reason: hasBrokenUnsplash ? 'Broken Unsplash 404 image' : (hasPlaceholder ? 'Uses placeholder image' : 'Invalid URL')
      });
    }
  }

  console.log(`Found ${problematicListings.length} problematic listings:`);
  console.log(JSON.stringify(problematicListings, null, 2));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
