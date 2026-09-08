const http = require('http');

async function testSwapFlow() {
  console.log('Testing Swap Flow...');

  // 1. Log in as Rohan
  const loginData = JSON.stringify({ email: 'rohan@thriftfinds.in', password: 'User@12345' });
  const loginRes = await new Promise(resolve => {
    const req = http.request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }));
    });
    req.write(loginData);
    req.end();
  });

  console.log('Login status:', loginRes.status, 'Token exists:', !!loginRes.body.token);
  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].join('; ') : '';

  // 2. Fetch a listing not owned by Rohan
  const listingsRes = await new Promise(resolve => {
    http.get('http://localhost:5000/api/listings', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  const rohanId = loginRes.body.user._id;
  const targetListing = listingsRes.data.find(l => l.sellerId._id !== rohanId && (l.type === 'exchange' || l.type === 'both'));
  const sellOnlyListing = listingsRes.data.find(l => l.sellerId._id !== rohanId && l.type === 'sell');

  console.log('Target listing for swap:', targetListing ? `${targetListing.title} (${targetListing._id}, type: ${targetListing.type})` : 'None');
  console.log('Sell-only listing:', sellOnlyListing ? `${sellOnlyListing.title} (${sellOnlyListing._id}, type: ${sellOnlyListing.type})` : 'None');

  // 3. Check HTML of targetListing page
  const pageHtml = await new Promise(resolve => {
    const req = http.request(`http://localhost:5000/listings/${targetListing._id}`, {
      headers: { Cookie: cookie }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.end();
  });

  console.log('Page has "Propose Item Swap / Barter" button:', pageHtml.includes('Propose Item Swap / Barter'));
  console.log('Page has "exchange-modal":', pageHtml.includes('id="exchange-modal"'));
  console.log('Page has "exchange-select-card":', pageHtml.includes('exchange-select-card'));
  console.log('Page has "You don\'t have any active listings":', pageHtml.includes("You don't have any active listings"));

  // Check sell-only page HTML
  const sellPageHtml = await new Promise(resolve => {
    const req = http.request(`http://localhost:5000/listings/${sellOnlyListing._id}`, {
      headers: { Cookie: cookie }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.end();
  });
  console.log('Sell-only page has "Propose Item Swap / Barter" button:', sellPageHtml.includes('Propose Item Swap / Barter'));

  // 4. Now test as user without items (vinayakct)
  const vLoginData = JSON.stringify({ email: 'vinayakct4@gmail.com', password: 'User@12345' });
  const vLoginRes = await new Promise(resolve => {
    const req = http.request('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(vLoginData)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }));
    });
    req.write(vLoginData);
    req.end();
  });

  if (vLoginRes.body.token) {
    const vCookie = vLoginRes.headers['set-cookie'] ? vLoginRes.headers['set-cookie'].join('; ') : '';
    const vPageHtml = await new Promise(resolve => {
      const req = http.request(`http://localhost:5000/listings/${targetListing._id}`, {
        headers: { Cookie: vCookie }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
      });
      req.end();
    });

    console.log('\n--- For User With 0 Items (vinayakct) ---');
    console.log('Page has "Propose Item Swap / Barter" button:', vPageHtml.includes('Propose Item Swap / Barter'));
    console.log('Page has "exchange-modal":', vPageHtml.includes('id="exchange-modal"'));
    console.log('Page has "exchange-select-card":', vPageHtml.includes('exchange-select-card'));
    console.log('Modal shows "You don\'t have any active listings":', vPageHtml.includes("You don't have any active listings"));
  }
}

testSwapFlow().catch(console.error);
