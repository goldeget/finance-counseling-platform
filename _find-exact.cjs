const html = require('fs').readFileSync('quality-audit.html','utf8');

// Find viewport meta
const vp = html.indexOf('viewport');
console.log('viewport:', JSON.stringify(html.substring(vp - 10, vp + 70)));

// Find html{ scroll-behavior
const sb = html.indexOf('scroll-behavior');
console.log('\nscroll-behavior:', JSON.stringify(html.substring(sb - 5, sb + 70)));

// Find focus-visible
const fv = html.indexOf('focus-visible');
console.log('\nfocus-visible:', JSON.stringify(html.substring(fv - 5, fv + 60)));

// Find chip min-height
const chip = html.indexOf('.chip{min-height');
console.log('\nchip:', JSON.stringify(html.substring(chip, chip + 50)));
