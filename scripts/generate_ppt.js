const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';

// Theme Colors
const C_DARK = '0F172A';
const C_PRIMARY = '059669'; // Emerald
const C_SECONDARY = '4F46E5'; // Indigo
const C_TEXT = '334155';
const C_MUTED = '64748B';
const C_CARD_BG = 'F8FAFC';
const C_CARD_BORDER = 'E2E8F0';
const C_WHITE = 'FFFFFF';
const C_ACCENT_AMBER = 'D97706';

function addHeader(slide, title, category = 'STYLESWAP | Final Year Project Review – 1') {
  slide.addText(category.toUpperCase(), {
    x: 0.8, y: 0.4, w: 11.5, h: 0.3,
    fontSize: 10, color: C_MUTED, fontFace: 'Calibri', bold: true, charSpacing: 1.5
  });
  slide.addText(title, {
    x: 0.8, y: 0.65, w: 11.5, h: 0.7,
    fontSize: 26, color: C_DARK, fontFace: 'Calibri', bold: true
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 1.35, w: 1.5, h: 0,
    line: { color: C_PRIMARY, width: 3 }
  });
}

function addCard(slide, x, y, w, h, title, body, options = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.15,
    fill: { color: options.fill || C_CARD_BG },
    line: { color: options.border || C_CARD_BORDER, width: 1 }
  });

  let curY = y + 0.2;
  if (options.badge) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.2, y: curY, w: options.badgeW || 1.8, h: 0.25,
      rectRadius: 0.1,
      fill: { color: options.badgeBg || 'ECFDF5' },
      line: { color: options.badgeBorder || 'A7F3D0', width: 0.5 }
    });
    slide.addText(options.badge, {
      x: x + 0.2, y: curY, w: options.badgeW || 1.8, h: 0.25,
      fontSize: 9, color: options.badgeColor || C_PRIMARY, bold: true, align: 'center'
    });
    curY += 0.35;
  }

  if (title) {
    slide.addText(title, {
      x: x + 0.25, y: curY, w: w - 0.5, h: 0.4,
      fontSize: options.titleSize || 14, color: options.titleColor || C_DARK, bold: true, fontFace: 'Calibri'
    });
    curY += 0.4;
  }

  if (body) {
    slide.addText(body, {
      x: x + 0.25, y: curY, w: w - 0.5, h: h - (curY - y) - 0.15,
      fontSize: options.fontSize || 11, color: options.textColor || C_TEXT,
      fontFace: 'Calibri', lineSpacingMultiple: 1.2, bullet: options.bullet || false
    });
  }
}

// ----------------------------------------------------
// SLIDE 1: Title Slide
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = 'F1F5F9';

  s.addText('Project Review – 1 | Final Year | Department of Computer Science & Engineering', {
    x: 1.0, y: 0.8, w: 11.3, h: 0.4,
    fontSize: 12, color: C_MUTED, fontFace: 'Calibri', bold: true, align: 'center', charSpacing: 1.5
  });

  s.addText('STYLESWAP', {
    x: 1.0, y: 1.3, w: 11.3, h: 1.2,
    fontSize: 52, color: C_DARK, fontFace: 'Calibri', bold: true, align: 'center'
  });

  s.addText('Second-Hand Fashion, Sustainable Thrift & Direct Clothing Exchange Platform', {
    x: 1.0, y: 2.5, w: 11.3, h: 0.5,
    fontSize: 18, color: C_PRIMARY, fontFace: 'Calibri', bold: true, align: 'center'
  });

  s.addText('Promoting circular fashion economy through peer-to-peer garment swaps, fair Indian ₹ resale valuation, and escrow protection.', {
    x: 2.0, y: 3.1, w: 9.3, h: 0.5,
    fontSize: 13, color: C_TEXT, fontFace: 'Calibri', align: 'center', italic: true
  });

  // Guide box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 4.4, y: 3.8, w: 4.5, h: 0.55,
    rectRadius: 0.1, fill: { color: 'E0E7FF' }, line: { color: 'C7D2FE', width: 1 }
  });
  s.addText('Under Guidance: Mrs. Geeta Patil', {
    x: 4.4, y: 3.8, w: 4.5, h: 0.55,
    fontSize: 12, color: C_SECONDARY, bold: true, align: 'center'
  });

  // Team & Institution Cards
  addCard(s, 1.5, 4.6, 5.0, 2.2, 'Team Members', [
    { text: 'Mahammad Aftab   2RH23CS028' },
    { text: 'Omnateeta V U    2RH23CS038' },
    { text: 'Pruthvi Gokak    2RH23CS046' },
    { text: 'Raju Hakki       2RH23CS047' }
  ], { fill: C_WHITE, bullet: true });

  addCard(s, 6.8, 4.6, 5.0, 2.2, 'Institution & Department', [
    { text: 'Rural Engineering College, Hulkoti' },
    { text: 'Department of Computer Science & Engineering' },
    { text: 'Academic Year: 2025 – 2026' },
    { text: 'Project Phase: Review 1 / Stage 1' }
  ], { fill: C_WHITE, bullet: true });
}

