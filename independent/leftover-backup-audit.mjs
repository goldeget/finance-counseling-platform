// Scan a directory tree for leftover backup copies of customer application data.
// Audit-only by default. --confirm-delete prints a manifest first, then deletes.
import {createHash} from 'node:crypto';
import {readdir, stat, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';

const PATTERNS = [
  /applications\.enc\.json$/i,
  /applications\.jsonl$/i,
  /(^|[\\/])migration-snapshot([\\/]|$)/i,
  /(^|[\\/])migration-resnapshot-[0-9]{8}([\\/]|$)/i,
];

async function walk(dir, found) {
  let entries;
  try { entries = await readdir(dir, {withFileTypes: true}); } catch { return; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (PATTERNS.some(p => p.test(full))) {
        // For directory patterns (migration-snapshot etc.), report the dir and its files
        await collectDir(full, found);
        continue; // don't descend further into matched dirs
      }
      await walk(full, found);
    } else if (entry.isFile()) {
      if (PATTERNS.some(p => p.test(full))) {
        await collectFile(full, found);
      }
    }
  }
}

async function collectFile(path, found) {
  try {
    const s = await stat(path);
    const hash = createHash('sha256');
    hash.update(await readFile(path));
    found.push({path, size: s.size, sha256: hash.digest('hex').slice(0, 16), type: 'file'});
  } catch {}
}

async function collectDir(path, found) {
  try {
    const entries = await readdir(path, {withFileTypes: true});
    for (const entry of entries) {
      if (entry.isFile()) await collectFile(join(path, entry.name), found);
      else if (entry.isDirectory()) await collectDir(join(path, entry.name), found);
    }
    found.push({path, size: 0, sha256: '-', type: 'directory'});
  } catch {}
}

export async function auditDirectory(root) {
  const found = [];
  await walk(root, found);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

export async function deleteFound(found) {
  const results = [];
  for (const item of found) {
    try {
      await rm(item.path, {recursive: item.type === 'directory', force: true});
      results.push({path: item.path, deleted: true});
    } catch (e) {
      results.push({path: item.path, deleted: false, error: e.message});
    }
  }
  return results;
}

// --- CLI (only runs when executed directly, not when imported for tests) ---
import {fileURLToPath} from 'node:url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = process.argv[2];
  const confirmDelete = process.argv.includes('--confirm-delete');

  if (!root) {
    console.error('Usage: node leftover-backup-audit.mjs <directory> [--confirm-delete]');
    process.exit(1);
  }

  const found = await auditDirectory(root);
  if (found.length === 0) {
    console.log(JSON.stringify({ok: true, found: 0, message: 'No leftover backup copies found.'}));
    process.exit(0);
  }

  console.log(JSON.stringify({found: found.length, items: found}, null, 2));

  if (confirmDelete) {
    const results = await deleteFound(found);
    console.log('--- Deletion results ---');
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\nAudit-only mode. Re-run with --confirm-delete to delete the listed files.');
  }
}