import {createHash} from 'node:crypto';
import {collect} from './application-backup.mjs';

const REVIEW_FIELDS = 'id,author,source,rating,content,review_date,created_at';

/**
 * Compare current review ids against the cutover baseline.
 * Returns the ids added since cutover (newIds) and the baseline ids no longer
 * present (deletedIds). Both arrays are sorted for deterministic hashing.
 */
export function computeReviewDelta(currentIds, baselineIds) {
  if (!Array.isArray(currentIds) || !Array.isArray(baselineIds)) throw Error('Invalid id lists');
  const current = new Set(currentIds);
  const baseline = new Set(baselineIds);
  const newIds = [...current].filter(id => !baseline.has(id)).sort();
  const deletedIds = [...baseline].filter(id => !current.has(id)).sort();
  return {newIds, deletedIds};
}

/** Stable sha256 over a sorted id list, used for audit integrity checks. */
export function hashIds(ids) {
  return createHash('sha256').update([...ids].sort().join('\n')).digest('hex');
}

async function fetchJson(url, key, fetcher) {
  const response = await fetcher(url, {headers: {apikey: key}, signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw Error('Review source returned ' + response.status);
  return response.json();
}

/** Collect every review id from Supabase, ordered ascending for stable paging. */
export async function collectReviewIds(base, key, {pageSize = 1000, fetcher = fetch} = {}) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || !key || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw Error('Invalid review configuration');
  const ids = [];
  let cursor = '';
  for (let page = 0; page < 10000; page++) {
    const u = new URL('/rest/v1/reviews', url);
    u.searchParams.set('select', 'id');
    u.searchParams.set('order', 'id.asc');
    u.searchParams.set('limit', String(pageSize));
    if (cursor) u.searchParams.set('id', 'gt.' + cursor);
    const rows = await fetchJson(u, key, fetcher);
    if (!Array.isArray(rows) || rows.length > pageSize) throw Error('Invalid review page');
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || row.id <= cursor) throw Error('Invalid or unordered review');
      cursor = row.id;
      ids.push(row.id);
    }
    if (rows.length < pageSize) break;
  }
  return ids;
}

/** Fetch the full content of the given review ids (for migrating new reviews back). */
export async function fetchReviewsByIds(base, key, ids, {pageSize = 1000, fetcher = fetch} = {}) {
  if (!ids.length) return [];
  const url = new URL(base);
  if (url.protocol !== 'https:' || !key) throw Error('Invalid review configuration');
  const out = [];
  for (let i = 0; i < ids.length; i += pageSize) {
    const chunk = ids.slice(i, i + pageSize);
    const u = new URL('/rest/v1/reviews', url);
    u.searchParams.set('select', REVIEW_FIELDS);
    u.searchParams.set('id', 'in.(' + chunk.join(',') + ')');
    const rows = await fetchJson(u, key, fetcher);
    if (!Array.isArray(rows)) throw Error('Invalid review fetch');
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !REVIEW_FIELDS.split(',').every(k => k in row)) throw Error('Incomplete review row');
      out.push(row);
    }
  }
  return out;
}

/**
 * Build a rollback package capturing everything that would be lost if DNS were
 * flipped back to the legacy site: applications submitted after the cutover
 * (still encrypted), new reviews added since cutover (full content, to insert
 * on the old site), and review ids deleted since cutover (to replicate deletes).
 */
export async function buildRollbackPackage({applications, newReviews, deletedReviewIds, cutoverAt}) {
  if (typeof cutoverAt !== 'string' || !Number.isFinite(Date.parse(cutoverAt))) throw Error('Invalid cutover timestamp');
  const cutoff = Date.parse(cutoverAt);
  const newApps = applications.filter(row => Number.isFinite(Date.parse(row.created_at)) && Date.parse(row.created_at) > cutoff);
  const audit = {
    cutoverAt,
    applicationTotal: applications.length,
    applicationNew: newApps.length,
    reviewNew: newReviews.length,
    reviewDeleted: deletedReviewIds.length,
    applicationHash: hashIds(newApps.map(r => r.id)),
    newReviewHash: hashIds(newReviews.map(r => r.id)),
    deletedReviewHash: hashIds(deletedReviewIds),
  };
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    cutoverAt,
    applications: newApps,
    newReviews,
    deletedReviewIds,
    audit,
  };
}

/** Re-verify the package's integrity hashes and counts after construction or load. */
export function auditRollback(pkg) {
  const errors = [];
  if (!pkg || pkg.version !== 1) { return {ok: false, errors: ['unsupported package version']}; }
  const a = pkg.audit || {};
  if (a.applicationNew !== (pkg.applications || []).length) errors.push('application count mismatch');
  if (a.reviewNew !== (pkg.newReviews || []).length) errors.push('new review count mismatch');
  if (a.reviewDeleted !== (pkg.deletedReviewIds || []).length) errors.push('deleted review count mismatch');
  if (a.applicationHash !== hashIds((pkg.applications || []).map(r => r.id))) errors.push('application hash mismatch');
  if (a.newReviewHash !== hashIds((pkg.newReviews || []).map(r => r.id))) errors.push('new review hash mismatch');
  if (a.deletedReviewHash !== hashIds(pkg.deletedReviewIds || [])) errors.push('deleted review hash mismatch');
  return {ok: errors.length === 0, errors};
}

export {collect};
