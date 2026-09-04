const https = require('https');

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
  const html = await get('https://www.wemakedevs.org/');
  const scripts = [...new Set(html.match(/\/static\/immutable\/chunks\/[a-zA-Z0-9_\-\.]+\.js/g) || [])];
  console.log('Total unique chunks:', scripts.length);

  for (const s of scripts) {
    try {
      const code = await get('https://www.wemakedevs.org/_next' + s);
      if (code.includes('cobe') || code.includes('createGlobe') || code.includes('mapSamples') || code.includes('onRender')) {
        console.log('FOUND MATCH IN CHUNK:', s);
        const idx = code.indexOf('createGlobe');
        if (idx !== -1) {
          console.log(code.substring(Math.max(0, idx - 100), idx + 500));
        } else {
          const idx2 = code.indexOf('mapSamples');
          console.log(code.substring(Math.max(0, idx2 - 100), idx2 + 500));
        }
      }
      if (code.includes('Cities where we host events')) {
        console.log('FOUND HERO GLOBE COMPONENT IN CHUNK:', s);
        const idx = code.indexOf('Cities where we host events');
        console.log(code.substring(Math.max(0, idx - 400), idx + 600));
      }
    } catch (e) {
      // ignore
    }
  }
}

main();