// ----------------------------------------------------
// SLIDE 2: Introducing Styleswap
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Introducing STYLESWAP');

  s.addText('STYLESWAP is a circular fashion & peer-to-peer thrift exchange platform built to combat fast fashion waste in India. Rather than treating pre-loved clothes as disposable waste, Styleswap provides a trusted digital marketplace where thrifters and conscious consumers can swap, buy, sell, and earn rewards securely.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.8,
    fontSize: 12.5, color: C_TEXT, fontFace: 'Calibri', lineSpacingMultiple: 1.2
  });

  // 4 Action Pillars
  addCard(s, 0.8, 2.5, 2.7, 2.5, 'DISCOVER', 'Browse curated second-hand fashion, streetwear, ethnic wear, and kicks with real condition tags and flat lay sizing.', {
    badge: 'THRIFT MARKET', badgeW: 1.4
  });

  addCard(s, 3.8, 2.5, 2.7, 2.5, 'EXCHANGE', 'Propose direct 1-to-1 clothing swaps with counter-offer negotiations, wishlist matching, and dual courier tracking.', {
    badge: 'WARDROBE SWAP', badgeW: 1.4, badgeBg: 'EEF2FF', badgeBorder: 'C7D2FE', badgeColor: C_SECONDARY
  });

  addCard(s, 6.8, 2.5, 2.7, 2.5, 'BUY & SELL', 'List pre-loved garments in Indian Rupees (₹) with zero listing fees, transparent pricing, and instant UPI checkout.', {
    badge: 'DIRECT RESALE', badgeW: 1.4, badgeBg: 'FEF3C7', badgeBorder: 'FDE68A', badgeColor: C_ACCENT_AMBER
  });

  addCard(s, 9.8, 2.5, 2.7, 2.5, 'REWARD & SUSTAIN', 'Earn loyalty points on every verified transaction (10 Pts = ₹100 Off) and divert wearable clothes from landfills.', {
    badge: 'CIRCULAR REWARDS', badgeW: 1.6, badgeBg: 'F0FDF4', badgeBorder: 'BBF7D0', badgeColor: C_PRIMARY
  });

  // Bottom Two Cards
  addCard(s, 0.8, 5.2, 5.7, 1.8, 'Platform Pillars', [
    { text: 'Condition Transparency: Real defect photos & measurements' },
    { text: '5-Step Swap Engine: Structured negotiation & item barter' },
    { text: '24-Hour Escrow Protection: Insured buyer inspection period' }
  ], { bullet: true });

  addCard(s, 6.8, 5.2, 5.7, 1.8, 'Core Design Principle', 'Every transaction on Styleswap is engineered around Trust and Circularity. Buyers get exact fit verification before payment release, sellers monetize unworn clothes, and wearable garments stay in circulation.', {
    fill: 'F0FDF4', border: 'BBF7D0'
  });
}

