// One-time: export the cutover review-id baseline from Supabase.
// Run once shortly after cutover, then commit independent/baseline/cutover-reviews-baseline.json.gz.
// Contains UUIDs only (no PII).
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {mkdir, writeFile} from 'node:fs/promises';
import {collectReviewIds, hashIds} from './src/rollback.mjs';

const base = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (!base.startsWith('https://')) throw Error('SUPABASE_URL is required');
if (!key) throw Error('SUPABASE_PUBLISHABLE_KEY is required');

const ids = await collectReviewIds(base, key);
const sorted = [...new Set(ids)].sort();
const manifest = {
  version: 1,
  createdAt: new Date().toISOString(),
  purpose: 'cutover baseline — review ids only, no PII',
  count: sorted.length,
  sha256: hashIds(sorted),
};

await mkdir('independent/baseline', {recursive: true});
const outPath = 'independent/baseline/cutover-reviews-baseline.json.gz';
await writeFile(outPath, gzipSync(Buffer.from(JSON.stringify({manifest, ids: sorted}))));
console.log(JSON.stringify({written: outPath, count: manifest.count, sha256: manifest.sha256}));
