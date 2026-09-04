const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const code = await get('https://www.wemakedevs.org/_next/static/immutable/chunks/2gajmethfmerm.js');
  fs.writeFileSync('scripts/wemakedevs-globe-chunk.js', code);
  console.log('Saved wemakedevs-globe-chunk.js, length:', code.length);

  // Check exports or component definitions
  // Look for markers, colors, canvas, WebGL, three, etc.
  const keywords = ['mapSamples', 'markers', 'phi', 'theta', 'dark', 'diffuse', 'scale', 'glow', 'opacity', 'devicePixelRatio'];
  keywords.forEach(k => {
    const idx = code.indexOf(k);
    if (idx !== -1) {
      console.log(`Keyword "${k}" at ${idx}:`);
      console.log(code.substring(Math.max(0, idx - 100), idx + 250));
      console.log('---');
    }
  });
}

main();
