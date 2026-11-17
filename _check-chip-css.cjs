const fs = require('fs');
const html = fs.readFileSync('f:/_tmp-finance-counseling/public/landing.html','utf8');
const chipCSS = html.match(/\.chips\{[^}]+\}/);
console.log('chips CSS:', chipCSS ? chipCSS[0] : 'not found');
const chipWrap = html.match(/\.chip\{[^}]+\}/);
console.log('chip CSS:', chipWrap ? chipWrap[0] : 'not found');
// Check if chips wrap on mobile
const mobileChips = html.match(/@media\([^)]*360[^)]*\)\{[^}]*chip[^}]*\}/g);
if (mobileChips) mobileChips.forEach(c => console.log('mobile chips:', c));
