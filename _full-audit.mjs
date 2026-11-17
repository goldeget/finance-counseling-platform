import { writeFileSync } from 'fs';
const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();
writeFileSync('audit-live.html', html);

// 1. Extract the script section
const scriptStart = html.indexOf('<script type="module">');
const scriptEnd = html.indexOf('</script>', scriptStart);
const script = html.substring(scriptStart + 24, scriptEnd);
writeFileSync('audit-script.js', script);

console.log('=== Script length:', script.length, 'chars ===\n');

// 2. Find ALL variable declarations (let, const, var)
const varDecls = [];
const varRe = /\b(let|const|var)\s+([a-zA-Z_$][\w$]*)/g;
let m;
while ((m = varRe.exec(script)) !== null) {
  varDecls.push({ type: m[1], name: m[2], pos: m.index });
}
console.log('=== Variable declarations ===');
varDecls.forEach(v => console.log(`  ${v.type} ${v.name} @ ${v.pos}`));

// 3. Find ALL setInterval calls
console.log('\n=== setInterval calls ===');
const siRe = /setInterval\(/g;
while ((m = siRe.exec(script)) !== null) {
  console.log(`  pos ${m.index}: ${script.substring(m.index, m.index + 80)}`);
}

// 4. Find ALL clearInterval calls
console.log('\n=== clearInterval calls ===');
const ciRe = /clearInterval\(/g;
while ((m = ciRe.exec(script)) !== null) {
  console.log(`  pos ${m.index}: ${script.substring(m.index, m.index + 60)}`);
}

// 5. Find ALL event listeners (addEventListener, onclick, etc.)
console.log('\n=== Event handlers ===');
const elRe = /\$\(['"]([^'"]+)['"]\)\.(onclick|addEventListener)/g;
while ((m = elRe.exec(script)) !== null) {
  console.log(`  ${m[1]}.${m[2]} @ ${m.index}`);
}

// 6. Find ALL element references that might not exist
console.log('\n=== getElementById calls ===');
const geRe = /getElementById\(['"]([^'"]+)['"]\)/g;
while ((m = geRe.exec(script)) !== null) {
  console.log(`  ${m[1]} @ ${m.index}`);
}

// 7. Find ALL $() selector calls
console.log('\n=== $() selector calls ===');
const selRe = /\$\(['"]([^'"]+)['"]\)/g;
const selectors = new Set();
while ((m = selRe.exec(script)) !== null) {
  selectors.add(m[1]);
}
[...selectors].sort().forEach(s => console.log(`  ${s}`));

// 8. Check for potential temporal dead zone issues
console.log('\n=== TDZ risk check ===');
// For each let/const, find if it's referenced before declaration
varDecls.forEach(v => {
  if (v.type === 'let' || v.type === 'const') {
    const refRe = new RegExp('\\b' + v.name + '\\b', 'g');
    let ref;
    while ((ref = refRe.exec(script)) !== null) {
      if (ref.index < v.pos && ref.index > 0) {
        const ctx = script.substring(Math.max(0, ref.index - 20), ref.index + 30);
        console.log(`  ⚠️ ${v.name} referenced at ${ref.index} BEFORE declaration at ${v.pos}: ...${ctx}...`);
      }
    }
  }
});

// 9. Find all # element IDs in HTML
console.log('\n=== HTML element IDs ===');
const idRe = /id="([^"]+)"/g;
const ids = new Set();
while ((m = idRe.exec(html)) !== null) {
  ids.add(m[1]);
}
[...ids].sort().forEach(id => console.log(`  #${id}`));

// 10. Cross-check: selectors vs IDs
console.log('\n=== Missing elements (selector used but no matching ID) ===');
selectors.forEach(s => {
  if (s.startsWith('#')) {
    const id = s.substring(1);
    if (!ids.has(id)) {
      console.log(`  ❌ ${s} — element not found in HTML!`);
    }
  }
});
