import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/application-backup-worker.mjs';
const secret='a'.repeat(64);
function env(rows=[]) { return {BACKUP_TOKEN:secret,DB:{prepare(){return {bind(){return {async all(){return {results:rows}}}}}}}}; }
test('requires a secret before accessing the database',async()=>{
  const e=env(); e.DB.prepare=()=>{throw Error('must not read')};
  assert.equal((await worker.fetch(new Request('https://backup.example/snapshot'),e)).status,404);
  assert.equal((await worker.fetch(new Request('https://backup.example/snapshot',{headers:{'x-backup-token':'b'.repeat(64)}}),e)).status,404);
});
test('returns encrypted pages to a valid token and rejects invalid cursors',async()=>{
  const rows=Array.from({length:201},(_,i)=>({id:String(i).padStart(36,'0'),iv:'x',ciphertext:'y'}));
  const h={'x-backup-token':secret};
  const response=await worker.fetch(new Request('https://backup.example/snapshot',{headers:h}),env(rows));
  const body=await response.json();assert.equal(response.status,200);assert.equal(body.items.length,200);assert.equal(body.next,rows[199].id);
  assert.equal((await worker.fetch(new Request('https://backup.example/snapshot?after=invalid',{headers:h}),env())).status,400);
});
test('retention status is private and reports only completed maintenance metadata',async()=>{
  const e={BACKUP_TOKEN:secret,DB:{prepare(){return {async first(){return {completed_at:'2026-11-14T18:00:03.000Z',deleted:2,more:0}}}}}};
  assert.equal((await worker.fetch(new Request('https://backup.example/retention-status'),e)).status,404);
  const res=await worker.fetch(new Request('https://backup.example/retention-status',{headers:{'x-backup-token':secret}}),e);
  assert.deepEqual(await res.json(),{completed_at:'2026-11-14T18:00:03.000Z',deleted:2,more:false});
});
test('accepts a protected retention alarm and does not accept unauthenticated alarms',async()=>{
  const req=(headers={})=>new Request('https://backup.example/retention-alert',{method:'POST',headers});
  assert.equal((await worker.fetch(req(),env())).status,404);
  assert.equal((await worker.fetch(req({'x-backup-token':secret}),env())).status,204);
});
