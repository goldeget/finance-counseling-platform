import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const module=await import('../src/api.mjs').catch(()=>({}));
function testDb(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  return {sqlite,prepare(sql){return {bind(...args){return {first:async()=>sqlite.prepare(sql).get(...args)||null,all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}})}}}}};
}
const applicant={name:'김예시',phone:'01012345678',birth:'1990-01-01',job:'기타',tenure:'',industry:'',industryCategory:'',overdue:'없음',card:'사용 중',amount:2000,rate:5.9,term:36,consent:true,idempotencyKey:'123e4567-e89b-42d3-a456-426614174000'};
function req(data=applicant,origin='https://loan.example.com') {return new Request('https://loan.example.com/api/applications',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.15'},body:JSON.stringify(data)});}
test('a retry returns the original receipt without creating a second application',async()=>{
  const db=testDb(),env={DB:db,APPLICATION_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')};
  assert.equal(typeof module.submitApplication,'function');
  const first=await module.submitApplication(req(),env),a=await first.json();
  const retry=await module.submitApplication(req(),env),b=await retry.json();
  assert.equal(first.status,201);assert.equal(retry.status,200);assert.equal(a.reference,b.reference);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM applications').get().n,1);
  assert.ok(!JSON.stringify(db.sqlite.prepare('SELECT * FROM applications').get()).includes(applicant.name));
  assert.equal((await module.submitApplication(req({...applicant,amount:3000}),env)).status,409);
});
test('rejects cross-origin and missing-consent submissions',async()=>{
  const env={DB:testDb(),APPLICATION_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')};
  assert.equal((await module.submitApplication(req(applicant,'https://other.example'),env)).status,403);
  assert.equal((await module.submitApplication(req({...applicant,consent:false}),env)).status,400);
});
test('admin data can be read and deleted without changing unrelated reviews',async()=>{
  const db=testDb(),env={DB:db,APPLICATION_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')};
  assert.equal((await module.submitApplication(req(),env)).status,201);
  db.sqlite.prepare('INSERT INTO reviews VALUES (?,?,?,?,?,?,?)').run('review','김**','고객 확인 후기',5,'상담 후기','2026-11-01','2026-11-01');
  const list=await module.listApplications(new Request('https://admin.example.com/api/admin/applications'),env);
  const data=await list.json();assert.equal(data.items[0].name,applicant.name);assert.equal(data.total,1);
  const del=new Request('https://admin.example.com/api/admin/applications/'+applicant.idempotencyKey,{method:'DELETE',headers:{origin:'https://admin.example.com'}});
  assert.equal((await module.deleteApplication(del,env,applicant.idempotencyKey)).status,200);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM applications').get().n,0);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM reviews').get().n,1);
});
