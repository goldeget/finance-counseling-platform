import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLiveService} from '../src/live-monitor.mjs';

function mockFetch({landing = 200, notice = true, count = 108250, admin = 302, retention = 200} = {}) {
  return async (url) => {
    if (url.endsWith('/landing')) return new Response(notice ? '접수 후 1년' : 'other', {status: landing});
    if (url.includes('/api/reviews')) return Response.json({total: count});
    if (url === 'https://admin-loan.climekr.com/') return new Response(null, {status: admin, headers: {location: 'https://example.cloudflareaccess.com/login'}});
    if (url.endsWith('/api/retention-bridge')) return Response.json({ok: true, deleted: 0, more: false}, {status: retention});
    throw Error('Unexpected URL');
  };
}
test('checks the live service and runs the authorized retention fallback', async () => {
  assert.deepEqual(await checkLiveService({SITE_RETENTION_TOKEN: 'a'.repeat(64)}, mockFetch()), {reviewTotal: 108250, expiredDeleted: 0});
});
test('reports an absent notice, missing reviews, invalid admin redirect and failed retention', async () => {
  const env = {SITE_RETENTION_TOKEN: 'a'.repeat(64)};
  for (const change of [{notice:false},{count:0},{admin:200},{retention:503}]) {
    await assert.rejects(checkLiveService(env, mockFetch(change)));
  }
});
test('attempts retention even when the public landing is unavailable', async () => {
  const seen = [];
  const fetcher = mockFetch({landing: 503});
  await assert.rejects(checkLiveService({SITE_RETENTION_TOKEN: 'a'.repeat(64)}, async (url, opts) => {
    seen.push(url);
    return fetcher(url, opts);
  }));
  assert.ok(seen[0].endsWith('/api/retention-bridge'));
});
