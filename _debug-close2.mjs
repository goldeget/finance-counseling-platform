const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();

// Find countdownInt declaration
let idx = 0;
console.log('=== countdownInt refs ===');
while ((idx = html.indexOf('countdownInt', idx)) !== -1) {
  console.log('pos', idx, ':', html.substring(idx - 30, idx + 60));
  console.log('---');
  idx += 12;
}

// Find toastInt declaration
idx = 0;
console.log('\n=== toastInt refs ===');
while ((idx = html.indexOf('toastInt', idx)) !== -1) {
  console.log('pos', idx, ':', html.substring(idx - 30, idx + 60));
  console.log('---');
  idx += 8;
}

// Find 'let countdownInt' to see if it's declared before flowClose (64882)
const declIdx = html.indexOf('let countdownInt');
console.log('\n=== let countdownInt position:', declIdx);
console.log('flowClose handler position: 64882');
console.log('Is countdownInt declared before flowClose?', declIdx < 64882);

// Show the full closeFlow function
const cfIdx = html.indexOf('function closeFlow');
console.log('\n=== full closeFlow ===');
console.log(html.substring(cfIdx, cfIdx + 400));

// Show the full flowClose handler
const fcIdx = html.indexOf("$('#flowClose').addEventListener");
console.log('\n=== full flowClose handler ===');
console.log(html.substring(fcIdx, fcIdx + 300));

// Check if there's a try-catch or error handler
const errIdx = html.indexOf('window.onerror');
console.log('\n=== window.onerror ===', errIdx >= 0 ? 'exists' : 'none');

// Check 'current' variable scope
const curIdx = html.indexOf('let current');
console.log('\n=== let current position:', curIdx);
console.log('Is current before flowClose?', curIdx < 64882);
