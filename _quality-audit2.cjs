const html = require('fs').readFileSync('quality-audit.html','utf8');

// 1. Hero desktop layout (2-column?)
console.log('=== Hero responsive layout ===');
const heroRe = /@media\([^)]+\)\{\.hero\{[^}]+\}/g;
let m;
while ((m = heroRe.exec(html)) !== null) {
  console.log('  ' + m[0]);
}
// Check if hero has grid-template-columns with 2 values at desktop
const heroBase = html.match(/\.hero\{grid-template-columns:([^;]+);/);
console.log('  Base hero grid:', heroBase ? heroBase[1] : 'not grid');

// 2. :active states (tap feedback micro-interactions)
console.log('\n=== Micro-interactions (:active) ===');
const activeRe = /:active\{[^}]+\}/g;
let activeCount = 0;
while ((m = activeRe.exec(html)) !== null) {
  activeCount++;
  console.log('  ' + m[0].substring(0, 80));
}
console.log('  Total :active rules:', activeCount);

// 3. scroll-behavior
console.log('\n=== scroll-behavior ===');
console.log('  smooth:', html.includes('scroll-behavior:smooth') ? '✅' : '❌');
console.log('  scroll-padding:', html.includes('scroll-padding') ? '✅' : '❌');

// 4. Nav on mobile
console.log('\n=== Nav mobile ===');
const navMobile = html.match(/@media\([^)]*max-width[^)]*\)\{[^}]*\.nav[^}]*\}/g);
if (navMobile) navMobile.forEach(n => console.log('  ' + n.substring(0, 100)));
console.log('  mobile-subnav:', html.includes('mobile-subnav') ? '✅ exists' : '❌');
console.log('  navbtn:', html.includes('navbtn') ? '✅ exists' : '❌');

// 5. Input font-size (16px min to prevent iOS zoom)
console.log('\n=== Input font-size (iOS zoom prevention) ===');
const inputFontRe = /input[^{]*\{[^}]*font-size:([^;}]+)/g;
while ((m = inputFontRe.exec(html)) !== null) {
  console.log('  font-size:' + m[1]);
}

// 6. Bottom sheet / modal pattern on mobile
console.log('\n=== Bottom sheet pattern ===');
console.log('  bottom-sheet:', html.includes('bottom-sheet') ? '✅' : '❌');
console.log('  full-screen flow:', html.includes('flow-active') ? '✅ uses flow-active' : '❌');

// 7. Workspace mobile (padding, layout)
console.log('\n=== Workspace mobile ===');
const wsMobile = html.match(/@media\([^)]*800[^)]*\)\{[^}]*workspace[^}]*\}/g);
if (wsMobile) wsMobile.forEach(w => console.log('  ' + w.substring(0, 100)));

// 8. Step layout mobile
console.log('\n=== Step form mobile ===');
const formcardMobile = html.match(/@media\([^)]*max-width[^)]*\)\{[^}]*formcard[^}]*\}/g);
if (formcardMobile) formcardMobile.forEach(f => console.log('  ' + f.substring(0, 100)));
console.log('  formcard base:', (html.match(/\.formcard\{[^}]+\}/)||[''])[0].substring(0, 100));

// 9. Result layout mobile
console.log('\n=== Result mobile ===');
const resultCSS = html.match(/\.result-bar\{[^}]+\}/);
if (resultCSS) console.log('  .result-bar:', resultCSS[0].substring(0, 100));

// 10. Container max-width
console.log('\n=== Container ===');
const wrapCSS = html.match(/\.wrap\{[^}]+\}/);
if (wrapCSS) console.log('  .wrap:', wrapCSS[0].substring(0, 80));
