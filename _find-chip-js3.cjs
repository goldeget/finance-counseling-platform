const fs = require('fs');
const html = fs.readFileSync('f:/_tmp-finance-counseling/public/landing.html','utf8');
// Find data-amount in JS section
const scriptStart = html.indexOf('<script type="module">');
const scriptEnd = html.indexOf('</script>', scriptStart);
const script = html.substring(scriptStart, scriptEnd);

// Find amountchips handler
const idx1 = script.indexOf('amountchips');
console.log('amountchips in JS at:', idx1);
if (idx1 >= 0) console.log(script.substring(idx1 - 40, idx1 + 300));

// Find data-amount in JS
const idx2 = script.indexOf('data-amount');
console.log('\ndata-amount in JS at:', idx2);
if (idx2 >= 0) console.log(script.substring(idx2 - 40, idx2 + 200));

// Find rate handler
const idx3 = script.indexOf("rate').addEventListener");
console.log('\nrate listener at:', idx3);
if (idx3 >= 0) console.log(script.substring(idx3 - 10, idx3 + 200));

// Find amount handler
const idx4 = script.indexOf("amount').addEventListener");
console.log('\namount listener at:', idx4);
if (idx4 >= 0) console.log(script.substring(idx4 - 10, idx4 + 200));
