process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const http = require('http');
const connectDB = require('../config/db');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Offer = require('../models/Offer');
const Transaction = require('../models/Transaction');
const SwapRequest = require('../models/SwapRequest');
const Conversation = require('../models/Conversation');
const app = require('../server');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE ACCEPT/DECLINE TEST SUITE');
  console.log('====================================================\n');

  await connectDB();

  // 1. Fetch test users
  const seller = await User.findOne({ email: 'pooja.iyer.thrift@gmail.com' });
  const buyer = await User.findOne({ email: 'arjun.patel98@gmail.com' });

  if (!seller || !buyer) {
    console.error('❌ Test users pooja and arjun not found in DB!');
    process.exit(1);
  }

  const sellerToken = seller.generateAuthToken();
  const buyerToken = buyer.generateAuthToken();

  // Find or create test listings
  let sellerListing = await Listing.findOne({ sellerId: seller._id, status: 'approved' });
  if (!sellerListing) {
    sellerListing = await Listing.create({
      title: 'Silk Vintage Kurti',
      description: 'Test thrift item for offer and swap tests',
      price: 1800,
      sellerId: seller._id,
      category: new mongoose.Types.ObjectId(),
      type: 'both',
      status: 'approved',
      images: ['/images/placeholder-item.jpg']
    });
  }

  let buyerListing = await Listing.findOne({ sellerId: buyer._id });
  if (!buyerListing) {
    buyerListing = await Listing.create({
      title: 'Denim Jacket',
      description: 'Buyer swap item',
      price: 1600,
      sellerId: buyer._id,
      category: new mongoose.Types.ObjectId(),
      type: 'exchange',
      status: 'approved',
      images: ['/images/placeholder-item.jpg']
    });
  }

  // Start ephemeral HTTP server
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Server listening on ${baseUrl}\n`);

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: SwapRequest model -> Accept
    // -------------------------------------------------------------
    console.log('TEST 1: SwapRequest Model -> Accept Action');
    const swap1 = await SwapRequest.create({
      proposerId: buyer._id,
      receiverId: seller._id,
      targetListingId: sellerListing._id,
      offeredListingId: buyerListing._id,
      status: 'pending',
      cashTopUp: 200,
      notes: 'Test swap offer for automated verification'
    });

    const res1 = await fetch(`${baseUrl}/api/swaps/${swap1._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    const data1 = await res1.json();
    assert(res1.status === 200 && data1.success === true, 'Accepting SwapRequest returns 200 with success: true');
    
    const updatedSwap1 = await SwapRequest.findById(swap1._id);
    assert(updatedSwap1.status === 'accepted', 'SwapRequest status in DB is updated to "accepted"');

    // Duplicate test: re-accepting must return error (prevent duplicate action)
    const dupRes1 = await fetch(`${baseUrl}/api/swaps/${swap1._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    const dupData1 = await dupRes1.json();
    assert(dupRes1.status === 400 && dupData1.success === false, 'Duplicate accept returns 400 to prevent duplicate actions');

    // Clean up test 1
    await SwapRequest.findByIdAndDelete(swap1._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 2: SwapRequest model -> Decline
    // -------------------------------------------------------------
    console.log('TEST 2: SwapRequest Model -> Decline Action');
    const swap2 = await SwapRequest.create({
      proposerId: buyer._id,
      receiverId: seller._id,
      targetListingId: sellerListing._id,
      offeredListingId: buyerListing._id,
      status: 'pending',
      cashTopUp: 0,
      notes: 'Test swap to decline'
    });

    const res2 = await fetch(`${baseUrl}/api/swaps/${swap2._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'decline' })
    });
    const data2 = await res2.json();
    assert(res2.status === 200 && data2.success === true, 'Declining SwapRequest returns 200 with success: true');
    
    const updatedSwap2 = await SwapRequest.findById(swap2._id);
    assert(updatedSwap2.status === 'rejected', 'SwapRequest status in DB is updated to "rejected"');

    // Duplicate test: re-declining must return 400
    const dupRes2 = await fetch(`${baseUrl}/api/swaps/${swap2._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'decline' })
    });
    assert(dupRes2.status === 400, 'Duplicate decline returns 400 to prevent duplicate actions');

    // Clean up test 2
    await SwapRequest.findByIdAndDelete(swap2._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 3: Exchange Transaction model -> Accept & Cross-Forwarding
    // -------------------------------------------------------------
    console.log('TEST 3: Exchange Transaction Model -> Accept Action with Sanitization & Cross-Forwarding');
    const exTrans1 = await Transaction.create({
      buyerId: buyer._id,
      sellerId: seller._id,
      listingId: sellerListing._id,
      exchangeItemId: buyerListing._id,
      type: 'exchange',
      amount: 0,
      totalPaid: 0,
      cashTopUp: 150,
      status: 'pending',
      orderStatus: 'Order Placed',
      deliveryAddress: '123 Test Street, Bangalore'
    });

    // Accept via /api/swaps/:id/respond (cross-forwarding verification)
    const res3 = await fetch(`${baseUrl}/api/swaps/${exTrans1._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    const data3 = await res3.json();
    assert(res3.status === 200 && data3.success === true, 'Cross-forwarding to exchange transaction returns 200 success');

    const updatedEx1 = await Transaction.findById(exTrans1._id);
    assert(updatedEx1.status === 'completed', 'Transaction status is updated to "completed"');
    assert(updatedEx1.orderStatus === 'Confirmed', 'Transaction orderStatus is updated to "Confirmed"');

    // Clean up test 3
    await Transaction.findByIdAndDelete(exTrans1._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 4: Exchange Transaction model -> Decline
    // -------------------------------------------------------------
    console.log('TEST 4: Exchange Transaction Model -> Decline Action');
    const exTrans2 = await Transaction.create({
      buyerId: buyer._id,
      sellerId: seller._id,
      listingId: sellerListing._id,
      exchangeItemId: buyerListing._id,
      type: 'exchange',
      amount: 0,
      totalPaid: 0,
      status: 'pending',
      orderStatus: 'Order Placed',
      deliveryAddress: '456 Test Street, Mumbai'
    });

    const res4 = await fetch(`${baseUrl}/transactions/${exTrans2._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'decline' })
    });
    const data4 = await res4.json();
    assert(res4.status === 200 && data4.success === true, 'Declining exchange transaction returns 200 success');

    const updatedEx2 = await Transaction.findById(exTrans2._id);
    assert(updatedEx2.status === 'rejected', 'Transaction status is updated to "rejected"');
    assert(updatedEx2.orderStatus === 'Cancelled', 'Transaction orderStatus is updated to "Cancelled"');

    // Clean up test 4
    await Transaction.findByIdAndDelete(exTrans2._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 5: Make an Offer -> Accept Action
    // -------------------------------------------------------------
    console.log('TEST 5: Make an Offer -> Accept Action');
    const offer1 = await Offer.create({
      listingId: sellerListing._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      offeredPrice: 1400,
      message: 'Can you do 1400?',
      status: 'pending'
    });

    const res5 = await fetch(`${baseUrl}/api/offers/${offer1._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    const data5 = await res5.json();
    assert(res5.status === 200 && data5.success === true, 'Accepting offer returns 200 with success: true');

    const updatedOffer1 = await Offer.findById(offer1._id);
    assert(updatedOffer1.status === 'accepted', 'Offer status in DB is updated to "accepted"');

    // Duplicate action prevention:
    const dupRes5 = await fetch(`${baseUrl}/api/offers/${offer1._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    assert(dupRes5.status === 400, 'Duplicate offer accept returns 400');

    // Clean up test 5
    await Offer.findByIdAndDelete(offer1._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 6: Make an Offer -> Decline Action
    // -------------------------------------------------------------
    console.log('TEST 6: Make an Offer -> Decline Action');
    const offer2 = await Offer.create({
      listingId: sellerListing._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      offeredPrice: 1200,
      message: 'Take 1200?',
      status: 'pending'
    });

    const res6 = await fetch(`${baseUrl}/api/offers/${offer2._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'decline' })
    });
    const data6 = await res6.json();
    assert(res6.status === 200 && data6.success === true, 'Declining offer returns 200 with success: true');

    const updatedOffer2 = await Offer.findById(offer2._id);
    assert(updatedOffer2.status === 'rejected', 'Offer status in DB is updated to "rejected"');

    // Duplicate action prevention:
    const dupRes6 = await fetch(`${baseUrl}/api/offers/${offer2._id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      },
      body: JSON.stringify({ action: 'decline' })
    });
    assert(dupRes6.status === 400, 'Duplicate offer decline returns 400');

    // Clean up test 6
    await Offer.findByIdAndDelete(offer2._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST 7: Messages Sync & State Reflection in Chat
    // -------------------------------------------------------------
    console.log('TEST 7: Messages Sync & Conversation Active Endpoint');
    // Create an offer and conversation
    const testOffer = await Offer.create({
      listingId: sellerListing._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      offeredPrice: 1550,
      status: 'accepted'
    });

    let conv = await Conversation.findOne({ listingId: sellerListing._id, buyerId: buyer._id });
    if (!conv) {
      conv = await Conversation.create({
        listingId: sellerListing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        offerId: testOffer._id,
        messages: [{
          sender: buyer._id,
          text: '🏷️ New Price Offer: I submitted an offer of ₹1,550 for Silk Vintage Kurti.',
          type: 'offer',
          offerId: testOffer._id,
          actionStatus: 'pending',
          metadata: { offeredPrice: 1550 }
        }]
      });
    } else {
      conv.offerId = testOffer._id;
      conv.messages.push({
        sender: buyer._id,
        text: '🏷️ New Price Offer: I submitted an offer of ₹1,550 for Silk Vintage Kurti.',
        type: 'offer',
        offerId: testOffer._id,
        actionStatus: 'pending',
        metadata: { offeredPrice: 1550 }
      });
      await conv.save();
    }

    // Call active conversation endpoint as seller
    const chatRes = await fetch(`${baseUrl}/api/chat/conversation/active?conversationId=${conv._id}`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `token=${sellerToken}`
      }
    });
    const chatData = await chatRes.json();
    assert(chatRes.status === 200 && chatData.success === true, 'Chat active endpoint returns 200 success');

    const syncedMsg = chatData.data.messages.find(m => m.offerId && m.offerId.toString() === testOffer._id.toString());
    assert(syncedMsg && syncedMsg.actionStatus === 'accepted', 'Chat conversation automatically synchronized message actionStatus to "accepted"');

    // Clean up test 7
    await Offer.findByIdAndDelete(testOffer._id);
    await Conversation.findByIdAndUpdate(conv._id, { $pull: { messages: { offerId: testOffer._id } } });
    console.log('');

    // -------------------------------------------------------------
    // TEST 8: Dashboard Page Render Persistence
    // -------------------------------------------------------------
    console.log('TEST 8: Dashboard Page Render Persistence');
    const dashRes = await fetch(`${baseUrl}/user/dashboard`, {
      headers: {
        'Cookie': `token=${sellerToken}`
      }
    });
    assert(dashRes.status === 200, 'GET /user/dashboard renders with HTTP 200');
    const dashHtml = await dashRes.text();
    assert(dashHtml.includes('handleDashboardSwapAction'), 'Dashboard HTML contains handleDashboardSwapAction');
    assert(dashHtml.includes('handleDashboardOfferAction'), 'Dashboard HTML contains handleDashboardOfferAction');
    assert(dashHtml.includes('showStyleswapToast'), 'Dashboard HTML contains showStyleswapToast');
    console.log('');

    console.log('====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests();
