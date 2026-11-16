// On-demand: build a rollback package comparing live data against the committed
// cutover baseline. Captures post-cutover applications (encrypted), new reviews,
// and deleted review ids so a DNS flip-back to the legacy site loses no data.
import {gunzipSync} from 'node:zlib';
import {readFile, writeFile} from 'node:fs/promises';
import {collectReviewIds, fetchReviewsByIds, computeReviewDelta, buildRollbackPackage, auditRollback} from './src/rollback.mjs';
import {collect} from './src/application-backup.mjs';

const base = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const backupUrl = process.env.BACKUP_URL || '';
const backupToken = process.env.APPLICATION_BACKUP_TOKEN || '';
const baselinePath = process.env.BASELINE_PATH || 'independent/baseline/cutover-reviews-baseline.json.gz';
const cutoverAt = process.env.CUTOVER_AT || '2026-11-13T00:00:00+09:00';
const outPath = process.env.ROLLBACK_PACKAGE || 'rollback-package.json';

if (!base.startsWith('https://')) throw Error('SUPABASE_URL is required');
if (!key) throw Error('SUPABASE_PUBLISHABLE_KEY is required');
if (!backupUrl.startsWith('https://')) throw Error('BACKUP_URL is required');
if (!/^[a-f0-9]{64}$/.test(backupToken)) throw Error('APPLICATION_BACKUP_TOKEN is required');
if (!Number.isFinite(Date.parse(cutoverAt))) throw Error('CUTOVER_AT is not a valid timestamp');

const baselineRaw = JSON.parse(gunzipSync(await readFile(baselinePath)).toString('utf8'));
if (!baselineRaw.manifest || baselineRaw.manifest.version !== 1 || !Array.isArray(baselineRaw.ids)) throw Error('Invalid baseline file');
const baselineIds = baselineRaw.ids;

const currentIds = await collectReviewIds(base, key);
const {newIds, deletedIds} = computeReviewDelta(currentIds, baselineIds);
const newReviews = await fetchReviewsByIds(base, key, newIds);
const applications = await collect(fetch, backupUrl, backupToken);

const pkg = await buildRollbackPackage({applications, newReviews, deletedReviewIds: deletedIds, cutoverAt});
const audit = auditRollback(pkg);
if (!audit.ok) {
  console.error('Rollback audit failed:', audit.errors.join('; '));
  process.exitCode = 1;
}

await writeFile(outPath, JSON.stringify(pkg));
console.log(JSON.stringify({
  written: outPath,
  auditOk: audit.ok,
  applicationTotal: pkg.audit.applicationTotal,
  applicationNew: pkg.audit.applicationNew,
  reviewNew: pkg.audit.reviewNew,
  reviewDeleted: pkg.audit.reviewDeleted,
  baselineCount: baselineIds.length,
  currentCount: currentIds.length,
}));
