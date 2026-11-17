import { writeFileSync } from 'fs';
const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();
writeFileSync('quality-audit.html', html);

// 1. Viewport meta
console.log('=== 1. Viewport ===');
const vp = html.match(/<meta name="viewport"[^>]*>/);
console.log(vp ? vp[0] : '❌ MISSING');

// 2. Breakpoints (media queries)
console.log('\n=== 2. Media query breakpoints ===');
const mqRe = /@media\(([^)]+)\)/g;
let m;
const breakpoints = new Set();
while ((m = mqRe.exec(html)) !== null) {
  breakpoints.add(m[1]);
}
[...breakpoints].sort().forEach(b => console.log('  ' + b));

// 3. Touch target sizes (min height/width for buttons)
console.log('\n=== 3. Button touch targets ===');
// Check .primary button min-height
const primaryCSS = html.match(/\.primary\{[^}]+\}/);
if (primaryCSS) console.log('  .primary:', primaryCSS[0].substring(0, 100));
// Check .chip
const chipCSS = html.match(/\.chip\{[^}]+\}/);
if (chipCSS) console.log('  .chip:', chipCSS[0].substring(0, 80));
// Check flow buttons
const btnCSS = html.match(/\.flow-next\{[^}]+\}/);
if (btnCSS) console.log('  .flow-next:', btnCSS[0].substring(0, 80));

// 4. Font sizes - responsive (clamp)
console.log('\n=== 4. Responsive font sizes (clamp) ===');
const clampRe = /clamp\(([^)]+)\)/g;
let clampCount = 0;
while ((m = clampRe.exec(html)) !== null) {
  clampCount++;
  if (clampCount <= 10) console.log('  clamp(' + m[1] + ')');
}
console.log('  Total clamp() uses:', clampCount);

// 5. Safe area handling
console.log('\n=== 5. Safe area (notch) ===');
console.log('  env(safe-area):', html.includes('safe-area-inset') ? '✅' : '❌ MISSING');
console.log('  viewport-fit=cover:', html.includes('viewport-fit=cover') ? '✅' : '❌ MISSING');

// 6. Mobile-specific layout (flex-direction column on mobile)
console.log('\n=== 6. Mobile layout patterns ===');
const mobileMq = html.match(/@media\(max-width:\s*(\d+)px\)\{[^}]+\}/g);
if (mobileMq) {
  mobileMq.forEach(mq => console.log('  ' + mq.substring(0, 80)));
}

// 7. Sticky bottom CTA (Toss/Kakao pattern)
console.log('\n=== 7. Sticky bottom CTA ===');
console.log('  position:sticky bottom:', html.includes('position:sticky') && html.includes('bottom:0') ? '✅' : '❌ Not found');

// 8. Animation types (transform/opacity vs others)
console.log('\n=== 8. Animation quality ===');
const animProps = new Set();
const propRe = /@keyframes\s+\w+\{[^}]*(transform|opacity|box-shadow|background-position|color|border|margin|padding|top|left|right|bottom|width|height)/g;
while ((m = propRe.exec(html)) !== null) {
  m[1].split('|').forEach(p => animProps.add(p));
}
console.log('  Animated properties:', [...animProps].join(', '));

// 9. Transition usage
console.log('\n=== 9. Transitions ===');
const transRe = /transition:\s*([^;}]+)/g;
let transCount = 0;
while ((m = transRe.exec(html)) !== null) {
  transCount++;
}
console.log('  Total transition declarations:', transCount);

// 10. CSS Grid usage (modern layout)
console.log('\n=== 10. Modern CSS ===');
console.log('  display:grid:', (html.match(/display:grid/g)||[]).length, 'uses');
console.log('  display:flex:', (html.match(/display:flex/g)||[]).length, 'uses');
console.log('  gap:', (html.match(/gap:/g)||[]).length, 'uses');

// 11. Mobile nav (hamburger?)
console.log('\n=== 11. Mobile navigation ===');
console.log('  Has hamburger:', html.includes('hamburger') || html.includes('menu-toggle') || html.includes('nav-toggle') ? '✅' : '❌');
console.log('  Nav hides on mobile:', html.includes('nav-links') ? 'check CSS' : 'unknown');

// 12. Hero layout on mobile
console.log('\n=== 12. Hero responsive ===');
const heroGrid = html.match(/\.hero\{[^}]+\}/);
if (heroGrid) console.log('  .hero:', heroGrid[0].substring(0, 120));

// 13. Workspace (calculator) mobile
console.log('\n=== 13. Workspace mobile ===');
const wsCSS = html.match(/\.workspace\{[^}]+\}/);
if (wsCSS) console.log('  .workspace:', wsCSS[0].substring(0, 120));

// 14. Input field sizes (for mobile keyboard)
console.log('\n=== 14. Input fields ===');
const inputCSS = html.match(/input[^{]*\{[^}]*font-size[^}]*\}/g);
if (inputCSS) inputCSS.forEach(i => console.log('  ', i.substring(0, 80)));

// 15. Page weight
console.log('\n=== 15. Performance ===');
console.log('  HTML size:', (html.length/1024).toFixed(1), 'KB');
console.log('  External requests:', (html.match(/src="https?:/g)||[]).length + (html.match(/href="https?:/g)||[]).length);
console.log('  Inline CSS:', (html.match(/<style>/g)||[]).length, 'blocks');
console.log('  Inline JS:', (html.match(/<script/g)||[]).length, 'blocks');

// 16. Reduced motion
console.log('\n=== 16. Accessibility ===');
console.log('  prefers-reduced-motion:', html.includes('prefers-reduced-motion') ? '✅' : '❌');
console.log('  ARIA labels:', (html.match(/aria-/g)||[]).length, 'uses');
console.log('  role=', (html.match(/role=/g)||[]).length, 'uses');
