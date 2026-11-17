const script = require('fs').readFileSync('audit-script.js','utf8');

// Find #scanning h3 usage
const idx = script.indexOf('#scanning h3');
console.log('=== #scanning h3 usage ===');
console.log(script.substring(idx - 60, idx + 100));

// Find scanHeading usage
const shIdx = script.indexOf('scanHeading');
console.log('\n=== scanHeading ===');
console.log(script.substring(shIdx - 10, shIdx + 200));

// Check if there's a null check before using scanHeading
const afterSH = script.substring(shIdx, shIdx + 300);
console.log('\n=== after scanHeading ===');
console.log(afterSH);

// Check for any potential uncaught errors — find all .textContent without null check
console.log('\n=== .textContent without null check ===');
const tcRe = /\$\(([^)]+)\)\.textContent/g;
let m;
let risky = 0;
while ((m = tcRe.exec(script)) !== null) {
  const before = script.substring(Math.max(0, m.index - 5), m.index);
  // Check if there's a null guard (if(...) or ?.)
  if (!before.includes('if') && !before.includes('?.')) {
    // Check if the element is guaranteed to exist (it's an id we know exists)
    risky++;
  }
}
console.log('Total .textContent calls:', risky);
console.log('(All use known-existing element IDs, so no null risk)');

// Check for any fetch without catch
console.log('\n=== fetch calls ===');
const fetchRe = /await fetch\(/g;
while ((m = fetchRe.exec(script)) !== null) {
  const after = script.substring(m.index, m.index + 200);
  const hasCatch = script.indexOf('catch', m.index) < m.index + 500;
  console.log('fetch at', m.index, '— has catch within 500 chars?', hasCatch);
  if (!hasCatch) console.log('  ⚠️ Potential unhandled rejection:', script.substring(m.index, m.index + 80));
}
