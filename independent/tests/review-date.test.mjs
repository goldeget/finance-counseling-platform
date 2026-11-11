import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../../supabase/functions/review-admin/core.mjs');
test('today is accepted after midnight in Korea even before UTC date changes',()=>{
 const at=Date.parse('2026-11-11T17:30:00Z');
 assert.equal(mod.validReviewDate?.('2026-11-12',at),true);
 assert.equal(mod.validReviewDate?.('2026-11-13',at),false);
 assert.equal(mod.validReviewDate?.('2026-02-30',at),false);
});
