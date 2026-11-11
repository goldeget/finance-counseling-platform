import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {handleRetention,retentionCutoff} from '../lib/retention-bridge.mjs';
const token='a'.repeat(64),digest=createHash('sha256').update(token).digest('hex');
const request=value=>new Request('https://example.com/api/retention-bridge',{method:'POST',headers:{'x-retention-token':value}});
test('uses a leap-year safe one-calendar-year cutoff',()=>assert.equal(retentionCutoff(new Date('2028-02-29T12:00:00Z')),'2027-02-28T12:00:00.000Z'));
test('rejects an invalid token before touching the database',async()=>{
 let touched=false;const env={DB:{prepare(){touched=true;throw Error()}}};
 const res=await handleRetention(request('b'.repeat(64)),env,digest,new Date('2026-11-12T00:00:00Z'));
 assert.equal(res.status,403);assert.equal(touched,false);
});
test('deletes only expired consultation records and leaves reviews alone',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE applications(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);CREATE TABLE reviews(id TEXT PRIMARY KEY);INSERT INTO applications VALUES ('old','2025-01-01T00:00:00.000Z'),('recent','2026-10-01T00:00:00.000Z');INSERT INTO reviews VALUES ('review')");
 const env={DB:{prepare(sql){return {bind(...args){return {run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),first:async()=>db.prepare(sql).get(...args)}}}}}};
 const res=await handleRetention(request(token),env,digest,new Date('2026-11-12T00:00:00Z'));
 assert.equal(res.status,200);assert.equal((await res.json()).deleted,1);
 assert.equal(db.prepare('SELECT count(*) n FROM applications').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM reviews').get().n,1);
});
