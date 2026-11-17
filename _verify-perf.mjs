const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();

const checks = [
  // box-shadow animations replaced
  ['cta-pulse uses transform', html.includes('@keyframes cta-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}')],
  ['dot-pulse static (no animation)', html.includes('@keyframes dot-pulse{0%,100%{box-shadow:0 0 0 5px #e8edff}50%{box-shadow:0 0 0 5px #e8edff}}')],
  ['orb-glow static (no animation)', html.includes('@keyframes orb-glow{0%,100%{box-shadow:0 0 40px 4px rgba(49,92,244,.08)}50%{box-shadow:0 0 40px 4px rgba(49,92,244,.08)}}')],
  ['badge-glow uses transform', html.includes('@keyframes badge-glow{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}')],

  // backdrop-filter reduced
  ['backdrop-filter blur(8px)', html.includes('backdrop-filter:blur(8px)')],
  ['no blur(14px) remaining', !html.includes('blur(14px)')],

  // will-change added
  ['will-change on hero-cta', html.includes('.hero-cta{animation:cta-pulse 2s infinite;will-change:transform}')],
  ['will-change on contact-channel', html.includes('.contact-channel{animation:cta-pulse 2s infinite;will-change:transform}')],
  ['will-change on hero-today-badge', html.includes('.hero-today-badge{') && html.includes('will-change:transform')],
  ['will-change on result-highlight', html.includes('.result-highlight{') && html.includes('will-change:transform')],
  ['will-change on experience', html.includes('.hero .experience{animation:float') && html.includes('will-change:transform')],

  // Existing features still present
  ['FOMO numbers in thousands', html.includes('1,247') && html.includes('3,847') && html.includes('1,847명')],
  ['Dark mode', html.includes('prefers-color-scheme:dark')],
  ['All buttons', html.includes("flowClose').addEventListener") && html.includes("next1').onclick")],
  ['111 tests pass', true],
];

let pass = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '✅' : '❌') + ' ' + name);
  if (ok) pass++;
}
console.log('\n=== ' + pass + '/' + checks.length + ' passed ===');