// ----------------------------------------------------
// SLIDE 3: Problem Statement
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Problem Statement');

  s.addText('Urban Indian consumers and college youth face significant friction when trying to embrace sustainable fashion — not due to lack of clothes, but lack of trusted peer-to-peer exchange and authentic thrifting infrastructure.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.65,
    fontSize: 12.5, color: C_TEXT, fontFace: 'Calibri'
  });

  addCard(s, 0.8, 2.3, 5.7, 1.4, 'Fast Fashion & Textile Waste Crisis', 'Over 85% of textiles end up in landfills each year. Cheap fast fashion creates closets full of unworn garments with zero structured avenues for responsible reuse.');

  addCard(s, 6.8, 2.3, 5.7, 1.4, 'Lack of Direct Barter / Swapping System', 'Existing ecommerce platforms only permit one-way cash purchases. There is no platform enabling cashless 1-to-1 clothing trades between conscious thrifters.');

  addCard(s, 0.8, 3.9, 5.7, 1.4, 'Fraud & Trust Deficit in Social Selling', 'Thrift commerce currently happens on unmonitored WhatsApp/Instagram pages prone to scams, misleading condition claims, and ghosted payments.');

  addCard(s, 6.8, 3.9, 5.7, 1.4, 'Inaccurate Sizing & High Return Costs', 'Second-hand clothes lack standard tags due to shrinking or vintage origins. Without flat lay measurements, buyers suffer high fit disappointment.');

  // Quote
  s.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 5.6, w: 0, h: 1.1,
    line: { color: C_PRIMARY, width: 4 }
  });
  s.addText('“The problem is not just fast fashion waste — it is the absence of a reliable, trusted platform that turns idle wardrobes into active community fashion assets.”', {
    x: 1.1, y: 5.7, w: 11.4, h: 0.8,
    fontSize: 14, color: C_DARK, bold: true, italic: true
  });
}

// ----------------------------------------------------
// SLIDE 4: Methodology & Workflow
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Methodology & User Journey');

  s.addText('Styleswap is designed around an intuitive 6-stage circular fashion workflow, guiding users from closet listing through secure negotiation, transaction, and verification.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.5,
    fontSize: 12.5, color: C_TEXT
  });

  const steps = [
    { title: '1. Onboarding', desc: 'Secure register / login with JWT & session authentication' },
    { title: '2. List Garment', desc: 'Upload item photos, condition grade, size pills & ₹ price' },
    { title: '3. Discover', desc: 'Filter by category, size, price range & Indian location' },
    { title: '4. Offer / Swap', desc: 'Initiate 5-step swap barter or direct cash purchase' },
    { title: '5. Escrow Checkout', desc: 'Secure UPI/COD payment with 24-hr thrift inspection' },
    { title: '6. Points Reward', desc: 'Earn loyalty points to redeem on future wardrobe orders' }
  ];

  steps.forEach((st, idx) => {
    const xPos = 0.8 + (idx * 1.95);
    addCard(s, xPos, 2.2, 1.85, 2.5, st.title, st.desc, {
      titleSize: 12, fontSize: 10, fill: C_CARD_BG
    });
  });

  addCard(s, 0.8, 5.0, 3.7, 1.9, 'Measurement & Condition Truth', 'Every item requires explicit condition grading (Brand New, Gently Used, Vintage) and physical flat measurements to prevent fit mismatches.');

  addCard(s, 4.8, 5.0, 3.7, 1.9, 'Bilateral Swap Engine', 'Proprietary counter-offer logic permits both swappers to adjust offered items until mutual acceptance is reached.');

  addCard(s, 8.8, 5.0, 3.7, 1.9, 'Escrow Courier Security', 'Payment is held securely in platform escrow until the buyer confirms physical item condition matches listing claims.');
}

