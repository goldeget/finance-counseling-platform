const html = require('fs').readFileSync('polish-audit.html','utf8');
// Find the amount chip handler
const idx = html.indexOf('amountchips');
const js = html.substring(idx, idx + 500);
console.log('=== Amount chip JS ===');
console.log(js);
