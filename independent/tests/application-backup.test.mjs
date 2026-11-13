import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,randomBytes} from 'node:crypto';
import {seal,openBackup,collect} from '../src/application-backup.mjs';
const key=randomBytes(32).toString('base64');
function record(date='2026-11-12T00:00:00.000Z'){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'base64'),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify({name:'synthetic'})),cipher.final(),cipher.getAuthTag()]);
  return {id:'00000000-0000-4000-8000-000000000001',created_at:date,reference:'test',iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')};
}
test('backup encrypts, authenticates and restores records in memory',()=>{
  const row=record(),sealed=seal([row],key);assert.equal(sealed.includes('synthetic'),false);assert.deepEqual(openBackup(sealed,key,new Date('2026-11-13T00:00:00Z')).rows,[row]);
  assert.throws(()=>openBackup(sealed,randomBytes(32).toString('base64')));
});
test('expired records are excluded when a backup is restored later',()=>{
  const sealed=seal([record('2024-01-01T00:00:00.000Z')],key);const restored=openBackup(sealed,key,new Date('2026-11-13T00:00:00Z'));assert.equal(restored.rows.length,0);assert.equal(restored.expired,1);
});
test('snapshot collection checks ordering and refuses a broken cursor',async()=>{
  const row=record();const response=()=>Response.json({items:[row],next:row.id});
  await assert.rejects(collect(async()=>response(),'https://backup.example','secret'),/ordering/);
  assert.deepEqual(await collect(async()=>Response.json({items:[row],next:null}),'https://backup.example','secret'),[row]);
});