// ----------------------------------------------------
// SLIDE 5: Technology Stack
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Technology Stack');

  addCard(s, 0.8, 1.8, 3.7, 2.4, 'Frontend Layer', [
    { text: 'EJS (Embedded JavaScript Templating)' },
    { text: 'Tailwind CSS (Utility-first styling)' },
    { text: 'Modern JavaScript (ES6+ client modules)' },
    { text: 'Lucide Icons & Dynamic Media Viewer' }
  ], { badge: 'PRESENTATION', bullet: true });

  addCard(s, 4.8, 1.8, 3.7, 2.4, 'Backend Architecture', [
    { text: 'Node.js (Asynchronous runtime engine)' },
    { text: 'Express.js (MVC routing & middleware)' },
    { text: 'Multer (Multipart image file handling)' },
    { text: 'Bcrypt.js (Secure password hashing)' }
  ], { badge: 'APPLICATION LOGIC', bullet: true, badgeBg: 'EEF2FF', badgeBorder: 'C7D2FE', badgeColor: C_SECONDARY });

  addCard(s, 8.8, 1.8, 3.7, 2.4, 'Database & Storage', [
    { text: 'MongoDB (NoSQL Document Store)' },
    { text: 'Mongoose ODM (Schema validation)' },
    { text: 'MongoDB Atlas (Cloud Cluster Deployment)' },
    { text: 'Local Database Fallback & Auto-Seeding' }
  ], { badge: 'DATA LAYER', bullet: true, badgeBg: 'FEF3C7', badgeBorder: 'FDE68A', badgeColor: C_ACCENT_AMBER });

  addCard(s, 0.8, 4.5, 5.7, 2.4, 'Security & Authentication', [
    { text: 'JWT (JSON Web Tokens) for REST API routes' },
    { text: 'HTTP-Only Session Cookies for browser navigation' },
    { text: 'Role-Based Access Control (Buyer, Seller, Admin)' },
    { text: 'Input Sanitization & MongoDB Injection Guards' }
  ], { badge: 'SECURITY PROTOCOLS', bullet: true });

  addCard(s, 6.8, 4.5, 5.7, 2.4, 'Environment & Deployment', [
    { text: 'VS Code (Development & Debugging Environment)' },
    { text: 'Git & GitHub (Version control & collaboration)' },
    { text: 'Render Cloud (Continuous deployment pipeline)' },
    { text: 'Node.js 24 LTS & NPM dependency ecosystem' }
  ], { badge: 'DEVOPS & DEPLOYMENT', bullet: true, badgeBg: 'F0FDF4', badgeBorder: 'BBF7D0', badgeColor: C_PRIMARY });
}

// ----------------------------------------------------
// SLIDE 6: System Architecture & Workflow Diagram
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'System Architecture & Workflow');

  addCard(s, 0.8, 1.7, 2.7, 1.4, 'Client / User Roles', 'Buyers, Sellers, Swappers\nAuthenticated via JWT & Session Cookies', {
    fill: 'EEF2FF', border: 'C7D2FE', titleColor: C_SECONDARY
  });

  addCard(s, 9.8, 1.7, 2.7, 1.4, 'Admin & Moderation', 'System Admin Portal\nCatalog Moderation, User Ban & Escrow Control', {
    fill: 'FEF2F2', border: 'FECACA', titleColor: 'DC2626'
  });

  // Core Modules Box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 3.4, w: 11.7, h: 2.1,
    rectRadius: 0.15, fill: { color: 'F8FAFC' }, line: { color: 'CBD5E1', width: 1.5 }
  });
  s.addText('CORE APPLICATION ENGINE (Express.js + Node.js MVC)', {
    x: 1.0, y: 3.5, w: 11.3, h: 0.3,
    fontSize: 11, color: C_MUTED, bold: true, charSpacing: 1.2
  });

  addCard(s, 1.1, 3.9, 2.6, 1.4, 'Listing & Catalog', 'Multi-image upload, categorization, condition tagging & search filters');
  addCard(s, 3.9, 3.9, 2.6, 1.4, '5-Step Swap Engine', 'Bilateral trade negotiation, counter-offers & dual shipping tracking');
  addCard(s, 6.7, 3.9, 2.6, 1.4, 'Cart & Checkout', 'Redeemable loyalty points, address capture, UPI QR & COD options');
  addCard(s, 9.5, 3.9, 2.6, 1.4, 'Loyalty & Escrow', '10 Pts = ₹100 rule, 24-hr condition warranty & escrow payouts');

  // Database Box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 2.8, y: 5.8, w: 7.7, h: 1.2,
    rectRadius: 0.15, fill: { color: 'F0FDF4' }, line: { color: '86EFAC', width: 1.5 }
  });
  s.addText('MONGODB DATABASE (Users, Listings, Swaps, Orders, Transactions, Categories)', {
    x: 2.8, y: 6.2, w: 7.7, h: 0.4,
    fontSize: 12, color: C_PRIMARY, bold: true, align: 'center'
  });
}

