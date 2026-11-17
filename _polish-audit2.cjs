const html = require('fs').readFileSync('polish-audit.html','utf8');

// Find step2 full HTML
const s2 = html.indexOf('id="step2"');
const s2End = html.indexOf('</div>', html.indexOf('id="next2"', s2));
console.log('=== STEP2 HTML ===');
console.log(html.substring(s2, s2End + 50));

// Find all .option buttons
console.log('\n=== All options ===');
const optRe = /class="option[^"]*"[^>]*>([^<]+)</g;
let m;
while ((m = optRe.exec(html)) !== null) {
  console.log('  option:', m[1]);
}

// Find fieldlegend items
console.log('\n=== Field legends ===');
const flRe = /class="fieldlegend">([^<]+)</g;
while ((m = flRe.exec(html)) !== null) {
  console.log('  ', m[1]);
}

// Check the experience card amounts
console.log('\n=== Experience card (hero) ===');
const expIdx = html.indexOf('class="experience"');
console.log(html.substring(expIdx, expIdx + 400));
