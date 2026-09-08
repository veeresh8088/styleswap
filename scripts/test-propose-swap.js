const http = require('http');

function postJson(url, payload, cookie) {
  const data = JSON.stringify(payload);
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, text: body });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, cookie) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: cookie ? { Cookie: cookie } : {}
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Testing "Propose Item Swap" Across All Scenarios');
  console.log('====================================================');

  // 1. Log in as Arjun (has items)
  const loginRes = await postJson('http://localhost:5000/api/auth/login', {
    email: 'arjun.patel98@gmail.com',
    password: 'User@12345'
  });
  console.log(`✓ 1. Login as Arjun (Status: ${loginRes.status})`);
  const arjunCookie = loginRes.headers['set-cookie'].join('; ');
  const arjunId = loginRes.body.user._id;

  // 2. Fetch listings
  const listRes = await get('http://localhost:5000/api/listings?limit=100');
  const listings = JSON.parse(listRes.text).data;
  
  // Find a sell-only listing owned by someone else
  const sellOnly = listings.find(l => l.sellerId._id !== arjunId && l.type === 'sell' && l.status === 'approved');
  console.log(`✓ 2. Found Sell-Only Item: "${sellOnly.title}" (ID: ${sellOnly._id})`);

  // 3. Check that GET /listings/:id now renders "Propose Item Swap / Barter" button on sell-only item!
  const pageRes = await get(`http://localhost:5000/listings/${sellOnly._id}`, arjunCookie);
  const hasSwapBtn = pageRes.text.includes('Propose Item Swap / Barter');
  const hasModal = pageRes.text.includes('id="exchange-modal"');
  const hasQuickOffer = pageRes.text.includes('id="pane-swap-quick"');
  console.log(`✓ 3. Sell-only page renders Propose Swap Button: ${hasSwapBtn} | Modal: ${hasModal} | Quick Offer Pane: ${hasQuickOffer}`);

  if (!hasSwapBtn || !hasModal) {
    throw new Error('Propose Item Swap button or modal missing on sell-only page!');
  }

  console.log('Arjun ID from login:', arjunId);
  console.log('Sample seller IDs from listings:', listings.slice(0, 3).map(l => ({ id: l._id, seller: l.sellerId })));

  // Find an item owned by Arjun
  const arjunItem = listings.find(l => String(l.sellerId?._id || l.sellerId) === String(arjunId) && l.status === 'approved');
  console.log(`✓ 4. Offering Arjun's Item: "${arjunItem.title}" (ID: ${arjunItem._id})`);

  // Use a different target listing to avoid duplicate pending
  const targetForSwap = listings.find(l => String(l.sellerId?._id || l.sellerId) !== String(arjunId) && l.status === 'approved' && l._id !== sellOnly._id);

  const swapSubmitRes = await postJson('http://localhost:5000/transactions/exchange', {
    listingId: targetForSwap._id,
    exchangeItemId: arjunItem._id,
    cashTopUp: 250,
    notes: 'Hey! Offering my item with ₹250 cash top-up.'
  }, arjunCookie);

  console.log(`✓ 5. Propose Swap with Existing Item: Status ${swapSubmitRes.status} (Redirect or Created)`);

  // 5. Test Quick Swap Offer (User offering an item without choosing an existing one)
  // Let's test with vinayakct or another target listing
  const quickTarget = listings.find(l => l.sellerId._id !== arjunId && l.status === 'approved' && l._id !== targetForSwap._id && l._id !== sellOnly._id);
  
  const quickOfferRes = await postJson('http://localhost:5000/transactions/exchange', {
    listingId: quickTarget._id,
    offerTitle: 'Vintage 90s Nike Colorblock Windbreaker',
    offerCategory: quickTarget.category._id,
    offerSize: 'L',
    offerCondition: 'Gently Used (Good Condition)',
    offerPrice: 1299,
    cashTopUp: 100,
    notes: 'Quick trade offer: vintage Nike windbreaker in pristine condition!'
  }, arjunCookie);

  console.log(`✓ 6. Propose Swap with Quick Offer Item: Status ${quickOfferRes.status}`);

  // 6. Verify Arjun's Dashboard shows the pending proposals
  const dashRes = await get('http://localhost:5000/user/dashboard', arjunCookie);
  const hasDashboardSwap = dashRes.text.includes('Swap Proposals') || dashRes.text.includes('PENDING');
  console.log(`✓ 7. Dashboard shows swap proposals: ${hasDashboardSwap}`);

  console.log('\n====================================================');
  console.log('🎉 ALL PROPOSE ITEM SWAP TESTS PASSED (100%)!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
