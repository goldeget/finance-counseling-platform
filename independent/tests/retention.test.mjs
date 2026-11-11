import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {retentionCutoff,purgeExpired} from '../src/retention.mjs';
test('retention cutoff never expires a leap-year record early',()=>{
  assert.equal(retentionCutoff(new Date('2028-02-29T12:00:00.000Z')),'2027-02-28T12:00:00.000Z');
});
test('purge removes only applications over one year and does not touch reviews',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE applications(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);CREATE TABLE reviews(id TEXT PRIMARY KEY);');
  const add=db.prepare('INSERT INTO applications VALUES (?,?)');
  for(let i=0;i<201;i++)add.run('expired'+i,'2025-01-01T00:00:00.000Z');
  add.run('new','2026-11-01T00:00:00.000Z');db.prepare('INSERT INTO reviews VALUES (?)').run('review');
  const adapter={prepare(sql){return {bind(...args){return {run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),first:async()=>db.prepare(sql).get(...args)}}}}};
  const out=await purgeExpired(adapter,new Date('2026-11-12T00:00:00.000Z'));
  assert.equal(out.deleted,201);assert.equal(out.more,false);
  assert.equal(db.prepare('SELECT count(*) AS n FROM applications').get().n,1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM reviews').get().n,1);
});
