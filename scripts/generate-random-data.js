require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const { ROLES, LISTING_TYPES, LISTING_STATUS } = require('../config/constants');

const randomCustomersData = [
  {
    name: 'Arjun Patel',
    email: 'arjun.patel98@gmail.com',
    password: 'User@12345',
    phone: '+91 98250 11223',
    role: ROLES.USER,
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    address: {
      street: '42 CG Road, Navrangpura',
      city: 'Ahmedabad',
      province: 'Gujarat',
      postalCode: '380009',
      country: 'India'
    },
    bio: 'Sneaker collector and thrift hunter in Ahmedabad. Selling vintage workwear, graphic tees, and streetwear kicks.'
  },
  {
    name: 'Pooja Iyer',
    email: 'pooja.iyer.thrift@gmail.com',
    password: 'User@12345',
    phone: '+91 98451 99887',
    role: ROLES.USER,
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    address: {
      street: '19 12th Main, Indiranagar',
      city: 'Bengaluru',
      province: 'Karnataka',
      postalCode: '560038',
      country: 'India'
    },
    bio: 'Sustainable wardrobe curator in Bengaluru. Trading aesthetic slip dresses, mom jeans, and vintage handbags.'
  },
  {
    name: 'Vikramaditya Rao',
    email: 'vikram.rao.vintage@gmail.com',
    password: 'User@12345',
    phone: '+91 97012 33445',
    role: ROLES.USER,
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    address: {
      street: '77 Jubilee Hills, Road No. 36',
      city: 'Hyderabad',
      province: 'Telangana',
      postalCode: '560033',
      country: 'India'
    },
    bio: 'Vintage enthusiast trading 90s leather jackets, heavy flannels, and distressed denim.'
  },
  {
    name: 'Neha Sen',
    email: 'neha.sen.closet@gmail.com',
    password: 'User@12345',
    phone: '+91 98300 44556',
    role: ROLES.USER,
    profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    address: {
      street: '15 Southern Avenue, Keyatala',
      city: 'Kolkata',
      province: 'West Bengal',
      postalCode: '700029',
      country: 'India'
    },
    bio: 'Reselling curated second-hand fashion, Y2K tops, and oversized thrifted blazers in Kolkata.'
  },
  {
    name: 'Devansh Malhotra',
    email: 'devansh.m@gmail.com',
    password: 'User@12345',
    phone: '+91 98110 55667',
    role: ROLES.USER,
    profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    address: {
      street: '82 Greater Kailash 1, M-Block',
      city: 'New Delhi',
      province: 'Delhi',
      postalCode: '110048',
      country: 'India'
    },
    bio: 'Streetwear collector in Delhi. Swapping retro Jordans, heavyweight hoodies, and thrift accessories.'
  }
];

