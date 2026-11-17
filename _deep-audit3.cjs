const script = require('fs').readFileSync('audit-script.js','utf8');

// Find the reviews fetch and its surrounding context
const idx = 19740;
console.log('=== Reviews fetch context (500 chars) ===');
console.log(script.substring(idx - 50, idx + 500));

// Find if there's a catch further down
const catchIdx = script.indexOf('catch', idx);
console.log('\n=== Nearest catch after reviews fetch ===');
console.log('catch at position:', catchIdx);
if (catchIdx > 0) {
  console.log('distance:', catchIdx - idx);
  console.log('context:', script.substring(catchIdx - 30, catchIdx + 100));
}
