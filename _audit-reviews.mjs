import { writeFileSync } from 'fs';
const resp = await fetch('https://loan.climekr.com/reviews', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();
writeFileSync('audit-reviews.html', html);
console.log('Reviews page status:', resp.status, 'length:', html.length);

// Check for errors
const checks = [
  ['Dark mode', html.includes('prefers-color-scheme:dark')],
  ['Pretendard font', html.includes('Pretendard')],
  ['Has script', html.includes('<script')],
  ['Has review list', html.includes('review-list') || html.includes('reviews')],
  ['Nav bar', html.includes('class="nav"')],
  ['Footer', html.includes('<footer')],
];
checks.forEach(([name, ok]) => console.log(ok ? '✅' : '❌', name));

// Check for any JS in reviews page
const scriptStart = html.indexOf('<script');
if (scriptStart >= 0) {
  console.log('\nScript section found at', scriptStart);
  const scriptEnd = html.indexOf('</script>', scriptStart);
  const script = html.substring(scriptStart, scriptEnd);
  console.log('Script length:', script.length);
  // Check for setInterval
  if (script.includes('setInterval')) console.log('⚠️ Has setInterval');
  // Check for addEventListener
  if (script.includes('addEventListener')) console.log('Has addEventListener');
}
