const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function check() {
  console.log('=== CHECKING STYLESWAP ENDPOINTS ===');
  const home = await get('http://localhost:5000/');
  console.log('GET / -> Status:', home.status);
  const homeLinks = home.html.match(/\/listings\/[a-f0-9]{24}/g) || [];
  console.log('Product links on home:', homeLinks.length);
  console.log('Unique product links on home:', [...new Set(homeLinks)].length);

  const listings = await get('http://localhost:5000/listings');
  console.log('GET /listings -> Status:', listings.status);
  const catalogLinks = listings.html.match(/\/listings\/[a-f0-9]{24}/g) || [];
  console.log('Product links on catalog:', catalogLinks.length);
  console.log('Unique product links on catalog:', [...new Set(catalogLinks)].length);
  console.log('Has "No Second-Hand Wares Found":', listings.html.includes('No Second-Hand Wares Found'));

  // Test categories
  const categories = [
    'thrifted-denim-cargoes',
    'streetwear-hoodies',
    'sneakers-kicks',
    'vintage-jackets-flannels',
    'dresses-corsets-tops',
    'preloved-bags-accessories'
  ];

  for (const cat of categories) {
    const res = await get(`http://localhost:5000/listings?category=${cat}`);
    const links = res.html.match(/\/listings\/[a-f0-9]{24}/g) || [];
    console.log(`Category [${cat}]: ${links.length / 2} items (status ${res.status})`);
  }

  // Check image src values in listings
  const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
  let match;
  console.log('\n--- SAMPLE IMAGES IN CATALOG ---');
  let count = 0;
  while ((match = imgRegex.exec(listings.html)) !== null && count < 8) {
    console.log(`Image ${++count}:`, match[1]);
  }
}

check().catch(console.error);