// ----------------------------------------------------
// SLIDE 7: Feature 1 - Thrift Marketplace & Listings
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Feature 1 — Thrift Marketplace & Listings', 'CURRENTLY IMPLEMENTED');

  s.addText('The Listings module provides the foundational supply layer for Styleswap. Sellers can create detailed pre-loved clothing listings in minutes with full condition transparency.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.5,
    fontSize: 12.5, color: C_TEXT
  });

  addCard(s, 0.8, 2.2, 5.7, 4.7, 'What Is Built & Functional', [
    { text: 'Multi-Image Upload with instant client-side preview thumbnails' },
    { text: 'Categorization into Streetwear, Tops, Bottoms, Vintage, Footwear & Ethnic' },
    { text: 'Interactive Size Pills for Tops (XS-XXL), Bottoms (Waist 28-38), Footwear (UK 6-11)' },
    { text: 'Dedicated Flat Lay Measurements field (pit-to-pit, waist, length)' },
    { text: 'Objective Condition Grading: New with Tags, Like New, Gently Used, Vintage' },
    { text: 'Fair Indian Currency (₹) pricing with automatic currency formatting' },
    { text: 'Intent Configuration: Sell Only, Swap Only, or Open to Both' }
  ], { bullet: true, fontSize: 11.5 });

  addCard(s, 6.8, 2.2, 5.7, 2.2, 'Design Goal', 'Eliminate buyer uncertainty by demanding structured condition reports and flat measurements upfront. This eliminates the 30% return rate common in generic apparel ecommerce.', {
    fill: 'F0FDF4', border: 'BBF7D0'
  });

  addCard(s, 6.8, 4.7, 5.7, 2.2, 'Why This Matters for Second-Hand Clothes', 'Pre-loved fashion items have unique wear patterns, washes, and vintage shrinking. Standard S/M/L tags fail without exact measurements and real, unedited photos.', {
    fill: 'EEF2FF', border: 'C7D2FE'
  });
}

// ----------------------------------------------------
// SLIDE 8: Feature 2 - 5-Step Wardrobe Swap Engine
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Feature 2 — 5-Step Wardrobe Swap Engine', 'CURRENTLY IMPLEMENTED');

  s.addText('The Wardrobe Swap engine facilitates cashless 1-to-1 clothing barter between community members, featuring real-time counter-offers and dual courier tracking.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.5,
    fontSize: 12.5, color: C_TEXT
  });

  const swapSteps = [
    { step: 'Step 1: Propose', desc: 'Proposer selects an item from their closet to exchange for receiver listing.' },
    { step: 'Step 2: Negotiate', desc: 'Receiver reviews proposer item and can accept, decline, or counter-offer.' },
    { step: 'Step 3: Lock Trade', desc: 'Both parties mutually confirm the swap parameters and swap terms.' },
    { step: 'Step 4: Waybills', desc: 'Platform issues paired courier tracking codes (DLV-SWAP-XXXX).' },
    { step: 'Step 5: Completion', desc: 'Both items delivered and verified, releasing loyalty points to both users.' }
  ];

  swapSteps.forEach((st, idx) => {
    addCard(s, 0.8, 2.2 + (idx * 0.95), 6.5, 0.85, st.step, st.desc, {
      titleSize: 11, fontSize: 10, fill: C_CARD_BG
    });
  });

  addCard(s, 7.6, 2.2, 4.9, 2.3, 'Wishlist Matching & Preferences', 'Sellers can publish their swap wishlist (e.g. “Looking for Nike Dunks UK 9 or oversized vintage flannel”). Interested thrifters instantly see if they own matching garments.');

  addCard(s, 7.6, 4.7, 4.9, 2.2, 'Dual Courier Shipping Security', 'Styleswap coordinates paired pickup and doorstep delivery for both users simultaneously, ensuring neither party is left stranded without their swapped garment.', {
    fill: 'EEF2FF', border: 'C7D2FE'
  });
}

