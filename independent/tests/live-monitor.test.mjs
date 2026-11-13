import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLiveService} from '../src/live-monitor.mjs';

function mockFetch({landing = 200, notice = true, count = 108250, admin = 302, submission = 403} = {}) {
  return async (url) => {
    if (url.endsWith('/landing')) return new Response(notice ? '접수 후 1년' : 'other', {status: landing});
    if (url.includes('/api/reviews')) return Response.json({total: count});
    if (url === 'https://admin-loan.climekr.com/') return new Response(null, {status: admin, headers: {location: 'https://example.cloudflareaccess.com/login'}});
    if (url.endsWith('/api/applications')) return new Response(null,{status:submission});
    throw Error('Unexpected URL');
  };
}
test('checks the independent public service and protected administration', async () => {
  assert.deepEqual(await checkLiveService({}, mockFetch()), {reviewTotal: 108250});
});
test('reports an absent notice, missing reviews, invalid admin redirect and unprotected submission', async () => {
  for (const change of [{notice:false},{count:0},{admin:200},{submission:200}]) {
    await assert.rejects(checkLiveService({}, mockFetch(change)));
  }
});
