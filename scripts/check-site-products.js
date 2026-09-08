const http = require('http');

function getPage(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- 1. Testing GET / (Homepage) ---');
  const home = await getPage('/');
  console.log('Status:', home.status);
  const homeListingMatches = home.body.match(/\/listings\/[a-f0-9]{24}/g);
  console.log('Found product links on homepage:', homeListingMatches ? homeListingMatches.length : 0);

  console.log('\n--- 2. Testing GET /listings ---');
  const catalog = await getPage('/listings');
  console.log('Status:', catalog.status);
  const catalogListingMatches = catalog.body.match(/\/listings\/[a-f0-9]{24}/g);
  console.log('Found product links on /listings:', catalogListingMatches ? catalogListingMatches.length : 0);
  
  if (!catalogListingMatches || catalogListingMatches.length === 0) {
    console.log('\n[!] NO PRODUCTS FOUND ON /listings! Checking page content...');
    if (catalog.body.includes('No items found') || catalog.body.includes('No pre-loved')) {
      console.log('Page shows "No items found" message!');
    }
    const mainIdx = catalog.body.indexOf('<main');
    console.log(catalog.body.slice(mainIdx, mainIdx + 1500));
  } else {
    console.log('First 5 product links on /listings:', catalogListingMatches.slice(0, 5));
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
