const http = require('http');

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING TEST SUITE FOR USER FIXES ===');

  // 1. Log in buyer (Sample User: Ananya Verma)
  console.log('\n[1] Logging in Buyer (ananya@prelovedwardrobe.in)...');
  const buyerLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, {
    email: 'ananya@prelovedwardrobe.in',
    password: 'User@12345'
  });

  if (buyerLoginRes.statusCode !== 200 || !buyerLoginRes.json || !buyerLoginRes.json.token) {
    throw new Error('Buyer login failed: ' + buyerLoginRes.data);
  }
  const buyerToken = buyerLoginRes.json.token;
  const buyerCookie = `token=${buyerToken}`;
  console.log('✓ Buyer (Ananya) logged in successfully!');

  // 2. Log in Seller (Sample User: Rohan Sharma)
  console.log('\n[2] Logging in Seller (rohan@thriftfinds.in)...');
  const sellerLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, {
    email: 'rohan@thriftfinds.in',
    password: 'User@12345'
  });

  if (sellerLoginRes.statusCode !== 200 || !sellerLoginRes.json || !sellerLoginRes.json.token) {
    throw new Error('Seller login failed: ' + sellerLoginRes.data);
  }
  const sellerToken = sellerLoginRes.json.token;
  const sellerCookie = `token=${sellerToken}`;
  console.log('✓ Seller (Rohan) logged in successfully!');

  // 3. Create a fresh target listing by Seller (Rohan)
  console.log('\n[3] Creating a fresh test listing owned by Seller (Rohan)...');
  const listingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/listings',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  const categoryId = listingsRes.json.data[0].category._id || listingsRes.json.data[0].category;

  const createListingRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/listings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': sellerCookie
    }
  }, {
    title: 'Vintage 90s Leather Jacket ' + Date.now().toString().slice(-4),
    description: 'Authentic second-hand oversized jacket in stellar condition.',
    category: categoryId,
    size: 'L',
    price: 1500,
    condition: 'Gently Used (Good Condition)',
    type: 'both'
  });

  if (createListingRes.statusCode !== 201 || !createListingRes.json.success) {
    throw new Error('Failed to create test listing: ' + createListingRes.data);
  }
  const sellerListing = createListingRes.json.data;
  console.log(`✓ Target listing created: "${sellerListing.title}" (ID: ${sellerListing._id}, Price: ₹${sellerListing.price})`);

  // 4. Test Chat: Buyer sends a message
  console.log('\n[4] Testing Chat: Buyer sending a message to Seller...');
  const sendMsgRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/chat/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': buyerCookie
    }
  }, {
    listingId: sellerListing._id,
    text: 'Hello! Is this item still available and what is the condition?'
  });

  console.log('Send message response status:', sendMsgRes.statusCode);
  if (sendMsgRes.statusCode !== 201 || !sendMsgRes.json || !sendMsgRes.json.success) {
    throw new Error('Failed to send message: ' + sendMsgRes.data);
  }
  const convId = sendMsgRes.json.data.conversationId;
  console.log(`✓ Message sent successfully! Conversation ID: ${convId}`);

  // 5. Test Active Conversation retrieval via /api/chat/conversation/active?conversationId=...
  console.log('\n[5] Testing /api/chat/conversation/active retrieval...');
  const getActiveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/chat/conversation/active?conversationId=${convId}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cookie': buyerCookie
    }
  });

  if (getActiveRes.statusCode !== 200 || !getActiveRes.json || !getActiveRes.json.success) {
    throw new Error('Failed to retrieve active conversation: ' + getActiveRes.data);
  }
  console.log(`✓ Active conversation retrieved! Messages count: ${getActiveRes.json.data.messages.length}`);

  // 6. Test Seller reply in chat
  console.log('\n[6] Testing Seller reply in chat...');
  const sellerReplyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/chat/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': sellerCookie
    }
  }, {
    conversationId: convId,
    text: 'Yes, it is in excellent condition and ready to dispatch!'
  });

  if (sellerReplyRes.statusCode !== 201 || !sellerReplyRes.json.success) {
    throw new Error('Seller reply failed: ' + sellerReplyRes.data);
  }
  console.log('✓ Seller replied successfully in the conversation!');

  // 7. Test Make an Offer & Chat Notification
  console.log('\n[7] Testing Make an Offer (Buyer -> Seller) and checking Chat Notification...');
  const offerPrice = Math.round(sellerListing.price * 0.85);
  const makeOfferRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/listings/${sellerListing._id}/offer`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': buyerCookie
    }
  }, {
    listingId: sellerListing._id,
    offeredPrice: offerPrice,
    message: 'Can you do this price for quick purchase?'
  });

  if (![200, 201].includes(makeOfferRes.statusCode) || !makeOfferRes.json.success) {
    throw new Error('Make offer failed: ' + makeOfferRes.data);
  }
  const offerId = makeOfferRes.json.data._id;
  console.log(`✓ Offer of ₹${offerPrice} created! Offer ID: ${offerId}`);

  // Verify chat conversation has the offer message
  const convAfterOffer = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/chat/conversation/active?conversationId=${convId}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Cookie': buyerCookie }
  });
  const offerMsgs = convAfterOffer.json.data.messages.filter(m => m.text.includes('Price Offer'));
  if (offerMsgs.length === 0) {
    throw new Error('Chat does not contain the price offer notification message!');
  }
  console.log('✓ Verified: Chat notification for the new price offer is present in conversation!');
  console.log('   Message snippet:', offerMsgs[offerMsgs.length - 1].text);

  // 8. Test Seller Accepts Offer & Checks Chat Notification
  console.log('\n[8] Testing Seller Accepts Offer...');
  const acceptOfferRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/offers/${offerId}/respond`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': sellerCookie
    }
  }, {
    action: 'accept',
    note: 'Deal! Accepted offer.'
  });

  if (acceptOfferRes.statusCode !== 200 || !acceptOfferRes.json.success) {
    throw new Error('Accept offer failed: ' + acceptOfferRes.data);
  }
  console.log('✓ Seller accepted the offer successfully!');

  // Verify chat has the acceptance notification with checkout link
  const convAfterAccept = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/chat/conversation/active?conversationId=${convId}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Cookie': buyerCookie }
  });
  const acceptMsgs = convAfterAccept.json.data.messages.filter(m => m.text.includes('Offer Accepted'));
  if (acceptMsgs.length === 0) {
    throw new Error('Chat does not contain the offer accepted notification message!');
  }
  console.log('✓ Verified: Chat notification for Offer Accepted with checkout link is present!');
  console.log('   Message snippet:', acceptMsgs[acceptMsgs.length - 1].text);

  // 9. Verify Checkout Page reflects the accepted offer price
  console.log('\n[9] Verifying Checkout Page renders the accepted offer price...');
  const checkoutPageRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/checkout/${sellerListing._id}`,
    method: 'GET',
    headers: { 'Cookie': buyerCookie }
  });

  if (checkoutPageRes.statusCode !== 200) {
    throw new Error('Failed to load checkout page: HTTP ' + checkoutPageRes.statusCode);
  }
  if (!checkoutPageRes.data.includes('Offer Applied') && !checkoutPageRes.data.includes(`₹${offerPrice.toLocaleString('en-IN')}`)) {
    throw new Error('Checkout page does not show the discounted offer price!');
  }
  console.log(`✓ Verified: Checkout page loads with "Offer Applied" at discounted price ₹${offerPrice}!`);

  // 10. Test Swap: View swap page and check user's offering pieces
  console.log('\n[10] Testing Swap Page for Buyer...');
  const swapPageRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/listings/${sellerListing._id}/swap`,
    method: 'GET',
    headers: { 'Cookie': buyerCookie }
  });

  if (swapPageRes.statusCode !== 200) {
    throw new Error('Swap page failed to render: HTTP ' + swapPageRes.statusCode);
  }
  if (!swapPageRes.data.includes('2. Your Offering Piece') || !swapPageRes.data.includes('From My Wardrobe')) {
    throw new Error('Swap page is missing 2. Your Offering Piece or From My Wardrobe!');
  }
  console.log('✓ Verified: Swap page renders with interactive "2. Your Offering Piece", quick select, and wardrobe items!');

  // 11. Test Proposing a Swap & Verifying Chat Notification
  console.log('\n[11] Proposing a Swap and verifying Chat Notification...');
  // Get Vinayak's approved listing to offer
  const buyerListingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/listings',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  let buyerPiece = buyerListingsRes.json.data.find(l => {
    const sId = l.sellerId ? (l.sellerId._id || l.sellerId) : null;
    return sId && sId.toString() === buyerLoginRes.json.user._id.toString() && l.status === 'approved';
  });

  if (!buyerPiece) {
    const createPieceRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/listings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': buyerCookie
      }
    }, {
      title: 'Zara Silk Slip Midi Dress ' + Date.now().toString().slice(-4),
      description: 'Elegant emerald green slip dress, gently used.',
      category: categoryId,
      size: 'M',
      price: 1200,
      condition: 'Like New (Barely Worn)',
      type: 'both'
    });
    buyerPiece = createPieceRes.json.data;
  }

  const proposeSwapRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/transactions/exchange',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': buyerCookie
    }
  }, {
    listingId: sellerListing._id,
    exchangeItemId: buyerPiece._id,
    cashTopUp: 200,
    notes: 'Offering my hoodie + ₹200 cash difference for this trade!'
  });

  if (proposeSwapRes.statusCode !== 201 || !proposeSwapRes.json.success) {
    throw new Error('Failed to propose swap: ' + proposeSwapRes.data);
  }
  const swapTxId = proposeSwapRes.json.data._id;
  console.log(`✓ Swap proposed successfully! Transaction ID: ${swapTxId}`);

  // Verify chat has swap proposal notification
  const convAfterSwap = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/chat/conversation/active?conversationId=${convId}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Cookie': buyerCookie }
  });
  const swapMsgs = convAfterSwap.json.data.messages.filter(m => m.text.includes('Swap Proposal'));
  if (swapMsgs.length === 0) {
    throw new Error('Chat does not contain the swap proposal notification message!');
  }
  console.log('✓ Verified: Chat notification for Swap Proposal is present!');
  console.log('   Message snippet:', swapMsgs[swapMsgs.length - 1].text);

  // 12. Test Seller Responds to Swap
  console.log('\n[12] Testing Seller Responds to Swap (Accept)...');
  const respondSwapRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/transactions/${swapTxId}/respond`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': sellerCookie
    }
  }, {
    action: 'accept',
    responseNote: 'Awesome piece, deal accepted!'
  });

  if (respondSwapRes.statusCode !== 200 || !respondSwapRes.json.success) {
    throw new Error('Seller respond to swap failed: ' + respondSwapRes.data);
  }
  console.log('✓ Swap accepted by seller!');

  // Verify chat has swap accepted notification
  const convAfterSwapAccept = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/chat/conversation/active?conversationId=${convId}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Cookie': buyerCookie }
  });
  const swapAcceptedMsgs = convAfterSwapAccept.json.data.messages.filter(m => m.text.includes('Swap Accepted'));
  if (swapAcceptedMsgs.length === 0) {
    throw new Error('Chat does not contain the swap accepted notification message!');
  }
  console.log('✓ Verified: Chat notification for Swap Accepted is present!');
  console.log('   Message snippet:', swapAcceptedMsgs[swapAcceptedMsgs.length - 1].text);

  console.log('\n====================================================');
  console.log('🎉 ALL 3 FEATURES & ISSUES VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED at step:', err.message);
  console.error(err.stack);
  process.exit(1);
});