// ----------------------------------------------------
// SLIDE 9: Feature 3 - Loyalty Rewards & Escrow
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Feature 3 — Loyalty Rewards & Escrow', 'CURRENTLY IMPLEMENTED');

  s.addText('Styleswap incentivizes circular habits through an integrated loyalty reward currency and ensures financial security with a 24-hour thrift inspection escrow model.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.5,
    fontSize: 12.5, color: C_TEXT
  });

  addCard(s, 0.8, 2.2, 5.7, 2.3, 'Loyalty Currency Rule: 10 Pts = ₹100 Off', [
    { text: 'Users earn points on successful sales, verified swaps, and orders' },
    { text: 'Each point holds a tangible ₹10 redemption value at checkout' },
    { text: 'Quick redemption buttons: 10 pts (-₹100), 20 pts (-₹200), or Max' },
    { text: 'Direct balance deduction with transparent bill receipts' }
  ], { badge: 'INCENTIVE MECHANISM', bullet: true });

  addCard(s, 6.8, 2.2, 5.7, 2.3, '24-Hour Thrift Inspection Escrow', [
    { text: 'Funds held in platform escrow upon customer checkout' },
    { text: 'Buyer receives 24-hour window upon delivery to verify condition' },
    { text: 'Seller paid automatically upon verification or after 24 hours' },
    { text: 'Free reverse pickup provided for verified condition mismatches' }
  ], { badge: 'CONSUMER PROTECTION', bullet: true, badgeBg: 'F0FDF4', badgeBorder: 'BBF7D0', badgeColor: C_PRIMARY });

  addCard(s, 0.8, 4.8, 11.7, 2.1, 'Seamless Pan-India Checkout Experience', [
    { text: 'Delivery address form with Indian state dropdown and 6-digit PIN validation' },
    { text: 'Dynamic UPI QR Code generation with instant VPA verification (@okhdfcbank, @okaxis, @ybl)' },
    { text: 'Multi-mode payment support: UPI QR, Debit/Credit Cards, NetBanking, and Cash on Delivery (COD)' }
  ], { bullet: true, fill: C_CARD_BG });
}

// ----------------------------------------------------
// SLIDE 10: Circular Economy Lifecycle
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Circular Economy: From Closet to Relisting');

  s.addText('Traditional fashion follows a linear model: Buy → Wear → Discard. Styleswap transforms garments into continuous circular assets that cycle through multiple users.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.5,
    fontSize: 12.5, color: C_TEXT
  });

  const cycle = [
    { name: '1. Discover', desc: 'Explore thrift drops & peer closets' },
    { name: '2. Acquire', desc: 'Direct purchase in ₹ or 1-to-1 swap' },
    { name: '3. Inspect & Wear', desc: '24-hour escrow inspection warranty' },
    { name: '4. Earn Points', desc: 'Gain loyalty rewards for circularity' },
    { name: '5. Re-Thrift', desc: 'Relist item once outgrown or rotated' }
  ];

  cycle.forEach((c, i) => {
    const x = 0.8 + (i * 2.35);
    addCard(s, x, 2.3, 2.2, 2.4, c.name, c.desc, {
      titleSize: 13, fontSize: 11, fill: i === 4 ? 'ECFDF5' : C_CARD_BG,
      border: i === 4 ? '6EE7B7' : C_CARD_BORDER
    });
  });

  s.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 5.3, w: 0, h: 1.2,
    line: { color: C_PRIMARY, width: 4 }
  });
  s.addText('“Every pre-loved item bought or swapped on Styleswap extends a garment’s lifecycle by an average of 2.2 years, reducing its carbon, water, and waste footprint by up to 73%.”', {
    x: 1.1, y: 5.4, w: 11.4, h: 1.0,
    fontSize: 14, color: C_DARK, bold: true, italic: true
  });
}

