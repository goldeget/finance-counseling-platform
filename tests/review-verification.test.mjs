import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {verificationSql} from '../lib/review-verification.ts';
test('reports total, unique text, and both targeted phrase counts',()=>{
  const db=new DatabaseSync(':memory:'); db.exec('CREATE TABLE reviews (content TEXT)');
  const insert=db.prepare('INSERT INTO reviews VALUES (?)');
  insert.run('반복 문장'); insert.run('반복 문장'); insert.run('다른 문장');
  assert.ok(verificationSql.includes('COUNT(DISTINCT content)'));
  const result=db.prepare(verificationSql).get('반복','다른','문장','반복');
  assert.deepEqual({...result},{total:3,unique_count:2,common_count:2,long_count:1,result_count:3,match_count:2});
});
