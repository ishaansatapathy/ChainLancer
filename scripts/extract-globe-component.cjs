const fs = require('fs');
const code = fs.readFileSync('scripts/wemakedevs-globe-chunk.js', 'utf8');
const searchStr = 'let p=[{name:"San Francisco"';
const idx = code.indexOf(searchStr);
console.log(code.substring(idx + 15500, idx + 18000));
