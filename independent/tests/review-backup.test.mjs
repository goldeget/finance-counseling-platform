import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { backupReviews } from '../src/review-backup.mjs';

const records = [
  {id:'a',author:'가',source:'고객',rating:5,content:'첫 후기',review_date:'2026-01-01',created_at:'2026-01-01T00:00:00Z'},
  {id:'b',author:'나',source:'고객',rating:4.5,content:'둘째 후기',review_date:'2026-01-02',created_at:'2026-01-02T00:00:00Z'},
  {id:'c',author:'다',source:'고객',rating:4,content:'셋째 후기',review_date:'2026-01-03',created_at:'2026-01-03T00:00:00Z'}
];
function fakeServer({change=false}={}) {
  let scans=0;
  return async url => {
    const u=new URL(url);
    if(u.pathname.endsWith('review_stats')) return Response.json([{count:records.length}]);
    const after=u.searchParams.get('id')?.slice(3)||'';
    if(!after) scans++;
    const rows=records.filter(x=>x.id>after).slice(0,2).map(x=>({...x}));
    if(change && scans===2 && rows[0]) rows[0].content='변경됨';
    return Response.json(rows);
  };
}
test('produces a restorable compressed backup after two matching scans', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'reviews-backup-'));
 try{
  const result=await backupReviews({base:'https://example.supabase.co',key:'test',directory:dir,pageSize:2,fetcher:fakeServer()});
  const rows=gunzipSync(await readFile(join(dir,'reviews.jsonl.gz'))).toString('utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows,records);assert.equal(result.count,3);assert.match(result.sha256,/^[a-f0-9]{64}$/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('does not publish a backup when content changes during collection even if counts match', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'reviews-backup-'));
 try{
  await assert.rejects(backupReviews({base:'https://example.supabase.co',key:'test',directory:dir,pageSize:2,fetcher:fakeServer({change:true})}),/changed/i);
  assert.equal((await readdir(dir)).includes('reviews.jsonl.gz'),false);
 }finally{await rm(dir,{recursive:true,force:true})}
});
