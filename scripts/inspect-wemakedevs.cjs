const https = require('https');

https.get('https://www.wemakedevs.org/', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const scripts = html.match(/src="(\/_next\/static\/[^"]+)"/g) || [];
    console.log('Next.js scripts found:', scripts.length);
    scripts.forEach(s => console.log('Script:', s));

    // Check for canvas or globe references
    const matches = html.match(/.{0,50}globe.{0,50}/gi) || [];
    console.log('HTML Globe mentions:', matches.slice(0, 5));
  });
}).on('error', console.error);