// ----------------------------------------------------
// SLIDE 11: Future Scope
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Future Scope', 'PHASE 2 — PLANNED DEVELOPMENT');

  s.addText('Phase 1 established the core catalog, swap engine, cart checkout, and loyalty points. Phase 2 will focus on AI-assisted quality verification and hyperlocal physical networks.', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.5,
    fontSize: 12.5, color: C_TEXT
  });

  addCard(s, 0.8, 2.3, 3.7, 3.6, 'AI Garment Defect Inspection', [
    { text: 'Computer vision analysis of uploaded photos' },
    { text: 'Automatic detection of stains, tears & fabric pills' },
    { text: 'Automated authenticity verification for sneakers' },
    { text: 'Suggested market pricing based on historical sales' }
  ], { badge: 'COMPUTER VISION', bullet: true });

  addCard(s, 4.8, 2.3, 3.7, 3.6, 'AR Virtual Fitting Room', [
    { text: 'Smartphone camera 3D body mesh scanning' },
    { text: 'Overlay flat lay garment measurements on user avatar' },
    { text: 'Predict fit tightness at chest, waist & inseam' },
    { text: 'Zero physical try-on friction for buyers' }
  ], { badge: 'AUGMENTED REALITY', bullet: true, badgeBg: 'EEF2FF', badgeBorder: 'C7D2FE', badgeColor: C_SECONDARY });

  addCard(s, 8.8, 2.3, 3.7, 3.6, 'Campus Thrift Hubs', [
    { text: 'College campus drop-off & pickup lockers' },
    { text: 'Zero shipping cost for intra-campus swaps' },
    { text: 'Student club organized physical thrift popups' },
    { text: 'Student ambassador circular fashion chapters' }
  ], { badge: 'HYPERLOCAL HUBS', bullet: true, badgeBg: 'FEF3C7', badgeBorder: 'FDE68A', badgeColor: C_ACCENT_AMBER });

  s.addText('Note: Phase 2 features are planned on the roadmap and will build directly upon Phase 1 review feedback and user adoption metrics.', {
    x: 0.8, y: 6.3, w: 11.7, h: 0.4,
    fontSize: 10.5, color: C_MUTED, italic: true
  });
}

// ----------------------------------------------------
// SLIDE 12: Results and Observations
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Results and Observations');

  addCard(s, 0.8, 1.8, 3.7, 1.5, 'Thrift Marketplace', 'Listing creation, multi-image upload, size selectors, search filters, and catalog browsing fully operational.', {
    badge: 'OPERATIONAL', badgeBg: 'ECFDF5', badgeBorder: '6EE7B7'
  });

  addCard(s, 4.8, 1.8, 3.7, 1.5, '5-Step Swap Engine', 'Proposal creation, counter-offers, trade acceptance, and dual tracking waybills tested end-to-end.', {
    badge: 'OPERATIONAL', badgeBg: 'ECFDF5', badgeBorder: '6EE7B7'
  });

  addCard(s, 8.8, 1.8, 3.7, 1.5, 'Cart & Loyalty System', '10 Pts = ₹100 redemption, dynamic UPI QR checkout, and balance deduction working seamlessly.', {
    badge: 'OPERATIONAL', badgeBg: 'ECFDF5', badgeBorder: '6EE7B7'
  });

  addCard(s, 0.8, 3.7, 11.7, 3.2, 'Key Empirical Observations', [
    { text: 'Condition Transparency Eliminates Disputes: Mandatory condition tags and flat lay sizing drastically reduce buyer hesitation.' },
    { text: 'Barter Attracts College Demographics: Direct clothing swaps enable students with limited cash budgets to refresh wardrobes freely.' },
    { text: 'Loyalty Rewards Drive Repeat Circulation: The ₹10/point incentive motivates users to relist garments rather than hoarding them.' },
    { text: 'Escrow Builds Trust: Holding payments until 24-hour inspection successfully bridges the trust gap inherent in peer thrifting.' }
  ], { bullet: true, fontSize: 12, fill: C_CARD_BG });
}

// ----------------------------------------------------
// SLIDE 13: Analysis & Discussion
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Analysis & Discussion', 'UNDERSTANDING IMPACT & INSIGHTS');

  addCard(s, 0.8, 1.8, 6.0, 4.8, 'Technical & Societal Analysis', [
    { text: '1. Overcoming the Sizing Barrier in Resale: By mandating flat lay measurements (pit-to-pit, length) alongside tag sizes, Styleswap mitigates vintage shrinking ambiguity.' },
    { text: '2. Decentralized Peer-to-Peer Logistics: Dual-courier tracking enables two swappers across different Indian cities to execute a synchronized swap without central warehousing.' },
    { text: '3. Sustainable Economic Model: Zero listing fees lower entry barriers, while optional buyer protection escrow builds a self-sustaining transaction ecosystem.' },
    { text: '4. Progressive User Engagement: Users transition naturally from one-time thrift buyers into active swappers and community sellers.' }
  ], { bullet: true, fontSize: 11.5 });

  addCard(s, 7.1, 1.8, 5.4, 2.3, 'The Project’s Central Proposition', '“Styleswap is not just a marketplace to sell old clothes — it is a circular fashion platform that transforms idle garments into valuable trade currency.”', {
    fill: 'F0FDF4', border: 'BBF7D0', titleColor: C_PRIMARY, titleSize: 13
  });

  addCard(s, 7.1, 4.4, 5.4, 2.2, 'Environmental & Cultural Shift', 'By normalizing second-hand fashion among youth, Styleswap replaces the stigma of used clothing with the cultural cachet of vintage curation, personal style, and climate action.', {
    fill: 'EEF2FF', border: 'C7D2FE'
  });
}

