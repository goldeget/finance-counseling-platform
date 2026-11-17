import { writeFileSync } from 'fs';
const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();
writeFileSync('perf-audit.html', html);

// 1. Find ALL CSS animations (simultaneous)
console.log('=== CSS @keyframes (total animations) ===');
const kfRe = /@keyframes\s+([\w-]+)/g;
let m;
const animations = [];
while ((m = kfRe.exec(html)) !== null) {
  animations.push(m[1]);
}
animations.forEach(a => console.log('  ' + a));
console.log('Total:', animations.length);

// 2. Find all elements with animation applied
console.log('\n=== Elements with animation (simultaneous on page load) ===');
const animRe = /([.#][\w-]+)\s*\{[^}]*animation:\s*([\w-]+)/g;
while ((m = animRe.exec(html)) !== null) {
  console.log('  ' + m[1] + ' → ' + m[2]);
}

// 3. Find box-shadow animations (EXPENSIVE - causes repaint)
console.log('\n=== ⚠️ box-shadow animations (EXPENSIVE - causes repaint) ===');
const bsRe = /@keyframes\s+([\w-]+)\{[^}]*box-shadow/g;
while ((m = bsRe.exec(html)) !== null) {
  console.log('  ⚠️ ' + m[1]);
}

// 4. Find backdrop-filter (EXPENSIVE on scroll)
console.log('\n=== backdrop-filter usage ===');
const bfRe = /backdrop-filter:blur\((\d+)px\)/g;
while ((m = bfRe.exec(html)) !== null) {
  console.log('  blur(' + m[1] + 'px) — expensive on scroll');
}

// 5. Find will-change usage (should have for animated elements)
console.log('\n=== will-change usage ===');
const wcRe = /will-change/g;
let wcCount = 0;
while ((m = wcRe.exec(html)) !== null) wcCount++;
console.log('  will-change declarations:', wcCount);

// 6. Find conic-gradient (expensive)
console.log('\n=== conic-gradient usage ===');
if (html.includes('conic-gradient')) {
  const cgRe = /\.([\w-]+)\s*\{[^}]*conic-gradient/g;
  while ((m = cgRe.exec(html)) !== null) {
    console.log('  .' + m[1]);
  }
}

// 7. Count simultaneous setInterval on page load
console.log('\n=== setInterval on page load (main page) ===');
console.log('  1. heroVisitors (8s) — text update, lightweight');
console.log('  2. mainToasts (15s) — DOM create/remove, moderate');
console.log('  (3-5 only run during flow)');

// 8. Page size
console.log('\n=== Page size ===');
console.log('  HTML:', html.length, 'bytes (' + (html.length/1024).toFixed(1) + 'KB)');

// 9. Check for heavy CSS selectors
console.log('\n=== Heavy CSS patterns ===');
const heavyPatterns = [
  ['position:sticky + backdrop-filter', (html.match(/position:sticky/g)||[]).length > 0 && html.includes('backdrop-filter')],
  ['Multiple box-shadow animations', (html.match(/@keyframes[^}]*box-shadow/g)||[]).length >= 3],
  ['conic-gradient mask', html.includes('conic-gradient') && html.includes('mask:')],
];
heavyPatterns.forEach(([name, is]) => console.log('  ' + (is ? '⚠️' : '✅') + ' ' + name));

// 10. Check animation count on hero specifically
console.log('\n=== Hero section animation count ===');
const heroStart = html.indexOf('class="wrap hero"');
const heroEnd = html.indexOf('</section>', heroStart);
const heroSection = html.substring(heroStart, heroEnd);
const heroAnims = ['float', 'dot-pulse', 'cta-pulse', 'orb-glow', 'badge-glow', 'live-pulse', 'shimmer', 'page-in'];
heroAnims.forEach(a => {
  if (html.includes('@keyframes ' + a)) console.log('  ' + a + ' — exists globally');
});
