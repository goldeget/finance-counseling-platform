const fs = require('fs');
const html = fs.readFileSync('f:/_tmp-finance-counseling/public/landing.html','utf8');
// Find the JS that handles amountchips click
const idx = html.indexOf("'#amountchips .chip'");
if (idx < 0) {
  // Try alternative
  const idx2 = html.indexOf('amountchips');
  // Find the JS handler after the script tag
  const scriptIdx = html.indexOf('<script type="module">');
  const handlerIdx = html.indexOf('amountchips', scriptIdx);
  console.log('amountchips in JS at:', handlerIdx);
  if (handlerIdx >= 0) {
    console.log(html.substring(handlerIdx - 30, handlerIdx + 300));
  }
} else {
  console.log(html.substring(idx - 30, idx + 300));
}

// Also find where chips are handled with forEach
const forEachIdx = html.indexOf('.chip').forEach');
if (forEachIdx >= 0) {
  console.log('\n=== forEach chip handler ===');
  console.log(html.substring(forEachIdx - 30, forEachIdx + 300));
}

// Find data-amount handler
const daIdx = html.indexOf('data-amount');
if (daIdx >= 0) {
  console.log('\n=== data-amount in JS ===');
  // Find in script section
  const scriptDa = html.indexOf('data-amount', html.indexOf('<script'));
  if (scriptDa >= 0) {
    console.log(html.substring(scriptDa - 30, scriptDa + 200));
  }
}