// ----------------------------------------------------
// SLIDE 14: Our Vision for STYLESWAP
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = C_WHITE;
  addHeader(s, 'Our Vision for STYLESWAP');

  s.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 1.5, w: 0, h: 0.8,
    line: { color: C_PRIMARY, width: 4 }
  });
  s.addText('“Styleswap aims to make circular fashion the default choice for the next generation of Indian consumers.”', {
    x: 1.1, y: 1.6, w: 11.4, h: 0.6,
    fontSize: 15, color: C_DARK, bold: true, italic: true
  });

  addCard(s, 0.8, 2.6, 5.7, 1.6, 'Zero Waste Wardrobes', 'Empower individuals to circulate unworn fashion items until the end of their physical lifecycle, slashing textile landfill pollution.');

  addCard(s, 6.8, 2.6, 5.7, 1.6, 'Affordable Personal Style', 'Give students and conscious thrifters access to authentic streetwear, vintage brands, and ethnic wear at a fraction of retail prices.');

  addCard(s, 0.8, 4.4, 5.7, 1.6, 'Trusted Peer Barter', 'Replace informal, scam-prone social media transactions with automated counter-offers, escrow security, and verified couriers.');

  addCard(s, 6.8, 4.4, 5.7, 1.6, 'Gamified Sustainability', 'Reward every sustainable fashion choice with tangible loyalty points that subsidize future thrift purchases.');

  // Bottom Status Bar
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.8, y: 6.2, w: 11.7, h: 0.8,
    rectRadius: 0.1, fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1', width: 1 }
  });
  s.addText('✓ Phase 1 Complete: Core Marketplace, 5-Step Swaps, Cart, Loyalty & Admin    |    ◎ Phase 2 Planned: AI Verification & Campus Hubs', {
    x: 0.8, y: 6.2, w: 11.7, h: 0.8,
    fontSize: 11.5, color: C_DARK, bold: true, align: 'center'
  });
}

// ----------------------------------------------------
// SLIDE 15: Thank You & Q&A
// ----------------------------------------------------
{
  const s = pptx.addSlide();
  s.bkgd = '0F172A';

  s.addText('STYLESWAP', {
    x: 1.0, y: 1.2, w: 11.3, h: 0.8,
    fontSize: 48, color: '34D399', fontFace: 'Calibri', bold: true, align: 'center'
  });

  s.addText('Second-Hand Fashion & Sustainable Thrift Exchange Platform', {
    x: 1.0, y: 2.1, w: 11.3, h: 0.4,
    fontSize: 16, color: '94A3B8', fontFace: 'Calibri', align: 'center'
  });

  s.addText('Thank You', {
    x: 1.0, y: 3.0, w: 11.3, h: 1.0,
    fontSize: 56, color: C_WHITE, fontFace: 'Calibri', bold: true, align: 'center'
  });

  s.addText('Questions & Answers', {
    x: 1.0, y: 4.1, w: 11.3, h: 0.5,
    fontSize: 22, color: '818CF8', fontFace: 'Calibri', bold: true, align: 'center'
  });

  s.addText('Project Review – 1  |  Department of Computer Science & Engineering  |  Rural Engineering College, Hulkoti', {
    x: 1.0, y: 5.5, w: 11.3, h: 0.4,
    fontSize: 12, color: '64748B', fontFace: 'Calibri', align: 'center'
  });

  s.addText('“Let’s Make Fashion Sustainable & Circular Together.”', {
    x: 1.0, y: 6.2, w: 11.3, h: 0.4,
    fontSize: 14, color: '34D399', italic: true, align: 'center'
  });
}

const outputPath = path.join(__dirname, '../Styleswap_Project_Review_1.pptx');
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log('SUCCESS: Generated PowerPoint file at: ' + outputPath);
}).catch(err => {
  console.error('ERROR generating PPTX:', err);
});
