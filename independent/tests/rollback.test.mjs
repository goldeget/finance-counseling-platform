import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeReviewDelta, collectReviewIds, fetchReviewsByIds, buildRollbackPackage, auditRollback, hashIds} from '../src/rollback.mjs';

test('computeReviewDelta finds new and deleted ids', () => {
  const delta = computeReviewDelta(['b', 'c', 'd', 'e', 'f'], ['a', 'b', 'c', 'd']);
  assert.deepEqual(delta.newIds, ['e', 'f']);
  assert.deepEqual(delta.deletedIds, ['a']);
});

test('computeReviewDelta is stable for empty deltas', () => {
  const delta = computeReviewDelta(['a', 'b'], ['a', 'b']);
  assert.deepEqual(delta.newIds, []);
  assert.deepEqual(delta.deletedIds, []);
});

test('computeReviewDelta rejects non-arrays', () => {
  assert.throws(() => computeReviewDelta('x', []), /Invalid id lists/);
});

test('hashIds is order-independent and stable', () => {
  assert.equal(hashIds(['b', 'a']), hashIds(['a', 'b']));
  assert.notEqual(hashIds(['a']), hashIds(['b']));
});

function makeFetcher({scanPages, byIdMap}) {
  return async (url) => {
    const u = url instanceof URL ? url : new URL(url);
    const idFilter = u.searchParams.get('id');
    if (idFilter && idFilter.startsWith('in.')) {
      const requested = idFilter.slice(3).replace(/[()]/g, '').split(',');
      const rows = requested.map(id => byIdMap[id]).filter(Boolean);
      return {ok: true, json: async () => rows};
    }
    const cursor = idFilter && idFilter.startsWith('gt.') ? idFilter.slice(3) : '';
    const page = scanPages[cursor] || [];
    return {ok: true, json: async () => page};
  };
}

test('collectReviewIds paginates ascending and stops at a short page', async () => {
  const fetcher = makeFetcher({
    scanPages: {
      '': [{id: 'r1'}, {id: 'r2'}],
      'r2': [{id: 'r3'}],
    },
  });
  const ids = await collectReviewIds('https://example.supabase.co', 'key', {pageSize: 2, fetcher});
  assert.deepEqual(ids, ['r1', 'r2', 'r3']);
});

test('collectReviewIds rejects an out-of-order page', async () => {
  const fetcher = makeFetcher({scanPages: {'': [{id: 'r2'}, {id: 'r1'}]}});
  await assert.rejects(() => collectReviewIds('https://example.supabase.co', 'key', {pageSize: 2, fetcher}), /Invalid or unordered review/);
});

test('collectReviewIds rejects an insecure base url', async () => {
  await assert.rejects(() => collectReviewIds('http://example.supabase.co', 'key'), /Invalid review configuration/);
});

test('fetchReviewsByIds returns full rows for requested ids', async () => {
  const byIdMap = {
    r2: {id: 'r2', author: '김*준', source: '네이버', rating: 5, content: '좋아요', review_date: '2026-11-01', created_at: '2026-11-15T00:00:00Z'},
    r3: {id: 'r3', author: '이*영', source: '구글', rating: 4, content: '괜찮아요', review_date: '2026-11-02', created_at: '2026-11-16T00:00:00Z'},
  };
  const fetcher = makeFetcher({scanPages: {}, byIdMap});
  const rows = await fetchReviewsByIds('https://example.supabase.co', 'key', ['r2', 'r3'], {fetcher});
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'r2');
  assert.equal(rows[1].content, '괜찮아요');
});

test('fetchReviewsByIds returns empty for no ids', async () => {
  const rows = await fetchReviewsByIds('https://example.supabase.co', 'key', [], {});
  assert.deepEqual(rows, []);
});

test('buildRollbackPackage isolates applications after the cutover and audits cleanly', async () => {
  const applications = [
    {id: 'app1', created_at: '2026-11-10T00:00:00Z', reference: 'A1', iv: 'aaaa', ciphertext: 'bbbb'},
    {id: 'app2', created_at: '2026-11-20T00:00:00Z', reference: 'A2', iv: 'cccc', ciphertext: 'dddd'},
  ];
  const newReviews = [
    {id: 'r2', author: '김*준', source: '네이버', rating: 5, content: '좋아요', review_date: '2026-11-01', created_at: '2026-11-15T00:00:00Z'},
  ];
  const pkg = await buildRollbackPackage({applications, newReviews, deletedReviewIds: ['r1'], cutoverAt: '2026-11-13T00:00:00Z'});
  assert.equal(pkg.audit.applicationTotal, 2);
  assert.equal(pkg.audit.applicationNew, 1);
  assert.equal(pkg.applications[0].id, 'app2');
  assert.equal(pkg.audit.reviewNew, 1);
  assert.equal(pkg.audit.reviewDeleted, 1);
  const audit = auditRollback(pkg);
  assert.equal(audit.ok, true);
  assert.deepEqual(audit.errors, []);
});

test('auditRollback detects a tampered package', async () => {
  const applications = [{id: 'app2', created_at: '2026-11-20T00:00:00Z', reference: 'A2', iv: 'cccc', ciphertext: 'dddd'}];
  const pkg = await buildRollbackPackage({applications, newReviews: [], deletedReviewIds: [], cutoverAt: '2026-11-13T00:00:00Z'});
  pkg.applications.push({id: 'app3', created_at: '2026-11-21T00:00:00Z', reference: 'A3', iv: 'ee', ciphertext: 'ff'});
  const audit = auditRollback(pkg);
  assert.equal(audit.ok, false);
  assert.ok(audit.errors.some(e => e.includes('application')));
});

test('auditRollback rejects an unsupported version', () => {
  const audit = auditRollback({version: 99, audit: {}, applications: [], newReviews: [], deletedReviewIds: []});
  assert.equal(audit.ok, false);
});
