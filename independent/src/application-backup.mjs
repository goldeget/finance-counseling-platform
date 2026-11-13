import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {retentionCutoff} from './retention.mjs';

const decodeKey=(value)=>{const key=Buffer.from(value||'','base64');if(key.length!==32)throw Error('Invalid application key');return key};
const backupKey=(key)=>createHash('sha256').update('finance-application-backup-v1\0').update(key).digest();
function decryptRow(row,key) {
  const iv=Buffer.from(row.iv,'base64'),data=Buffer.from(row.ciphertext,'base64');
  if(iv.length!==12||data.length<17)throw Error('Invalid encrypted record');
  const d=createDecipheriv('aes-256-gcm',key,iv);d.setAuthTag(data.subarray(-16));
  const plain=Buffer.concat([d.update(data.subarray(0,-16)),d.final()]);
  try {const value=JSON.parse(plain.toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid record');} finally {plain.fill(0)}
}
export function verifyRecords(rows,keyValue) {
  const key=decodeKey(keyValue),ids=new Set();
  try {for(const row of rows){if(!/^[0-9a-f-]{36}$/i.test(row.id)||ids.has(row.id)||!Number.isFinite(Date.parse(row.created_at)))throw Error('Invalid record metadata');ids.add(row.id);decryptRow(row,key)}}finally{key.fill(0)}
  return rows.length;
}
export function seal(rows,keyValue) {
  verifyRecords(rows,keyValue);
  const key=decodeKey(keyValue),derived=backupKey(key),iv=randomBytes(12),data=gzipSync(Buffer.from(JSON.stringify({version:1,rows})));
  try {const cipher=createCipheriv('aes-256-gcm',derived,iv);const ciphertext=Buffer.concat([cipher.update(data),cipher.final()]);return JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')})}finally{key.fill(0);derived.fill(0);data.fill(0)}
}
export function openBackup(contents,keyValue,now=new Date()) {
  const envelope=JSON.parse(contents);if(envelope.version!==1)throw Error('Unsupported backup');
  const key=decodeKey(keyValue),derived=backupKey(key);let compressed,plain;
  try {const d=createDecipheriv('aes-256-gcm',derived,Buffer.from(envelope.iv,'base64'));d.setAuthTag(Buffer.from(envelope.tag,'base64'));compressed=Buffer.concat([d.update(Buffer.from(envelope.ciphertext,'base64')),d.final()]);plain=gunzipSync(compressed);const payload=JSON.parse(plain.toString('utf8'));if(payload.version!==1||!Array.isArray(payload.rows))throw Error('Invalid backup');verifyRecords(payload.rows,keyValue);const cutoff=retentionCutoff(now);return {rows:payload.rows.filter(row=>row.created_at>cutoff),expired:payload.rows.filter(row=>row.created_at<=cutoff).length}}finally{key.fill(0);derived.fill(0);compressed?.fill(0);plain?.fill(0)}
}
export async function collect(fetcher,url,token) {
  const rows=[];let cursor='';
  for(let page=0;page<10000;page++) {
    const u=new URL('/snapshot',url);if(cursor)u.searchParams.set('after',cursor);
    const res=await fetcher(u,{headers:{'x-backup-token':token},redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw Error('Backup endpoint unavailable');const body=await res.json();
    if(!Array.isArray(body.items)||body.items.length>200||!(body.next===null||typeof body.next==='string'))throw Error('Invalid backup page');
    for(const row of body.items){if(typeof row.id!=='string'||row.id<=cursor)throw Error('Invalid backup ordering');cursor=row.id;rows.push(row)}
    if(body.next===null)return rows;
    if(!body.items.length||body.next!==cursor)throw Error('Invalid backup cursor');
  }
  throw Error('Backup page limit reached');
}
