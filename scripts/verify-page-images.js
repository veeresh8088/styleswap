const http = require('http');
const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    const fullUrl = url.startsWith('/') ? `http://localhost:5000${url}` : url;
    const client = fullUrl.startsWith('https') ? https : http;

    const req = client.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 }, (res) => {
      resolve({
        url: url.slice(0, 60),
        status: res.statusCode,
        contentType: res.headers['content-type'],
        ok: res.statusCode === 200
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url: url.slice(0, 60), ok: false, error: 'TIMEOUT' });
    });

    req.on('error', (e) => {
      resolve({ url: url.slice(0, 60), ok: false, error: e.message });
    });
  });
}

async function verifyPageImages(pagePath) {
  console.log(`\n🔍 Verifying images on http://localhost:5000${pagePath}...`);
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${pagePath}`, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', async () => {
        const regex = /<img[^>]+src=["']([^"']+)["']/gi;
        const matches = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
          matches.push(match[1]);
        }

        console.log(`   Found ${matches.length} <img> tags on page.`);
        const results = await Promise.all(matches.map(checkUrl));
        const bad = results.filter(r => !r.ok);

        if (bad.length === 0) {
          console.log(`   ✅ 100% of images on ${pagePath} are accessible and return HTTP 200!`);
        } else {
          console.error(`   ❌ ${bad.length} broken images found on ${pagePath}:`, bad);
        }
        resolve(bad.length === 0);
      });
    });
  });
}

async function main() {
  const p1 = await verifyPageImages('/');
  const p2 = await verifyPageImages('/listings');
  const p3 = await verifyPageImages('/about');

  if (p1 && p2 && p3) {
    console.log('\n🎉 ALL PAGES VERIFIED: Zero broken images across the marketplace!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
