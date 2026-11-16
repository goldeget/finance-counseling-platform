const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();

// Find flowClose handler
const fcIdx = html.indexOf("flowClose");
console.log('=== flowClose refs ===');
let idx = 0;
while ((idx = html.indexOf('flowClose', idx)) !== -1) {
  console.log('pos', idx, ':', html.substring(idx - 20, idx + 100));
  console.log('---');
  idx += 9;
}

// Find closeFlow function
const cfIdx = html.indexOf('closeFlow');
console.log('\n=== closeFlow refs ===');
idx = 0;
while ((idx = html.indexOf('closeFlow', idx)) !== -1) {
  if (idx > 35000) {
    console.log('pos', idx, ':', html.substring(idx - 20, idx + 120));
    console.log('---');
  }
  idx += 9;
}

// Find #conditions hash handling
const condIdx = html.indexOf('conditions');
console.log('\n=== conditions refs ===');
idx = 0;
while ((idx = html.indexOf('conditions', idx)) !== -1) {
  console.log('pos', idx, ':', html.substring(idx - 30, idx + 80));
  console.log('---');
  idx += 10;
}

// Check if there's a hashchange handler
const hashIdx = html.indexOf('hashchange');
console.log('\n=== hashchange ===');
if (hashIdx >= 0) console.log(html.substring(hashIdx - 30, hashIdx + 100));

// Check if openFlow uses hash
const ofIdx = html.indexOf('openFlow');
console.log('\n=== openFlow ===');
idx = 0;
while ((idx = html.indexOf('openFlow', idx)) !== -1) {
  if (idx > 35000) {
    console.log('pos', idx, ':', html.substring(idx - 20, idx + 100));
    console.log('---');
  }
  idx += 8;
}
