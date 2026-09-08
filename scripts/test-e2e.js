const http = require('http');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Running Indian Second-Hand & Thrift Market E2E Suite');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const test = (title, condition, details = '') => {
    total++;
    if (condition) {
      passed++;
      console.log(`✓ [PASS] ${title}`);
    } else {
      console.error(`✗ [FAIL] ${title} - ${details}`);
    }
  };

  try {
    // 1. Homepage
    const homeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET'
    });
    test('GET / (Home Page)', homeRes.statusCode === 200 && homeRes.body.includes('Styleswap'));

    // 2. Marketplace Catalog
    const listingsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/listings',
      method: 'GET'
    });
    test('GET /listings (Indian Thrift Catalog)', listingsRes.statusCode === 200 && listingsRes.body.includes('Thrifted Denim & Cargoes'));

    // 3. API Listings
    const apiListingsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/listings',
      method: 'GET'
    });
    const listingsJson = JSON.parse(apiListingsRes.body);
    test('GET /api/listings (JSON API)', apiListingsRes.statusCode === 200 && listingsJson.success && listingsJson.data.length > 0);

    const firstListing = listingsJson.data[0];

    // 4. Listing Detail Page
    const detailRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/listings/${firstListing._id}`,
      method: 'GET'
    });
    test('GET /listings/:id (Product Detail in ₹)', detailRes.statusCode === 200 && detailRes.body.includes(firstListing.title));

    // 5. Admin Login
    const adminLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'admin@smartware.com',
        password: 'Admin@12345'
      }
    );
    const adminAuth = JSON.parse(adminLoginRes.body);
    test('POST /api/auth/login (Admin Auth)', adminLoginRes.statusCode === 200 && adminAuth.token && adminAuth.user.role === 'admin');

    const adminToken = adminAuth.token;

    // 6. Indian User Login (Rohan Sharma)
    const userLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: 'rohan@thriftfinds.in',
        password: 'User@12345'
      }
    );
    const userAuth = JSON.parse(userLoginRes.body);
    test('POST /api/auth/login (Indian Thrift User Auth)', userLoginRes.statusCode === 200 && userAuth.token);

    const userToken = userAuth.token;

    // 7. Protected Route with Token: /api/auth/me
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const meJson = JSON.parse(meRes.body);
    test('GET /api/auth/me (Protected Route)', meRes.statusCode === 200 && meJson.user.email === 'rohan@thriftfinds.in');

    // 8. Admin Portal Dashboard & Stats
    const adminStatsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsJson = JSON.parse(adminStatsRes.body);
    test('GET /api/admin/stats (Admin Analytics)', adminStatsRes.statusCode === 200 && statsJson.stats.totalUsers >= 4);

    // 9. Admin CSV Exports
    const usersCsvRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/admin/export/users',
      method: 'GET',
      headers: { Cookie: `token=${adminToken}` }
    });
    test('GET /admin/export/users (CSV Export)', usersCsvRes.statusCode === 200 && usersCsvRes.body.includes('admin@smartware.com'));

    const listingsCsvRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/admin/export/listings',
      method: 'GET',
      headers: { Cookie: `token=${adminToken}` }
    });
    test('GET /admin/export/listings (CSV Export)', listingsCsvRes.statusCode === 200 && listingsCsvRes.body.includes('Title'));

    // 10. Direct Purchase Flow in Rupees (₹)
    const sellableListing = listingsJson.data.find(
      (l) => l.sellerId._id !== userAuth.user.id && (l.type === 'sell' || l.type === 'both') && l.status === 'approved'
    );

    if (sellableListing) {
      const buyRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/transactions/buy',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
          }
        },
        {
          listingId: sellableListing._id,
          deliveryAddress: '88 Koramangala 4th Block, Bengaluru, Karnataka 560034',
          notes: 'Test second-hand purchase in Indian Rupees'
        }
      );
      const buyJson = JSON.parse(buyRes.body);
      test('POST /api/transactions/buy (Direct Purchase in ₹)', buyRes.statusCode === 201 && buyJson.success);
    }

    // 11. Propose Item Exchange Flow (Creating a fresh listing to test swap cleanly)
    const randTag = Date.now().toString().slice(-4);
    const newListingRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/listings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        title: `Thrifted Lee Vintage Faded Denim Shirt ${randTag} (Size L)`,
        description: 'Authentic 90s light wash denim workwear shirt. Clean pearl snap buttons, twin chest pockets.',
        category: firstListing.category._id,
        price: 899,
        condition: 'Thrifted / Vintage Fade',
        type: 'both',
        location: 'Bengaluru, Karnataka'
      }
    );
    const newListingJson = JSON.parse(newListingRes.body);

    // Pick target that is not owned by user and not the one just bought
    const exchTarget = listingsJson.data.find(
      (l) => l.sellerId._id !== userAuth.user.id && (l.type === 'exchange' || l.type === 'both') && l.status === 'approved' && (!sellableListing || l._id !== sellableListing._id)
    );

    if (exchTarget && newListingJson.data) {
      const exchRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/transactions/exchange',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
          }
        },
        {
          listingId: exchTarget._id,
          exchangeItemId: newListingJson.data._id,
          notes: 'Would love to swap for this item. Based in Bengaluru!'
        }
      );
      const exchJson = JSON.parse(exchRes.body);
      test('POST /api/transactions/exchange (Item Barter Proposal)', exchRes.statusCode === 201 && exchJson.success);
    }

    // 12. User Moderation / Ban Toggle
    const banRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/admin/users/${userAuth.user.id}/ban`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    const banJson = JSON.parse(banRes.body);
    test('PUT /api/admin/users/:id/ban (User Moderation)', banRes.statusCode === 200 && banJson.success && banJson.isBanned === true);

    // Unban back
    await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/users/${userAuth.user.id}/ban`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('\n====================================================');
    console.log(`Results: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('====================================================');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
}

runTests();
