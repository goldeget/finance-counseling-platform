import {test} from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../lib/application-idempotency.ts').catch(() => ({}));
const applicant = {name:'김예시',phone:'01012345678',birth:'1990-01-01',job:'기타',tenure:'',industry:'',overdue:'없음',card:'사용 중',amount:2000,rate:5.9,term:36,consent:true,consentVersion:'consultation-v2'};

test('same application data can safely reuse the original receipt', () => {
  assert.equal(module.sameApplication?.(applicant, {...applicant}), true);
});

test('changed personal or financial fields cannot reuse an earlier receipt', () => {
  for (const patch of [{name:'다른사람'}, {amount:3000}, {consent:false}, {consentVersion:'other'}]) {
    assert.equal(module.sameApplication?.(applicant, {...applicant, ...patch}), false);
  }
});

test('only client-generated UUIDv4 keys are accepted', () => {
  assert.equal(module.validApplicationKey?.('123e4567-e89b-42d3-a456-426614174000'), true);
  assert.equal(module.validApplicationKey?.('123e4567-e89b-12d3-a456-426614174000'), false);
  assert.equal(module.validApplicationKey?.('../../other'), false);
});
