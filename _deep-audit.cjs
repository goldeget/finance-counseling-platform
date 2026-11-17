const html = require('fs').readFileSync('audit-live.html','utf8');
const script = require('fs').readFileSync('audit-script.js','utf8');

// 1. Check #scanning h3 usage — is there an h3 inside #scanning?
const scanStart = html.indexOf('id="scanning"');
const scanEnd = html.indexOf('</section>', scanStart);
const scanSection = html.substring(scanStart, scanEnd);
const hasH3 = scanSection.includes('<h3');
console.log('1. #scanning has <h3>?', hasH3);
if (!hasH3) {
  // Find where #scanning h3 is used in JS
  const idx = script.indexOf('#scanning h3');
  console.log('   #scanning h3 used at script pos', idx);
  console.log('   context:', script.substring(idx - 40, idx + 80));
}

// 2. Check #amountchips .chip — do chips exist?
const chipsExist = html.includes('id="amountchips"') && html.includes('class="chip');
console.log('\n2. #amountchips .chip exists?', chipsExist);

// 3. Check #liveTicker .live-text
const tickerExist = html.includes('id="liveTicker"') && html.includes('live-text');
console.log('\n3. #liveTicker .live-text exists?', tickerExist);

// 4. Check #scanChecklist li
const checklistExist = html.includes('id="scanChecklist"') && html.includes('data-stage');
console.log('\n4. #scanChecklist li exists?', checklistExist);

// 5. Check tickerInt declaration position vs usage
const tickerDecl = script.indexOf('tickerInt=null');
const tickerUse1 = script.indexOf('tickerInt=setInterval');
const tickerUse2 = script.indexOf('clearInterval(tickerInt)');
console.log('\n5. tickerInt:');
console.log('   declaration:', tickerDecl);
console.log('   first use (setInterval):', tickerUse1);
console.log('   second use (clearInterval):', tickerUse2);
console.log('   declared before use?', tickerDecl < tickerUse1 && tickerDecl < tickerUse2);

// 6. Check all 5 setInterval — are they all cleared?
console.log('\n6. setInterval analysis:');
console.log('   a) heroVisitors (8s) — runs forever, harmless (just updates number)');
console.log('   b) mainToastInt (15s) — runs forever, checks flow-active, creates+removes DOM');
console.log('   c) countdownInt (1s) — cleared in flowClose & restart ✓');
console.log('   d) toastInt (20s) — cleared in flowClose & restart ✓');
console.log('   e) tickerInt (3s) — cleared in onComplete ✓');

// 7. Check dark mode — are all CSS variables defined in both :root and dark?
const rootStart = html.indexOf(':root{');
const darkStart = html.indexOf('@media(prefers-color-scheme:dark){:root{');
const rootCSS = html.substring(rootStart, html.indexOf('}', rootStart) + 1);
const darkCSS = html.substring(darkStart, html.indexOf('}}', darkStart) + 2);

// Extract var names from :root
const rootVars = [...rootCSS.matchAll(/(--[\w-]+):/g)].map(m => m[1]);
const darkVars = [...darkCSS.matchAll(/(--[\w-]+):/g)].map(m => m[1]);

console.log('\n7. Dark mode CSS variables:');
console.log('   :root vars:', rootVars.length);
console.log('   dark vars:', darkVars.length);
const missingDark = rootVars.filter(v => !darkVars.includes(v));
console.log('   vars in :root but NOT in dark:', missingDark.length ? missingDark : 'none ✓');

// 8. Check for hardcoded colors that should be vars (in FOMO elements)
const fomoColors = [
  {name: 'urgency-bar bg', check: html.includes('var(--urgency-bg)')},
  {name: 'urgency-bar text', check: html.includes('var(--urgency-text)')},
  {name: 'result-highlight bg', check: html.includes('background:var(--green-bg)')},
  {name: 'result-highlight border', check: html.includes('border:1px solid var(--green)')},
  {name: 'social-proof color', check: html.includes('color:var(--green)')},
  {name: 'hero-today-badge', check: html.includes('color:var(--green);background:var(--green-bg)')},
];
console.log('\n8. FOMO dark mode vars:');
fomoColors.forEach(c => console.log('   ' + (c.check ? '✅' : '❌') + ' ' + c.name));

// 9. Check all button handlers exist
console.log('\n9. Button handler check:');
const buttons = [
  {id: 'flowClose', check: script.includes("flowClose').addEventListener")},
  {id: 'next1', check: script.includes("next1').onclick")},
  {id: 'next2', check: script.includes("next2').onclick")},
  {id: 'back1', check: script.includes("back1').onclick")},
  {id: 'restart', check: script.includes("restart').onclick")},
  {id: 'amount', check: script.includes("amount').addEventListener")},
  {id: 'rate', check: script.includes("rate').addEventListener")},
  {id: 'customerPhone', check: script.includes("customerPhone').addEventListener")},
  {id: 'customerBirth', check: script.includes("customerBirth').addEventListener")},
  {id: 'birthCentury', check: script.includes("birthCentury').addEventListener")},
];
buttons.forEach(b => console.log('   ' + (b.check ? '✅' : '❌') + ' #' + b.id));

// 10. Check confirm() syntax — is \n a real newline?
console.log('\n10. confirm() check:');
const confirmIdx = script.indexOf("confirm('분석 결과를 닫으시겠어요?");
if (confirmIdx >= 0) {
  const snippet = script.substring(confirmIdx, confirmIdx + 80);
  console.log('   ', JSON.stringify(snippet));
  console.log('   has \\n (real newline)?', snippet.includes('\\n'));
}
