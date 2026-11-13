import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkRetentionHealth} from '../src/retention-health.mjs';

const now = new Date('2026-11-14T19:00:00.000Z');
const token = 'a'.repeat(64);
const response = (body, status=200) => async () => Response.json(body, {status});
test('accepts only a recent successful scheduled purge with no backlog', async () => {
  const result = await checkRetentionHealth(token, response({completed_at:'2026-11-14T18:00:03.000Z', deleted:0, more:false}), now);
  assert.equal(result.ok, true);
});
test('fails closed for missing, stale, future, incomplete or inaccessible retention status', async () => {
  for (const body of [null, {}, {completed_at:'2026-11-13T18:00:00.000Z',deleted:0,more:false}, {completed_at:'2026-11-15T18:00:00.000Z',deleted:0,more:false}, {completed_at:'2026-11-14T18:00:00.000Z',deleted:0,more:true}]) {
    await assert.rejects(checkRetentionHealth(token, response(body), now));
  }
  await assert.rejects(checkRetentionHealth(token, response({}, 503), now));
  await assert.rejects(checkRetentionHealth('', response({}), now));
});
