import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { removePhraseSql, targetPhrase } from '../lib/review-cleanup.ts';
test('removes every occurrence from matching reviews without changing other rows or metadata', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE reviews (id TEXT PRIMARY KEY, content TEXT, rating REAL, review_date TEXT)');
  const ins=db.prepare('INSERT INTO reviews VALUES (?,?,?,?)');
  ins.run('1', `좋은 상담이었습니다. ${targetPhrase}`, 4.5, '2026-01-02');
  ins.run('2', `원문 ${targetPhrase} 중간 ${targetPhrase}`, 5, '2026-01-03');
  ins.run('3', '변경할 필요 없는 후기', 4, '2026-01-04');
  assert.ok(removePhraseSql.includes('UPDATE'), 'must update reviews');
  const update=db.prepare(removePhraseSql);
  assert.equal(update.run(targetPhrase,targetPhrase).changes,2);
  assert.equal(update.run(targetPhrase,targetPhrase).changes,0);
  assert.deepEqual({...db.prepare('SELECT content, rating, review_date FROM reviews WHERE id=?').get('1')}, {content:'좋은 상담이었습니다.', rating:4.5, review_date:'2026-01-02'});
  assert.equal(db.prepare('SELECT content FROM reviews WHERE id=?').get('2').content,'원문  중간');
  assert.equal(db.prepare('SELECT content FROM reviews WHERE id=?').get('3').content,'변경할 필요 없는 후기');
});
