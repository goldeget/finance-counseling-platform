const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();

const checks = [
  // viewport-fit=cover
  ['viewport-fit=cover', html.includes('viewport-fit=cover')],
  // scroll-padding-top
  ['scroll-padding-top:80px', html.includes('scroll-padding-top:80px')],
  // Hero 2-column desktop
  ['hero 2-col @900px', html.includes('@media(min-width:900px){.hero{grid-template-columns:1.1fr .9fr')],
  // Chip 44px
  ['chip min-height 44px', html.includes('.chip{min-height:44px')],
  // Formcard mobile padding
  ['formcard mobile padding', html.includes('@media(max-width:600px){.formcard{padding:20px')],
  // Per-element :active
  ['primary:active', html.includes('.primary:active')],
  ['chip:active', html.includes('.chip:active')],
  ['flow-close:active', html.includes('.flow-close:active')],
  ['navbtn:active', html.includes('.navbtn:active')],
  // Performance: box-shadow animations replaced
  ['cta-pulse uses transform', html.includes('@keyframes cta-pulse{0%,100%{transform:scale(1)')],
  ['badge-glow uses transform', html.includes('@keyframes badge-glow{0%,100%{transform:scale(1)')],
  ['backdrop blur 8px', html.includes('blur(8px)') && !html.includes('blur(14px)')],
  ['will-change:transform', html.includes('will-change:transform')],
  // FOMO numbers in thousands
  ['visitors 1,247', html.includes('1,247')],
  ['today 3,847', html.includes('3,847')],
  ['weekly 1,847', html.includes('1,847명')],
  // Dark mode
  ['dark mode', html.includes('prefers-color-scheme:dark')],
  ['dark mode urgency', html.includes('--urgency-bg:#2a1810')],
  // All buttons
  ['flowClose handler', html.includes("flowClose').addEventListener")],
  ['countdownInt before handler', html.indexOf('let countdownInt=null') < html.indexOf("flowClose').addEventListener")],
  // Reduced motion
  ['prefers-reduced-motion', html.includes('prefers-reduced-motion')],
  // ARIA
  ['aria labels (96+)', (html.match(/aria-/g)||[]).length >= 90],
];

let pass = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '✅' : '❌') + ' ' + name);
  if (ok) pass++;
}
console.log('\n=== ' + pass + '/' + checks.length + ' passed ===');
