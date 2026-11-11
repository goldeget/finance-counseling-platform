import {createHash,randomUUID} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdir,rename,rm,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {pipeline} from 'node:stream/promises';
import {join} from 'node:path';
import {createGzip} from 'node:zlib';

const fields='id,author,source,rating,content,review_date,created_at';
async function json(url,key,fetcher){
  let error;
  for(let attempt=0;attempt<4;attempt++){
    try{const response=await fetcher(url,{headers:{apikey:key},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Review source returned '+response.status);return await response.json();}
    catch(e){error=e;if(attempt<3)await new Promise(r=>setTimeout(r,500*(attempt+1)));}
  }
  throw error;
}
async function count(base,key,fetcher){
  const data=await json(new URL('/rest/v1/review_stats?select=count',base),key,fetcher);
  if(!Array.isArray(data)||data.some(x=>!Number.isSafeInteger(Number(x.count))||Number(x.count)<0))throw Error('Invalid review counts');
  return data.reduce((sum,x)=>sum+Number(x.count),0);
}
async function scan({base,key,pageSize,fetcher,onLine}){
  let cursor='',count=0;const hash=createHash('sha256');
  for(;;){
    const url=new URL('/rest/v1/reviews',base);url.searchParams.set('select',fields);url.searchParams.set('order','id.asc');url.searchParams.set('limit',String(pageSize));if(cursor)url.searchParams.set('id','gt.'+cursor);
    const rows=await json(url,key,fetcher);if(!Array.isArray(rows)||rows.length>pageSize)throw Error('Invalid review page');
    for(const row of rows){
      if(!row||typeof row.id!=='string'||row.id<=cursor||fields.split(',').some(k=>!(k in row)))throw Error('Invalid or unordered review');
      cursor=row.id;const line=JSON.stringify(Object.fromEntries(fields.split(',').map(k=>[k,row[k]])))+'\n';hash.update(line);count++;
      if(onLine)await onLine(line);
    }
    if(rows.length<pageSize)break;
  }
  return {count,sha256:hash.digest('hex')};
}
export async function backupReviews({base,key,directory,pageSize=1000,fetcher=fetch}){
  const url=new URL(base);if(url.protocol!=='https:'||!key||!Number.isInteger(pageSize)||pageSize<1||pageSize>1000)throw Error('Invalid backup configuration');
  await mkdir(directory,{recursive:true});const partial=join(directory,'.partial-'+randomUUID()+'.gz'),final=join(directory,'reviews.jsonl.gz');
  const before=await count(url,key,fetcher),gzip=createGzip(),done=pipeline(gzip,createWriteStream(partial,{flags:'wx'}));
  try{
    const first=await scan({base:url,key,pageSize,fetcher,onLine:async line=>{if(!gzip.write(line))await once(gzip,'drain')}});
    gzip.end();await done;
    const second=await scan({base:url,key,pageSize,fetcher});const after=await count(url,key,fetcher);
    if(first.count!==before||second.count!==after||first.count!==second.count||first.sha256!==second.sha256)throw Error('Reviews changed during backup; no snapshot published');
    const manifest={version:1,createdAt:new Date().toISOString(),count:first.count,sha256:first.sha256,format:'UTF-8 JSON Lines, gzip',source:'Supabase reviews'};
    await rename(partial,final);await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});return manifest;
  }catch(e){gzip.destroy();await done.catch(()=>{});await rm(partial,{force:true});throw e;}
}
