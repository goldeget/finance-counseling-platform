import { writeFileSync } from 'fs';

// Check admin page
let resp = await fetch('https://loan.climekr.com/admin', { signal: AbortSignal.timeout(15000) });
const adminHtml = await resp.text();
console.log('=== ADMIN PAGE ===');
console.log('Status:', resp.status, 'Length:', adminHtml.length);
console.log('Has dark mode:', adminHtml.includes('prefers-color-scheme:dark'));
console.log('Has Pretendard:', adminHtml.includes('Pretendard'));

// Check landing page dark mode location
resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const landingHtml = await resp.text();
const darkIdx = landingHtml.indexOf('@media(prefers-color-scheme:dark)');
console.log('\n=== LANDING PAGE DARK MODE ===');
console.log('Dark mode block at position:', darkIdx);
if (darkIdx >= 0) {
  console.log('Context:', landingHtml.substring(darkIdx, darkIdx + 200));
}

// Find all dark mode variables
const darkEnd = landingHtml.indexOf('}}', darkIdx);
const darkBlock = landingHtml.substring(darkIdx, darkEnd + 2);
console.log('\n=== Dark mode block ===');
console.log(darkBlock);
