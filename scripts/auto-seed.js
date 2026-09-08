const User = require('../models/User');
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const Transaction = require('../models/Transaction');
const { ROLES, LISTING_TYPES, LISTING_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

const seedRandomCustomersAndItems = require('./generate-random-data');

const autoSeedIfEmpty = async () => {
  try {
    const categoryCount = await Category.countDocuments();
    if (categoryCount > 0) {
      const listingCount = await Listing.countDocuments();
      if (listingCount < 20) {
        console.log('⚡ Ensuring full catalog of Indian thrift listings is present...');
        await seedRandomCustomersAndItems(false);
      }
      return;
    }

    console.log('⚡ Initializing database with Indian Second-Hand & Thrift Marketplace data (in ₹ Rupees)...');

    const sampleCategories = [
      {
        name: 'Thrifted Denim & Cargoes',
        slug: 'thrifted-denim-cargoes',
        description: 'Vintage Levi’s, Lee, baggy skater jeans, parachute pants, and pre-owned utility cargoes.',
        icon: 'shirt'
      },
      {
        name: 'Streetwear Tees & Hoodies',
        slug: 'streetwear-hoodies',
        description: 'Pre-loved oversized graphic tees, vintage band shirts, heavyweight zip hoodies, and thrifted crewnecks.',
        icon: 'feather'
      },
      {
        name: 'Second-Hand Sneakers & Kicks',
        slug: 'sneakers-kicks',
        description: 'Gently used Nike Air Jordans, Dunks, Adidas Sambas, Converse Chucks, and Chelsea boots.',
        icon: 'gem'
      },
      {
        name: 'Vintage Jackets & Flannels',
        slug: 'vintage-jackets-flannels',
        description: 'Thrifted leather biker jackets, 90s oversized plaid flannels, varsity coats, and corduroy bombers.',
        icon: 'briefcase'
      },
      {
        name: 'Dresses, Corsets & Casual Tops',
        slug: 'dresses-corsets-tops',
        description: 'Pre-owned Zara & H&M sundresses, thrifted satin slip dresses, knit vests, and Y2K tops.',
        icon: 'palette'
      },
      {
        name: 'Pre-Loved Bags & Accessories',
        slug: 'preloved-bags-accessories',
        description: 'Vintage Casio digital watches, leather crossbody slings, thrifted canvas tote bags, and retro sunglasses.',
        icon: 'shopping-bag'
      }
    ];

    const createdCategories = await Category.insertMany(sampleCategories);
    const catMap = {};
    createdCategories.forEach((c) => {
      catMap[c.slug] = c._id;
    });

    const adminUser = await User.create({
      name: process.env.ADMIN_NAME || 'Platform Admin',
      email: process.env.ADMIN_EMAIL || 'admin@smartware.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@12345',
      phone: process.env.ADMIN_PHONE || '+91 98765 43210',
      role: ROLES.ADMIN,
      profileImage: '/images/default-avatar.png',
      address: {
        street: '14 MG Road, Indiranagar',
        city: 'Bengaluru',
        province: 'Karnataka',
        postalCode: '560038',
        country: 'India'
      },
      bio: 'Smart Wear Exchange - Community Oversight & Verified Pre-Loved Listings.'
    });

    const user1 = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@thriftfinds.in',
      password: 'User@12345',
      phone: '+91 98112 34567',
      role: ROLES.USER,
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      address: {
        street: '88 Koramangala 4th Block',
        city: 'Bengaluru',
        province: 'Karnataka',
        postalCode: '560034',
        country: 'India'
      },
      bio: 'Avid thrifter from Bengaluru. Selling and swapping vintage denim, oversized tees, and retro jackets.'
    });

    const user2 = await User.create({
      name: 'Ananya Verma',
      email: 'ananya@prelovedwardrobe.in',
      password: 'User@12345',
      phone: '+91 99201 87654',
      role: ROLES.USER,
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      address: {
        street: '22 Bandra West, Linking Road',
        city: 'Mumbai',
        province: 'Maharashtra',
        postalCode: '400050',
        country: 'India'
      },
      bio: 'Thrifting lover in Mumbai. Reselling pre-owned Zara/Mango blazers, slip dresses, and bags in great condition.'
    });

    const user3 = await User.create({
      name: 'Kabir Mehta',
      email: 'kabir@streetstyle.in',
      password: 'User@12345',
      phone: '+91 98990 12345',
      role: ROLES.USER,
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      address: {
        street: '45 Hauz Khas Village',
        city: 'New Delhi',
        province: 'Delhi',
        postalCode: '110016',
        country: 'India'
      },
      bio: 'Sneaker collector and streetwear thrifter. Looking to trade Jordans, hoodies, and jackets with fellow collectors.'
    });

    const listingsData = [
      {
        sellerId: user1._id,
        category: catMap['vintage-jackets-flannels'],
        title: 'Thrifted 90s Distressed Faux Leather Biker Jacket (Size L)',
        description: 'Authentic second-hand vintage biker jacket thrifted from a pop-up market in Bandra. Features heavy zip hardware, snap lapels, and a gorgeous natural vintage patina. Minor crease on right sleeve, interior satin lining is fully intact. Fits boxy oversized M/L.',
        price: 2499,
        condition: 'Thrifted / Vintage Fade',
        type: LISTING_TYPES.BOTH,
        status: LISTING_STATUS.APPROVED,
        featured: true,
        exchangePreferences: 'Open to swap for Nike Dunks (UK 9) or a vintage Carhartt/bomber jacket.',
        location: 'Bengaluru, Karnataka',
        viewsCount: 215,
        images: [
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user3._id,
        category: catMap['streetwear-hoodies'],
        title: 'Pre-Owned H&M Heavyweight Oversized French Terry Hoodie (Charcoal)',
        description: 'Gently used charcoal grey boxy hoodie. 450GSM dense cotton fleece, ribbed cuffs, and pouch pocket. Worn just 3-4 times for college, zero stains or fabric pilling. Cleaned and washed.',
        price: 999,
        condition: 'Like New (Barely Worn)',
        type: LISTING_TYPES.SELL,
        status: LISTING_STATUS.APPROVED,
        featured: true,
        location: 'New Delhi, Delhi',
        viewsCount: 165,
        images: [
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user3._id,
        category: catMap['sneakers-kicks'],
        title: 'Second-Hand Nike Air Jordan 1 Mid "Chicago" (UK 9 / US 10)',
        description: 'Pre-loved authentic pair of Air Jordan 1s. Soles are in 8.5/10 condition with slight star wear on the toe. Clean toe box with minor natural leather creasing. Comes with original extra red and black laces. Great daily beater.',
        price: 4800,
        condition: 'Gently Used (Good Condition)',
        type: LISTING_TYPES.BOTH,
        status: LISTING_STATUS.APPROVED,
        featured: true,
        exchangePreferences: 'Will trade for Adidas Samba OG (UK 9) or New Balance 550.',
        location: 'New Delhi, Delhi',
        viewsCount: 310,
        images: [
          'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user2._id,
        category: catMap['dresses-corsets-tops'],
        title: 'Pre-Loved Zara Oversized Tailored Houndstooth Blazer (Size M)',
        description: 'Thrifted from a consignment haul. Single-breasted houndstooth wool-blend blazer with notched collar and tortoiseshell buttons. Looks super chic over mom jeans or mini skirts. Flawless 9/10 condition.',
        price: 1899,
        condition: 'Like New (Barely Worn)',
        type: LISTING_TYPES.SELL,
        status: LISTING_STATUS.APPROVED,
        featured: true,
        location: 'Mumbai, Maharashtra',
        viewsCount: 195,
        images: [
          'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user2._id,
        category: catMap['preloved-bags-accessories'],
        title: 'Vintage Quilted Leather Crossbody Sling Bag with Gold Chain',
        description: 'Second-hand black quilted vegan leather sling purse with gold twist-lock closure. Compact yet easily fits phone, keys, and lip balm. Minor scuff on inner lining, exterior looks pristine.',
        price: 0,
        condition: 'Gently Used (Good Condition)',
        type: LISTING_TYPES.EXCHANGE,
        status: LISTING_STATUS.APPROVED,
        featured: false,
        exchangePreferences: 'Looking to swap for vintage Casio gold digital watch or pre-owned sunglasses.',
        location: 'Mumbai, Maharashtra',
        viewsCount: 178,
        images: [
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user1._id,
        category: catMap['thrifted-denim-cargoes'],
        title: 'Vintage Thrifted Levi’s 501 Straight Leg Jeans (Waist 32, Length 30)',
        description: 'Real vintage Levi’s 501 straight fit denim with authentic natural fading on the knees and thighs. Classic button fly. Sourced from a thrift collector in Pune. Heavy 14oz rigid denim that will last another 10 years.',
        price: 1499,
        condition: 'Thrifted / Vintage Fade',
        type: LISTING_TYPES.SELL,
        status: LISTING_STATUS.APPROVED,
        featured: false,
        location: 'Bengaluru, Karnataka',
        viewsCount: 142,
        images: [
          'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user2._id,
        category: catMap['dresses-corsets-tops'],
        title: 'Pre-Owned Floral Silk-Crepe Slip Midi Dress (Size S)',
        description: 'Romantic vintage-style floral slip dress with side slit and adjustable back tie. Worn once for a birthday dinner. Fabric is super breathable for Indian summers. Dry cleaned and ready to wear.',
        price: 1299,
        condition: 'Like New (Barely Worn)',
        type: LISTING_TYPES.BOTH,
        status: LISTING_STATUS.APPROVED,
        featured: false,
        exchangePreferences: 'Open to trade for a cropped knit cardigan or denim mini skirt.',
        location: 'Mumbai, Maharashtra',
        viewsCount: 120,
        images: [
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user1._id,
        category: catMap['preloved-bags-accessories'],
        title: 'Vintage Casio Vintage Digital Gold Mesh Watch (A168WG)',
        description: 'Second-hand retro gold tone Casio illuminator watch with adjustable stainless steel mesh strap. Fully working alarm, stopwatch, and backlight. Minor micro-scratches on bezel, glass is clean.',
        price: 1599,
        condition: 'Gently Used (Good Condition)',
        type: LISTING_TYPES.SELL,
        status: LISTING_STATUS.APPROVED,
        featured: false,
        location: 'Bengaluru, Karnataka',
        viewsCount: 98,
        images: [
          'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        sellerId: user3._id,
        category: catMap['vintage-jackets-flannels'],
        title: 'Thrifted 90s Heavyweight Tartan Plaid Flannel Shirt (Size XL)',
        description: 'Super cozy oversized brushed flannel in forest green and navy plaid. Dual flap chest pockets. True vintage wash with soft hand feel. Looks great layered unbuttoned over a white tee.',
        price: 799,
        condition: 'Thrifted / Vintage Fade',
        type: LISTING_TYPES.EXCHANGE,
        status: LISTING_STATUS.PENDING,
        featured: false,
        exchangePreferences: 'Trade for graphic tee (Size L) or canvas tote bag.',
        location: 'New Delhi, Delhi',
        viewsCount: 45,
        images: [
          'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80'
        ]
      }
    ];

    const createdListings = await Listing.insertMany(listingsData);

    // Seed sample transactions
    await Transaction.create({
      listingId: createdListings[1]._id,
      buyerId: user1._id,
      sellerId: user3._id,
      type: TRANSACTION_TYPES.PURCHASE,
      amount: 999,
      status: TRANSACTION_STATUS.COMPLETED,
      deliveryAddress: '88 Koramangala 4th Block, Bengaluru, Karnataka 560034',
      notes: 'Please ship with speed post or Delhivery tracking.'
    });

    await Transaction.create({
      listingId: createdListings[4]._id, // Quilted sling bag
      buyerId: user1._id,
      sellerId: user2._id,
      type: TRANSACTION_TYPES.EXCHANGE,
      exchangeItemId: createdListings[0]._id, // Biker jacket
      status: TRANSACTION_STATUS.PENDING,
      notes: 'Hey Ananya! Love this sling bag. Would you like to trade it for my thrifted 90s biker jacket?'
    });

    await seedRandomCustomersAndItems(false);

    console.log('✓ Auto-seeding completed with Indian Second-Hand & Thrift Marketplace data (in ₹ Rupees).');
  } catch (error) {
    console.error('Auto-seed notice:', error.message);
  }
};

module.exports = autoSeedIfEmpty;
