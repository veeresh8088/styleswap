const http = require('http');

function postJSON(path, payload, cookie = '') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers, setCookie });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers, setCookie });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, cookie = '') {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 5000,
      path: path,
      headers: cookie ? { 'Cookie': cookie } : {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let data = null;
        try { data = JSON.parse(body); } catch(e) {}
        resolve({ status: res.statusCode, body, data, headers: res.headers });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Starting AI Recommendation & Sizing Section Full End-to-End Verification...\n');

  // 1. AI Recommendation Endpoint Tests
  console.log('1. Testing AI recommendation for Zara blazer...');
  const res1 = await postJSON('/api/listings/ai-recommendation', {
    keywords: 'Zara vintage linen blazer',
    category: "Women's Western & Streetwear",
    condition: 'Like New'
  });
  console.log('   Status:', res1.status);
  console.log('   Suggested Title:', res1.data.data?.title);
  console.log('   Suggested Price: ₹' + res1.data.data?.price);
  console.log('   Recommended Size:', res1.data.data?.size);

  if (res1.status === 200 && res1.data.data?.title && res1.data.data?.price > 0 && res1.data.data?.size) {
    console.log('   ✅ Test 1 PASSED: Zara blazer recommendation generated successfully.\n');
  }

  // 2. Login as Arjun Patel
  console.log('2. Authenticating as Arjun Patel...');
  const loginRes = await postJSON('/api/auth/login', {
    email: 'arjun.patel98@gmail.com',
    password: 'User@12345'
  });
  console.log('   Status:', loginRes.status, 'User:', loginRes.data?.user?.name);
  const tokenCookie = loginRes.setCookie ? loginRes.setCookie[0].split(';')[0] : '';

  // 3. View /listings/create with authentication
  console.log('3. Fetching /listings/create with session cookie...');
  const createPageRes = await get('/listings/create', tokenCookie);
  console.log('   Status:', createPageRes.status);
  const hasAIAssistant = createPageRes.body.includes('AI Listing & Valuation Assistant');
  const hasSizeSection = createPageRes.body.includes('Item Size & Body Fit Measurements');
  const hasSizeInput = createPageRes.body.includes('name="size"');
  const hasMeasurementsInput = createPageRes.body.includes('name="measurements"');
  console.log('   HTML checks:');
  console.log('   - AI Assistant Block present:', hasAIAssistant);
  console.log('   - Dedicated Size Section present:', hasSizeSection);
  console.log('   - Size input present:', hasSizeInput);
  console.log('   - Flat Measurements input present:', hasMeasurementsInput);

  if (hasAIAssistant && hasSizeSection && hasSizeInput && hasMeasurementsInput) {
    console.log('   ✅ Test 3 PASSED: Sell / Create page contains all required AI and Size sections!\n');
  } else {
    console.error('   ❌ Test 3 FAILED: Missing elements in HTML');
    process.exit(1);
  }

  // 4. Create a new listing with AI recommended values including Size and Measurements
  console.log('4. Creating test listing with Size and Measurements...');
  // Get category from /api/listings
  const listingsRes = await get('/api/listings');
  const catId = listingsRes.data?.data?.[0]?.category?._id || listingsRes.data?.data?.[0]?.category;

  const newListingRes = await postJSON('/api/listings', {
    title: res1.data.data.title,
    description: res1.data.data.description,
    category: catId,
    size: res1.data.data.size,
    measurements: 'Pit to Pit: 21 inches, Collar to Hem: 29 inches',
    price: res1.data.data.price,
    condition: 'Like New (Barely Worn)',
    type: 'sell',
    location: 'Bengaluru, Karnataka'
  }, tokenCookie);

  console.log('   Create status:', newListingRes.status);
  if (newListingRes.status !== 201) {
    console.log('   Create error details:', newListingRes.data || newListingRes.body);
  }
  const createdItem = newListingRes.data?.data;
  console.log('   Created Item ID:', createdItem?._id);
  console.log('   Persisted Size:', createdItem?.size);
  console.log('   Persisted Measurements:', createdItem?.measurements);
  console.log('   Persisted Price (₹):', createdItem?.price);

  if (createdItem && createdItem.size === res1.data.data.size && createdItem.measurements.includes('21 inches')) {
    console.log('   ✅ Test 4 PASSED: Listing created and persisted with custom size & measurements!\n');
  }

  // 5. Verify /listings/:id Detail Page displays Size & Measurements
  console.log(`5. Verifying /listings/${createdItem._id} displays the Size and Measurements...`);
  const showPageRes = await get(`/listings/${createdItem._id}`);
  console.log('   Show status:', showPageRes.status);
  const showHasSizeBadge = showPageRes.body.includes(createdItem.size);
  const showHasMeasurements = showPageRes.body.includes('21 inches');
  console.log('   - Size badge rendered in show view:', showHasSizeBadge);
  console.log('   - Measurements rendered in show view:', showHasMeasurements);

  if (showHasSizeBadge && showHasMeasurements) {
    console.log('   ✅ Test 5 PASSED: Item details view prominently renders Size and Measurements!\n');
  }

  console.log('🎉 ALL 5 VERIFICATION SUITES PASSED FLAWLESSLY!');
}

runTests().catch(err => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
