import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const mod = await import('../lib/application-retention.ts').catch(() => ({}));

test('one calendar year cutoff never expires a record early across leap years', () => {
  assert.equal(mod.retentionCutoff?.(new Date('2028-02-29T12:00:00.000Z')), '2027-02-28T12:00:00.000Z');
  assert.equal(mod.retentionCutoff?.(new Date('2027-03-01T12:00:00.000Z')), '2026-03-01T12:00:00.000Z');
});

test('purge removes only expired application rows and preserves reviews', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE applications(id TEXT PRIMARY KEY, created_at TEXT NOT NULL); CREATE TABLE reviews(id TEXT PRIMARY KEY)');
  db.prepare('INSERT INTO applications VALUES (?,?)').run('old','2025-11-12T09:00:00.000Z');
  db.prepare('INSERT INTO applications VALUES (?,?)').run('recent','2026-11-11T09:00:00.000Z');
  db.prepare('INSERT INTO reviews VALUES (?)').run('old');
  assert.equal(typeof mod.deleteExpiredApplicationsSql, 'string');
  const result = db.prepare(mod.deleteExpiredApplicationsSql).run('2025-11-12T10:00:00.000Z');
  assert.equal(result.changes, 1);
  assert.deepEqual(db.prepare('SELECT id FROM applications').all().map(x=>x.id), ['recent']);
  assert.equal(db.prepare('SELECT count(*) AS n FROM reviews').get().n, 1);
});
