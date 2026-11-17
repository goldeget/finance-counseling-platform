import { writeFileSync } from 'fs';
const resp = await fetch('https://loan.climekr.com/', { signal: AbortSignal.timeout(15000) });
const html = await resp.text();
writeFileSync('polish-audit.html', html);

// 1. Amount chips/options
console.log('=== 1. 금액 선택 옵션 ===');
const amtIdx = html.indexOf('amountchips');
if (amtIdx >= 0) {
  console.log(html.substring(amtIdx - 20, amtIdx + 500));
}

// 2. Amount input
console.log('\n=== 2. 금액 입력 필드 ===');
const amtInput = html.indexOf('id="amount"');
if (amtInput >= 0) {
  console.log(html.substring(amtInput - 50, amtInput + 200));
}

// 3. Rate options
console.log('\n=== 3. 금리 옵션 ===');
const rateIdx = html.indexOf('id="rate"');
if (rateIdx >= 0) {
  console.log(html.substring(rateIdx - 50, rateIdx + 300));
}

// 4. Term options
console.log('\n=== 4. 상환기간 옵션 ===');
const termIdx = html.indexOf('id="term"');
if (termIdx >= 0) {
  console.log(html.substring(termIdx - 50, termIdx + 300));
}

// 5. Step headings
console.log('\n=== 5. 단계별 제목 ===');
['step1','step2','step3'].forEach(id => {
  const idx = html.indexOf('id="' + id + '"');
  if (idx >= 0) console.log(id + ':', html.substring(idx, idx + 150));
});

// 6. Hero text
console.log('\n=== 6. 히어로 텍스트 ===');
const h1Idx = html.indexOf('<h1>');
if (h1Idx >= 0) console.log(html.substring(h1Idx, h1Idx + 200));

// 7. Scanning messages
console.log('\n=== 7. 스캐닝 메시지 ===');
const scanIdx = html.indexOf('id="scantext"');
if (scanIdx >= 0) console.log(html.substring(scanIdx - 20, scanIdx + 200));

// 8. Result text
console.log('\n=== 8. 결과 텍스트 ===');
const resultIdx = html.indexOf('resultHeadline');
if (resultIdx >= 0) console.log(html.substring(resultIdx - 20, resultIdx + 200));

// 9. CTA text
console.log('\n=== 9. CTA 텍스트 ===');
const ctaIdx = html.indexOf('지금 상담받기');
if (ctaIdx >= 0) console.log(html.substring(ctaIdx - 50, ctaIdx + 100));

// 10. Employment select
console.log('\n=== 10. 직업 선택 ===');
const empIdx = html.indexOf('employed');
if (empIdx >= 0) console.log(html.substring(empIdx - 50, empIdx + 400));
