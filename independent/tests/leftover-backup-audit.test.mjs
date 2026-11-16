import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditDirectory, deleteFound} from '../leftover-backup-audit.mjs';

async function makeTempTree() {
  const root = await mkdtemp(join(tmpdir(), 'audit-'));
  await mkdir(join(root, 'sub'), {recursive: true});
  await mkdir(join(root, 'migration-snapshot'), {recursive: true});
  await mkdir(join(root, 'migration-resnapshot-20261112'), {recursive: true});
  await mkdir(join(root, 'other'), {recursive: true});
  await writeFile(join(root, 'applications.enc.json'), 'encrypted');
  await writeFile(join(root, 'sub', 'applications.jsonl'), '{"id":"1"}\n');
  await writeFile(join(root, 'migration-snapshot', 'applications.jsonl'), '{"id":"2"}\n');
  await writeFile(join(root, 'migration-resnapshot-20261112', 'applications.jsonl'), '{"id":"3"}\n');
  await writeFile(join(root, 'other', 'notes.txt'), 'not a backup');
  return root;
}

test('auditDirectory finds all backup patterns', async () => {
  const root = await makeTempTree();
  try {
    const found = await auditDirectory(root);
    const paths = found.map(f => f.path.replace(root, ''));
    assert.ok(paths.some(p => p.endsWith('applications.enc.json')));
    assert.ok(paths.some(p => p.includes('sub') && p.endsWith('applications.jsonl')));
    assert.ok(paths.some(p => p.includes('migration-snapshot')));
    assert.ok(paths.some(p => p.includes('migration-resnapshot-20261112')));
    // notes.txt should not be found
    assert.ok(!paths.some(p => p.includes('notes.txt')));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('auditDirectory returns empty for a clean tree', async () => {
  const root = await mkdtemp(join(tmpdir(), 'clean-'));
  try {
    await mkdir(join(root, 'data'), {recursive: true});
    await writeFile(join(root, 'data', 'readme.txt'), 'hello');
    const found = await auditDirectory(root);
    assert.equal(found.length, 0);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('auditDirectory reports file size and hash', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hash-'));
  try {
    await writeFile(join(root, 'applications.enc.json'), 'test-content');
    const found = await auditDirectory(root);
    assert.equal(found.length, 1);
    assert.ok(found[0].size > 0);
    assert.match(found[0].sha256, /^[0-9a-f]{16}$/);
    assert.equal(found[0].type, 'file');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('deleteFound removes files and reports results', async () => {
  const root = await makeTempTree();
  try {
    const found = await auditDirectory(root);
    assert.ok(found.length > 0);
    const results = await deleteFound(found);
    assert.ok(results.every(r => r.deleted));
    // Re-audit: should find nothing
    const recheck = await auditDirectory(root);
    assert.equal(recheck.length, 0);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('auditDirectory handles a non-existent directory gracefully', async () => {
  const found = await auditDirectory(join(tmpdir(), 'does-not-exist-' + Date.now()));
  assert.equal(found.length, 0);
});
