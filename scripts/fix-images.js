const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Category = require('../models/Category');
const Listing = require('../models/Listing');

const CATEGORY_FALLBACK_IMAGES = {
  'thrifted-denim-cargoes': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
  'streetwear-hoodies': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
  'sneakers-kicks': 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
  'vintage-jackets-flannels': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
  'dresses-corsets-tops': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
  'preloved-bags-accessories': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80'
};

async function fixImages() {
  await mongoose.connect(process.env.MONGODB_URI, { directConnection: true });
  console.log('✓ Connected to MongoDB for image repair...');

  const listings = await Listing.find().populate('category');
  let updatedCount = 0;

  for (const item of listings) {
    let modified = false;
    let newImages = [];

    const catSlug = item.category?.slug || 'thrifted-denim-cargoes';
    const fallbackForCat = CATEGORY_FALLBACK_IMAGES[catSlug] || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80';

    if (!item.images || item.images.length === 0) {
      newImages = [fallbackForCat];
      modified = true;
    } else {
      newImages = item.images.map(img => {
        // 1. Broken 404 Unsplash ID (542272604-780c96856592)
        if (img.includes('542272604-780c96856592')) {
          modified = true;
          return 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80';
        }

        // 2. Placeholder thai ware path
        if (img.includes('placeholder-thai-ware.jpg')) {
          modified = true;
          if (/denim\s*shirt/i.test(item.title)) {
            return 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?auto=format&fit=crop&w=800&q=80';
          }
          if (/blazer/i.test(item.title)) {
            return 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80';
          }
          return fallbackForCat;
        }

        // 3. Check if local upload exists
        if (img.startsWith('/uploads/')) {
          const diskPath = path.join(__dirname, '..', 'public', img.replace(/^\//, ''));
          if (!fs.existsSync(diskPath)) {
            console.log(`Missing upload on disk: ${img} for item ${item.title}`);
            modified = true;
            return fallbackForCat;
          }
        }

        return img;
      });
    }

    if (modified) {
      item.images = newImages;
      await item.save();
      updatedCount++;
      console.log(`Fixed images for [${item._id}]: ${item.title} -> ${JSON.stringify(newImages)}`);
    }
  }

  console.log(`\n====================================================`);
  console.log(`✓ Image repair complete! Updated ${updatedCount} listings in MongoDB.`);
  console.log(`====================================================`);

  process.exit(0);
}

fixImages().catch(err => {
  console.error('Error fixing images:', err);
  process.exit(1);
});