// 30 Men's Second-Hand Wear
const mensItemsData = [
  {
    title: "Thrifted Carhartt Duck Canvas Detroit Jacket (Size L)",
    catSlug: "vintage-jackets-flannels",
    price: 3499,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Open to swap for Nike Air Max (UK 9) or heavy leather biker jacket.",
    description: "Authentic pre-owned Carhartt Detroit work jacket in washed caramel tan. Heavy 12oz duck canvas with corduroy collar and blanket lining. Natural distressing on cuffs and pocket hems gives it unmatched vintage character. Chest: 46 inches, Length: 26 inches.",
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Vintage 90s Nirvana 'In Utero' Washed Graphic Tee (Size XL)",
    catSlug: "streetwear-hoodies",
    price: 899,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Thrifted single-stitch Nirvana band tee. Washed charcoal black cotton with cracked vintage screen print on front and back. Ribbed crewneck has minor distressing. Super soft pre-loved drape.",
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Nike Dunk Low Retro 'Panda' (UK 8.5 / US 9.5)",
    catSlug: "sneakers-kicks",
    price: 4200,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for New Balance 550 or Adidas Campus 00s (UK 8.5).",
    description: "Authentic pre-owned Panda Dunks worn around 6-7 times. 8.5/10 condition with minor toe box creasing. Clean white midsoles and great outsole grip remaining. Original box included.",
    images: ["https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Levi's 550 Relaxed Fit Tapered Jeans (34x32)",
    catSlug: "thrifted-denim-cargoes",
    price: 1399,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Classic 90s vintage Levi’s 550 in stone-washed light blue denim. Roomy thigh with a clean taper towards the ankle. High-rise waist with copper rivets. Thick rigid cotton denim with zero holes or blowouts.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Zara Man Relaxed Structured Blazer (Navy, Size 42)",
    catSlug: "vintage-jackets-flannels",
    price: 1799,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Tailored single-breasted blazer worn once for a college interview. Peak lapels, tortoiseshell buttons, and lightweight viscose-blend lining. Pristine 9.5/10 condition.",
    images: ["https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Heavyweight Green & Black Tartan Plaid Flannel (Size L)",
    catSlug: "vintage-jackets-flannels",
    price: 749,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.EXCHANGE,
    exchangePreferences: "Looking to swap for an oversized college hoodie (Size L) or corduroy cap.",
    description: "100% thick brushed cotton vintage flannel. Double button-through chest pockets. Very warm and cozy for winter layering. Minor fade on collar fold, otherwise flawless.",
    images: ["https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Converse Chuck Taylor 70s High-Top (Black, UK 9)",
    catSlug: "sneakers-kicks",
    price: 2199,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for Vans Old Skool or vintage denim vest.",
    description: "Pre-owned Chuck 70s with the upgraded thick canvas and cushioned Ortholite insole. Clean rubber toe cap and side vintage stitching. Minor scuffs on heel patch.",
    images: ["https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved H&M Relaxed Baggy Parachute Cargo Pants (Olive, 32)",
    catSlug: "thrifted-denim-cargoes",
    price: 899,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Trending streetwear parachute pants with adjustable toggle drawstrings at waist and ankles. 6 deep utility pockets. Crisp cotton-nylon blend with zero rips or signs of wear.",
    images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Boston Celtics Varsity Bomber Jacket (Size M)",
    catSlug: "vintage-jackets-flannels",
    price: 2899,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for leather jacket or retro Casio G-Shock.",
    description: "Rare 90s vintage satin varsity jacket in emerald green and white. Ribbed striped cuffs and snap button closure. Embroidered chest patch. Light discoloration on inside collar from age.",
    images: ["https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Uniqlo Airism Oversized Boxy Crewneck Tee (Beige, L)",
    catSlug: "streetwear-hoodies",
    price: 549,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Half-sleeve dropped shoulder heavyweight tee. Premium cotton exterior with smooth Airism interior. Worn twice, washed gently. Flawless condition.",
    images: ["https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Adidas Samba Classic OG (White/Black, UK 8)",
    catSlug: "sneakers-kicks",
    price: 3800,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Will trade for Nike Air Force 1 Low (UK 8) or leather crossbody bag.",
    description: "Classic indoor soccer sneaker turned streetwear staple. White leather upper with black 3-stripes and gum sole. Suede toe cap has slight denim bleed, adds good vintage vibe.",
    images: ["https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Wrangler Rugged Wear Denim Jacket (Size XL)",
    catSlug: "vintage-jackets-flannels",
    price: 1999,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Made in Mexico heavyweight 14oz trucker jacket. Honeycomb fades on elbows, copper buttons, and double chest pockets. Built like a tank.",
    images: ["https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Champion Reverse Weave Heavyweight Hoodie (Grey, L)",
    catSlug: "streetwear-hoodies",
    price: 1499,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for Stussy or Carhartt tee + tote bag.",
    description: "Original 12oz reverse weave fleece with ribbed side gussets. C embroidered patch on left sleeve and chest. Very soft interior, no pillings.",
    images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Lee Cooper Corduroy Button-Down Overshirt (Brown, M)",
    catSlug: "vintage-jackets-flannels",
    price: 849,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Thick wide-wale corduroy shirt in chocolate brown. Tortoise buttons and chest pocket. Warm and retro aesthetic.",
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Red Tape Chelsea Leather Boots (Tan, UK 9)",
    catSlug: "sneakers-kicks",
    price: 1599,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Genuine leather Chelsea boots with elasticated side gore and pull tab. Soles have 90% life left. Light creasing on vamp, polished with leather cream.",
    images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Vintage Harley-Davidson Biker Graphic Tee (Size L)",
    catSlug: "streetwear-hoodies",
    price: 999,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for vintage Levi's 501 (32x32) or workwear vest.",
    description: "Authentic thrifted Harley tee with bald eagle and motor graphic on front, dealer print on back. Boxy vintage fit. Minor pinhole on bottom hem.",
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Dickies 874 Original Work Pants (Khaki, 32x30)",
    catSlug: "thrifted-denim-cargoes",
    price: 1199,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Stiff twill wrinkle-resistant skate pants. Permanent crease line, heavy brass zip fly. Clean condition without paint marks or stains.",
    images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Puma Suede Classic XXI (Navy Blue, UK 8.5)",
    catSlug: "sneakers-kicks",
    price: 1799,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Classic B-boy sneaker in velvety blue suede with white formstrip. Minor nap wear on the heel counter. Clean rubber outsole.",
    images: ["https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Ralph Lauren Knit V-Neck Sweater (Navy, L)",
    catSlug: "vintage-jackets-flannels",
    price: 1299,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.EXCHANGE,
    exchangePreferences: "Swap for oversized vintage windbreaker or retro sunglasses.",
    description: "100% combed Pima cotton sweater with red embroidered pony logo. Great pre-owned drape, ribbed collar and cuffs.",
    images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand New Balance 574 Core Sneakers (Grey, UK 9.5)",
    catSlug: "sneakers-kicks",
    price: 2699,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for Nike Blazer Mid 77 or Casio watch.",
    description: "Iconic ENCAP cushioned grey runners. Worn for morning walks, suede is cleaned and brushed. 8/10 condition.",
    images: ["https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Retro Colorblock Windbreaker Pullover Jacket (Size L)",
    catSlug: "vintage-jackets-flannels",
    price: 999,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Teal, purple and black 90s nylon windbreaker. Half-zip neckline with kangaroo pouch pocket. Lightweight water-resistant shell.",
    images: ["https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Flying Machine Raw Indigo Slim Denim (32x32)",
    catSlug: "thrifted-denim-cargoes",
    price: 699,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Deep dark indigo wash jeans with slight stretch. Worn 2-3 times, zero knee fading. Hemmed for 5'10 height.",
    images: ["https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Vans Sk8-Hi Black & White Canvas Kicks (UK 9)",
    catSlug: "sneakers-kicks",
    price: 1899,
    condition: "Well Worn (Minor Flaws)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Open to swap for denim bucket hat or vintage belt.",
    description: "Well-loved skate shoes with authentic scuffs on the foxing tape. Suede toe and canvas quarter panels. Very durable.",
    images: ["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Wrangler Sherpa-Lined Corduroy Trucker (Size L)",
    catSlug: "vintage-jackets-flannels",
    price: 2999,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Cozy cream faux shearling lined corduroy jacket in camel brown. Heavy brass snap closures. Super warm retro outerwear piece.",
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Zara Loose Fit Graphic Streetwear Sweatshirt (Black, M)",
    catSlug: "streetwear-hoodies",
    price: 799,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Minimalist typography print on chest and back. Thick loopback French terry cotton. Fits boxy oversized.",
    images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted 90s Pepe Jeans Wide Leg Acid Wash Skater Jeans (30x30)",
    catSlug: "thrifted-denim-cargoes",
    price: 1299,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.EXCHANGE,
    exchangePreferences: "Swap for graphic hoodie or leather belt.",
    description: "Pure 90s baggy fit jeans with marbled acid wash finish. Reinforced knee seams and back patch. Great for baggy Y2K fits.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Nike Club Fleece Joggers (Dark Grey Heather, M)",
    catSlug: "streetwear-hoodies",
    price: 899,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Brushed-back fleece sweatpants with embroidered Futura logo on left hip. Elastic cuffs and drawcord waist. No flaws.",
    images: ["https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Timberland 6-Inch Premium Waterproof Boot (UK 8.5)",
    catSlug: "sneakers-kicks",
    price: 4500,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for rare Jordans or Schott leather jacket.",
    description: "Wheat nubuck leather construction with padded collar and rustproof hardware. Worn on two hill trips, cleaned and weatherproofed.",
    images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Corduroy 6-Pocket Utility Cargo Pants (Tan, 34)",
    catSlug: "thrifted-denim-cargoes",
    price: 1199,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Relaxed straight utility corduroys. Bellows cargo pockets with flap snaps. Warm textured fabric perfect for cooler seasons.",
    images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Levis Trucker Denim Vest (Medium Stonewash, Size L)",
    catSlug: "vintage-jackets-flannels",
    price: 1099,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Sleeveless denim trucker jacket. Raw frayed armhole finish, red tab on chest pocket. Looks incredible layered over hoodies.",
    images: ["https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=800&q=80"]
  }
];

// 25 Women's Second-Hand Wear
const womensItemsData = [
  {
    title: "Pre-Loved Zara Double-Breasted Camel Wool-Blend Coat (Size M)",
    catSlug: "dresses-corsets-tops",
    price: 2899,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for designer leather crossbody or designer boots (UK 5).",
    description: "Longline tailored coat in warm camel tone with tortoise buttons and structured lapels. Worn once during a trip to Shimla. Fully lined and dry cleaned. 9.5/10 condition.",
    images: ["https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Emerald Green Satin Slip Midi Dress (Size S)",
    catSlug: "dresses-corsets-tops",
    price: 1199,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for oversized blazer or knit cardigan.",
    description: "Fluid 90s bias-cut silk satin dress with cowl neckline and delicate adjustable criss-cross straps. Slight shimmer, perfect for date nights or layering over a baby tee.",
    images: ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Levi's High-Rise Wedgie Straight Jeans (Waist 27)",
    catSlug: "thrifted-denim-cargoes",
    price: 1699,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Authentic Levi’s Wedgie icon fit in light vintage indigo wash. Hugs hips and waist with raw hem ankle. 99% cotton, 1% elastane for comfortable structure.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned H&M Chunky Ribbed Knit Cardigan (Cream, Size M)",
    catSlug: "dresses-corsets-tops",
    price: 799,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Cozy drop-shoulder oversized knit sweater with tortoiseshell front buttons. Soft acrylic-wool blend with zero pilling. Worn twice.",
    images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Urban Outfitters Lace-Up Jacquard Corset Top (Size S)",
    catSlug: "dresses-corsets-tops",
    price: 899,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for vintage baguette bag or silver hoop earrings.",
    description: "Brocade floral jacquard fabric with structured boning and adjustable rear ribbon lace-up. Sweetheart neck cut.",
    images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Mango Oversized Checked Blazer (Grey Houndstooth, L)",
    catSlug: "dresses-corsets-tops",
    price: 1899,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Chic European boyfriend blazer with front welt pockets and shoulder padding. Flawless fabric and inner lining.",
    images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Faux Shearling Cropped Aviator Jacket (Size S)",
    catSlug: "vintage-jackets-flannels",
    price: 2499,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for Chelsea boots (UK 5) or oversized trench coat.",
    description: "Vintage brown cracked leatherette jacket with warm sherpa fleece collar and cuff trims. Buckled neck strap. Very warm and statement aesthetic.",
    images: ["https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Zara Floral Pleated Midi Skirt (Burgundy, Size S)",
    catSlug: "dresses-corsets-tops",
    price: 699,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Accordion pleats in dark floral autumn tones with an elastic waistband. Beautiful sway when walking. No pulled threads.",
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted 90s Wrangler Denim Dungarees Overall (Waist 28)",
    catSlug: "thrifted-denim-cargoes",
    price: 1499,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Classic relaxed fit bib overalls in light stone wash. Brass clasps and side buttons. Perfect retro collegiate look.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Owned Vero Moda Cropped Suede Biker Jacket (Tan, Size M)",
    catSlug: "vintage-jackets-flannels",
    price: 1399,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Soft faux suede moto jacket with asymmetric zip and silver snaps. Clean cuffs and collar.",
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Reformation-Style Linen Button-Front Sundress (Size M)",
    catSlug: "dresses-corsets-tops",
    price: 1299,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for canvas tote + sunglasses.",
    description: "100% breathable pure linen in muted olive green. Tortoise front buttons and smocked back panel for flexible fit.",
    images: ["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Pull&Bear Baggy Wide Leg Skater Jeans (Waist 26)",
    catSlug: "thrifted-denim-cargoes",
    price: 999,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "High-waist puddle leg jeans with clean hems. Non-stretch rigid denim in pale vintage blue wash.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Bershka Chunky Platform Loafers (Black, UK 5)",
    catSlug: "sneakers-kicks",
    price: 1599,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for high-top Converse or vintage cardigan.",
    description: "Lug-sole platform penny loafers with contrast stitching. Worn twice for a photo shoot. Pristine 9.5/10 condition.",
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Y2K Baby Blue Ribbed Lettuce-Hem Cardigan (Size S)",
    catSlug: "dresses-corsets-tops",
    price: 499,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Cropped 90s cardigan with single hook closure and wavy lettuce trims on cuffs and hem. Cute pastel aesthetic.",
    images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Nike Air Force 1 '07 Shadow (Pastel, UK 5)",
    catSlug: "sneakers-kicks",
    price: 3600,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for Jordan 1 Low or pre-owned designer bag.",
    description: "Layered pastel Swooshes with double eyelets and elevated foam midsole. Midsoles cleaned, leather upper in 8.5/10 condition.",
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted 90s Paisley Print Chiffon Maxi Kimono Shrug (Free Size)",
    catSlug: "dresses-corsets-tops",
    price: 599,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Flowy sheer chiffon duster shrug with side slits and bohemian paisley print. Looks effortless over tank tops.",
    images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Only Washed Denim Mini Skirt with Raw Hem (Waist 28)",
    catSlug: "thrifted-denim-cargoes",
    price: 549,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Classic 5-pocket denim skirt in medium stonewash with frayed hemline. Sturdy cotton.",
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Wool Plaid Preppy Blazer (Forest Green, M)",
    catSlug: "dresses-corsets-tops",
    price: 1599,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.EXCHANGE,
    exchangePreferences: "Swap for leather shoulder bag or Casio watch.",
    description: "Scottish wool woven dark green tartan blazer with crest buttons. Impeccable dark academia aesthetic.",
    images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Forever 21 Faux Leather A-Line Mini Skirt (Black, S)",
    catSlug: "dresses-corsets-tops",
    price: 499,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Matte black vegan leather mini skirt with back exposed metal zipper. Worn once for a party.",
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Zara Embroidered Poplin Peasant Blouse (White, S)",
    catSlug: "dresses-corsets-tops",
    price: 799,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Crisp white cotton blouse with floral thread embroidery and balloon sleeves. Elasticated cuffs.",
    images: ["https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted 90s Mom Jeans in Acid Black Wash (Waist 29)",
    catSlug: "thrifted-denim-cargoes",
    price: 1099,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for graphic baby tee or canvas tote.",
    description: "High-rise vintage jeans with roomy hips and tapered leg. Natural faded black denim texture.",
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Marks & Spencer Pure Merino Wool Crew Sweater (Rust, M)",
    catSlug: "dresses-corsets-tops",
    price: 1399,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Superfine merino knit in warm terracotta rust. Ultra lightweight yet insulating. No snags or moth holes.",
    images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Corduroy Dungaree Dress (Mustard Yellow, S)",
    catSlug: "dresses-corsets-tops",
    price: 899,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Pinafore overall dress with front kangaroo pocket. Looks adorable layered over striped long-sleeve tees.",
    images: ["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved H&M Satin Cargo Joggers (Olive, Size 28)",
    catSlug: "thrifted-denim-cargoes",
    price: 799,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Silky soft satin fabric with side utility pockets and elastic ankle cuffs. Dress up with heels or down with kicks.",
    images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Longline Classic Double-Breasted Trench Coat (Beige, M)",
    catSlug: "dresses-corsets-tops",
    price: 2199,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for leather boots or designer tote bag.",
    description: "Water-repellent cotton gabardine vintage trench with belt and storm flaps. Timeless European style.",
    images: ["https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80"]
  }
];

// 20 Fashion Accessories
const accessoriesItemsData = [
  {
    title: "Vintage Casio A158WA Classic Silver Digital Watch",
    catSlug: "preloved-bags-accessories",
    price: 1199,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Original stainless steel retro Casio digital watch. Water resistant, green LED backlight, alarm, and chronograph stopwatch. Micro-scratches on clasp, crystal display is scratch-free.",
    images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Quilted Nylon Crescent Crossbody Bag (Black)",
    catSlug: "preloved-bags-accessories",
    price: 699,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Trade for canvas tote or vintage sunglasses.",
    description: "Trendy cloud dumpling bag with smooth zip closure and wide adjustable shoulder strap. Spacious interior fits Kindle, bottle, and wallet.",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Genuine Leather Braided Western Belt (Brass Buckle, 32-36)",
    catSlug: "preloved-bags-accessories",
    price: 499,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Full-grain thick brown leather with intricate hand-braided weave and solid brass roller buckle. Beautiful aged leather patina.",
    images: ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Ray-Ban Style Retro Tortoiseshell Wayfarer Sunglasses",
    catSlug: "preloved-bags-accessories",
    price: 899,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Classic dark tortoiseshell acetate frames with green G-15 UV400 polarized lenses. Includes hard protective case.",
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Heavyweight Canvas Book Tote Bag ('New Yorker' Print)",
    catSlug: "preloved-bags-accessories",
    price: 349,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for vintage band pins or rings.",
    description: "16oz natural ecru cotton duck canvas tote with deep interior pocket and reinforced shoulder handles. Clean, washed condition.",
    images: ["https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Fossil Grant Chronograph Brown Leather Watch (FS4813)",
    catSlug: "preloved-bags-accessories",
    price: 2999,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for pre-owned sneakers (UK 8.5/9) or Schott jacket.",
    description: "Roman numeral navy dial with silver casing and genuine rich brown leather strap. Chronograph functions work seamlessly. Fresh battery installed.",
    images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted 90s Small Oval Wire-Rim Sunglasses (Silver/Black)",
    catSlug: "preloved-bags-accessories",
    price: 449,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.SELL,
    description: "Matrix-style tiny oval sunglasses with silver metal frames and dark UV tint lenses. Flexible nose pads.",
    images: ["https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Zara Leatherette Baguette Shoulder Purse (Cream)",
    catSlug: "preloved-bags-accessories",
    price: 799,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Underarm minimalist baguette bag with curved silhouette and silver zip. No pen marks or corner scuffs.",
    images: ["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage New York Yankees 9TWENTY Baseball Cap (Navy)",
    catSlug: "preloved-bags-accessories",
    price: 599,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for beanies or graphic socks combo.",
    description: "Washed cotton unstructured dad cap with white embroidered NY logo and cloth strap back. Naturally sun-washed peak.",
    images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Titan Edge Ultra-Slim Minimalist Watch (Silver)",
    catSlug: "preloved-bags-accessories",
    price: 2499,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Ultra slim 4mm profile watch with sapphire crystal glass and Milanese mesh steel strap. Clean executive look.",
    images: ["https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Carhartt Watch Ribbed Knit Beanie (Caramel Brown)",
    catSlug: "preloved-bags-accessories",
    price: 499,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "100% thick acrylic ribbed fold-over beanie with Carhartt square logo label on front cuff. Great stretch.",
    images: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Handcrafted Leather Messenger Bag (Tan, 15 Inch)",
    catSlug: "preloved-bags-accessories",
    price: 1999,
    condition: "Thrifted / Vintage Fade",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for vintage Levi's denim jacket or kicks.",
    description: "Distressed saddle leather satchel with dual buckle straps and padded laptop compartment. Heavy brass rivets and shoulder pad.",
    images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Chunky 925 Sterling Silver Signet Ring (Size 18)",
    catSlug: "preloved-bags-accessories",
    price: 899,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Heavy solid silver signet ring with engraved star compass motif. Stamped 925 hallmark on inside band.",
    images: ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Mango Structured Crossbody Camera Bag (Black Croc)",
    catSlug: "preloved-bags-accessories",
    price: 849,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Faux croc embossed leather with dual zip compartments and gold chain detail on strap. Compact and sturdy.",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Vintage Silk Square Neck Scarf (Hermès Inspired Paisley)",
    catSlug: "preloved-bags-accessories",
    price: 399,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "70x70 cm square satin silk scarf with rolled edges in deep burgundy, navy, and gold baroque scrollwork.",
    images: ["https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Casio Vintage Calculator Watch (CA-53W)",
    catSlug: "preloved-bags-accessories",
    price: 799,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for graphic tee or beanie.",
    description: "The classic 'Back to the Future' 8-digit calculator watch in black resin. Full key buttons, water resistant, dual time.",
    images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Retro Acetate Cat-Eye Sunglasses (Black, 90s Chic)",
    catSlug: "preloved-bags-accessories",
    price: 499,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Sleek cat-eye narrow sunglasses with dark UV400 lenses. Sturdy metal hinges and lightweight frames.",
    images: ["https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Pre-Loved Fjallraven Kanken Classic Backpack (Warm Yellow)",
    catSlug: "preloved-bags-accessories",
    price: 1899,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.BOTH,
    exchangePreferences: "Swap for pre-owned sneakers or leather jacket.",
    description: "Hard-wearing Vinylon F fabric backpack with front zip pocket, side slip sleeves, and convertible straps. Clean interior with seat pad included.",
    images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Thrifted Minimalist Double-Layer Cuban Chain Necklace (Silver)",
    catSlug: "preloved-bags-accessories",
    price: 399,
    condition: "Like New (Barely Worn)",
    type: LISTING_TYPES.SELL,
    description: "Anti-tarnish stainless steel curb link chain necklace (18 inch + 20 inch). Lobster clasp closure.",
    images: ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80"]
  },
  {
    title: "Second-Hand Levi's Reversible Leather Belt (Black / Brown, 34)",
    catSlug: "preloved-bags-accessories",
    price: 649,
    condition: "Gently Used (Good Condition)",
    type: LISTING_TYPES.SELL,
    description: "Twist buckle reversible genuine leather belt. Switch easily between solid black and dark cognac brown. Minor buckle patina.",
    images: ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80"]
  }
];

async function seedRandomCustomersAndItems(shouldExit = false) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_wear_exchange';
      console.log(`Connecting to MongoDB at: ${mongoUri}...`);
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000, directConnection: true });
      console.log('✓ Connected to MongoDB');
    }

    // 1. Fetch Categories
    const categories = await Category.find();
    if (!categories || categories.length === 0) {
      console.error('No categories found. Run seed.js first.');
      process.exit(1);
    }

    const catMap = {};
    categories.forEach(c => {
      catMap[c.slug] = c._id;
    });

    // 2. Create the 5 Customers
    console.log('Creating 5 random customer accounts...');
    const createdUsers = [];
    for (const uData of randomCustomersData) {
      let existing = await User.findOne({ email: uData.email });
      if (existing) {
        createdUsers.push(existing);
        console.log(`  - Existing user: ${uData.name} (${uData.email})`);
      } else {
        const newUser = await User.create(uData);
        createdUsers.push(newUser);
        console.log(`  + Created user: ${newUser.name} (${newUser.email}) - ${uData.address.city}`);
      }
    }

    // 3. Prepare All 75 Items (30 Men's + 25 Women's + 20 Accessories)
    console.log('\nDistributing 75 items across the 5 customer accounts:');
    console.log(`  - 30 Men's thrifted items`);
    console.log(`  - 25 Women's pre-loved items`);
    console.log(`  - 20 Fashion accessories`);

    const allItemsToInsert = [];

    // Combine items into an ordered bundle and distribute evenly
    // 5 users: each gets 6 Mens, 5 Womens, 4 Accessories = exactly 15 items each!
    for (let uIdx = 0; uIdx < createdUsers.length; uIdx++) {
      const user = createdUsers[uIdx];
      const userCity = `${user.address.city}, ${user.address.province}`;

      // Pick 6 Men's items
      const userMens = mensItemsData.slice(uIdx * 6, (uIdx + 1) * 6);
      userMens.forEach(item => {
        allItemsToInsert.push({
          sellerId: user._id,
          category: catMap[item.catSlug] || categories[0]._id,
          title: item.title,
          description: item.description,
          price: item.price,
          condition: item.condition,
          type: item.type,
          status: LISTING_STATUS.APPROVED,
          featured: Math.random() < 0.25,
          exchangePreferences: item.exchangePreferences || '',
          location: userCity,
          viewsCount: Math.floor(Math.random() * 80) + 15,
          images: item.images
        });
      });

      // Pick 5 Women's items
      const userWomens = womensItemsData.slice(uIdx * 5, (uIdx + 1) * 5);
      userWomens.forEach(item => {
        allItemsToInsert.push({
          sellerId: user._id,
          category: catMap[item.catSlug] || categories[4]._id,
          title: item.title,
          description: item.description,
          price: item.price,
          condition: item.condition,
          type: item.type,
          status: LISTING_STATUS.APPROVED,
          featured: Math.random() < 0.25,
          exchangePreferences: item.exchangePreferences || '',
          location: userCity,
          viewsCount: Math.floor(Math.random() * 80) + 15,
          images: item.images
        });
      });

      // Pick 4 Accessories
      const userAccs = accessoriesItemsData.slice(uIdx * 4, (uIdx + 1) * 4);
      userAccs.forEach(item => {
        allItemsToInsert.push({
          sellerId: user._id,
          category: catMap[item.catSlug] || categories[5]._id,
          title: item.title,
          description: item.description,
          price: item.price,
          condition: item.condition,
          type: item.type,
          status: LISTING_STATUS.APPROVED,
          featured: Math.random() < 0.25,
          exchangePreferences: item.exchangePreferences || '',
          location: userCity,
          viewsCount: Math.floor(Math.random() * 80) + 15,
          images: item.images
        });
      });
    }

    console.log(`\nInserting ${allItemsToInsert.length} second-hand items into database...`);
    const inserted = await Listing.insertMany(allItemsToInsert);

    // Update category counts
    for (const cat of categories) {
      const count = await Listing.countDocuments({ category: cat._id, status: LISTING_STATUS.APPROVED });
      await Category.findByIdAndUpdate(cat._id, { itemCount: count });
    }

    console.log('====================================================');
    console.log(`✓ Successfully created 5 Indian customer accounts!`);
    console.log(`✓ Successfully listed ${inserted.length} items in Indian Rupees (₹):`);
    console.log(`    👔 30 Men's Wares`);
    console.log(`    👗 25 Women's Wares`);
    console.log(`    👜 20 Fashion Accessories`);
    console.log('====================================================');
    console.log('5 New Customer Accounts (Password: User@12345):');
    createdUsers.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} (${u.email}) - ${u.address.city} - 15 items listed`);
    });
    console.log('====================================================');

    if (shouldExit) {
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (error) {
    console.error('Error generating random customer data:', error);
    if (shouldExit) {
      process.exit(1);
    }
  }
}

module.exports = seedRandomCustomersAndItems;

if (require.main === module) {
  seedRandomCustomersAndItems(true);
}

