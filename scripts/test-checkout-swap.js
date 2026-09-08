const http = require('http');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const makeRequest = (options, postData = null, cookie = null) => {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    if (postData && !headers['Content-Type']) {
      headers['Content-Type'] = typeof postData === 'string' ? 'application/x-www-form-urlencoded' : 'application/json';
    }

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

async function testCheckoutAndSwap() {
  console.log('====================================================');
  console.log('🧪 Testing Styleswap Checkout & Swap Purchase Flow');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;
  const assert = (title, condition, details = '') => {
    total++;
    if (condition) {
      passed++;
      console.log(`✓ [PASS] ${title}`);
    } else {
      console.error(`✗ [FAIL] ${title} - ${details}`);
    }
  };

  try {
    // 1. Login as Arjun (Buyer)
    const loginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST'
      },
      {
        email: 'arjun.patel98@gmail.com',
        password: 'User@12345'
      }
    );
    const loginData = JSON.parse(loginRes.body);
    assert('User Login (Arjun)', loginRes.statusCode === 200 && loginData.token);
    const arjunCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : `token=${loginData.token}`;

    // 2. Find an active listing not owned by Arjun
    const listingsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/listings',
      method: 'GET'
    });
    const listings = JSON.parse(listingsRes.body).data;
    const arjunUserId = (loginData.user._id || loginData.user.id).toString();
    const targetListing = listings.find(l => {
      const sId = (l.sellerId && l.sellerId._id) ? l.sellerId._id.toString() : (l.sellerId ? l.sellerId.toString() : '');
      return sId !== arjunUserId && l.status === 'approved';
    });
    assert('Found Active Listing for Purchase', !!targetListing, 'No available item found');

    if (targetListing) {
      // 3. GET /checkout/:listingId
      const checkoutPageRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/checkout/${targetListing._id}`,
          method: 'GET'
        },
        null,
        arjunCookie
      );
      assert(
        'GET /checkout/:id (Checkout Page Loads with UPI & Cards)',
        checkoutPageRes.statusCode === 200 &&
        checkoutPageRes.body.includes('Secure Order Checkout') &&
        checkoutPageRes.body.includes('Select Payment Method') &&
        checkoutPageRes.body.includes('UPI') &&
        checkoutPageRes.body.includes('RuPay'),
        `Status: ${checkoutPageRes.statusCode}`
      );

      // 4. POST /checkout/:listingId (Direct Purchase Payment)
      const postCheckoutData = `fullName=Arjun+Patel&phone=9876543210&deliveryAddress=Flat+402%2C+Green+Glen+Layout&city=Bengaluru&state=Karnataka&pincode=560103&paymentMethod=UPI&upiId=arjun%40okhdfcbank`;
      const orderRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/checkout/${targetListing._id}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        },
        postCheckoutData,
        arjunCookie
      );
      
      const redirected = orderRes.statusCode === 302;
      const redirectLocation = orderRes.headers['location'] || '';
      assert('POST /checkout/:id (Order Placed & Redirects)', redirected && redirectLocation.includes('/checkout/success/'), `Status ${orderRes.statusCode}, Loc: ${redirectLocation}`);

      if (redirectLocation) {
        // 5. GET Order Success Page
        const successRes = await makeRequest(
          {
            hostname: 'localhost',
            port: 5000,
            path: redirectLocation,
            method: 'GET'
          },
          null,
          arjunCookie
        );
        assert(
          'GET /checkout/success/:id (Order Receipt Page)',
          successRes.statusCode === 200 &&
          successRes.body.includes('Thank You for Your Order!') &&
          successRes.body.includes('Delhivery Express') &&
          successRes.body.includes('Payment & Order Confirmed'),
          `Status: ${successRes.statusCode}`
        );
      }
    }

    // 6. Test Swap with Cash Top-Up
    // Login as Pooja (Seller/Partner)
    const poojaLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST'
      },
      {
        email: 'pooja.iyer.thrift@gmail.com',
        password: 'User@12345'
      }
    );
    const poojaData = JSON.parse(poojaLoginRes.body);
    const poojaCookie = poojaLoginRes.headers['set-cookie'] ? poojaLoginRes.headers['set-cookie'][0].split(';')[0] : `token=${poojaData.token}`;

    // Re-fetch listings to find current active items
    const latestListingsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/listings?limit=100',
      method: 'GET'
    });
    const latestListings = JSON.parse(latestListingsRes.body).data;

    const getSellerId = (l) => (l && l.sellerId ? ((l.sellerId._id || l.sellerId).toString()) : null);
    const poojaUserId = (poojaData.user._id || poojaData.user.id).toString();

    const arjunItem = latestListings.find(l => getSellerId(l) === arjunUserId && l.status === 'approved');
    const poojaItem = latestListings.find(l => getSellerId(l) === poojaUserId && l.status === 'approved');

    if (arjunItem && poojaItem) {
      // Pooja proposes swap with ₹300 cash top-up
      const swapPostData = `listingId=${arjunItem._id}&exchangeItemId=${poojaItem._id}&cashTopUp=300&notes=Adding+300+rupees+cash+difference`;
      const swapRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/transactions/exchange',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        },
        swapPostData,
        poojaCookie
      );
      assert('POST /transactions/exchange (Swap with ₹300 Cash Top-Up Submitted)', swapRes.statusCode === 302);

      // Check Pooja dashboard for swap
      const dashRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/user/dashboard',
          method: 'GET'
        },
        null,
        poojaCookie
      );
      assert('Dashboard Displays Cash Top-Up Badge', dashRes.statusCode === 200 && dashRes.body.includes('Top-up'));

      // Connect DB to verify and test swap checkout
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect('mongodb://127.0.0.1:27017/smart_wear_exchange');
      }

      const swapTx = await Transaction.findOne({
        listingId: arjunItem._id,
        exchangeItemId: poojaItem._id,
        status: 'pending'
      }).sort({ createdAt: -1 });

      assert('Swap Transaction Created in DB with cashTopUp: 300', !!swapTx && swapTx.cashTopUp === 300);

      if (swapTx) {
        // 7. GET /checkout/swap/:transactionId (Swap Courier & Assurance Checkout Page)
        const swapCheckoutRes = await makeRequest(
          {
            hostname: 'localhost',
            port: 5000,
            path: `/checkout/swap/${swapTx._id}`,
            method: 'GET'
          },
          null,
          poojaCookie
        );
        assert(
          'GET /checkout/swap/:id (Swap Checkout Page)',
          swapCheckoutRes.statusCode === 200 &&
          swapCheckoutRes.body.includes('Swap Courier'),
          `Status: ${swapCheckoutRes.statusCode}`
        );

        // 8. POST /checkout/swap/:transactionId (Complete Swap Payment)
        const swapPayData = `fullName=Pooja+Iyer&phone=9845199887&deliveryAddress=19+12th+Main%2C+Indiranagar&city=Bengaluru&state=Karnataka&pincode=560038&paymentMethod=UPI&upiId=pooja%40okhdfcbank`;
        const swapPayRes = await makeRequest(
          {
            hostname: 'localhost',
            port: 5000,
            path: `/checkout/swap/${swapTx._id}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          },
          swapPayData,
          poojaCookie
        );
        const swapRedirect = swapPayRes.statusCode === 302;
        const swapLocation = swapPayRes.headers['location'] || '';
        assert('POST /checkout/swap/:id (Swap Payment Processed & Redirects)', swapRedirect && swapLocation.includes('/checkout/success/'));

        if (swapLocation) {
          // 9. GET Swap Success Page
          const swapSuccessRes = await makeRequest(
            {
              hostname: 'localhost',
              port: 5000,
              path: swapLocation,
              method: 'GET'
            },
            null,
            poojaCookie
          );
          assert(
            'GET /checkout/success/:id (Swap Receipt with Both Items)',
            swapSuccessRes.statusCode === 200 &&
            swapSuccessRes.body.includes('Item You Receive') &&
            swapSuccessRes.body.includes('Item You Dispatch') &&
            swapSuccessRes.body.includes('Payment & Order Confirmed')
          );
        }
      }
    }

    console.log(`\n====================================================`);
    console.log(`Results: ${passed} / ${total} Tests Passed`);
    console.log(`====================================================`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed:', err);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

testCheckoutAndSwap();
