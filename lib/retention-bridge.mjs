export function retentionCutoff(now){
  if(!Number.isFinite(now.getTime()))throw Error('Invalid time');
  const year=now.getUTCFullYear()-1,month=now.getUTCMonth(),last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return new Date(Date.UTC(year,month,Math.min(now.getUTCDate(),last),now.getUTCHours(),now.getUTCMinutes(),now.getUTCSeconds(),now.getUTCMilliseconds())).toISOString();
}
const reply=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleRetention(request,env,expectedHash,now=new Date()){
  if(request.method!=='POST')return reply({error:'Not found'},405);
  const token=request.headers.get('x-retention-token')||'';
  if(!/^[a-f0-9]{64}$/.test(token)||!/^[a-f0-9]{64}$/.test(expectedHash))return reply({error:'Forbidden'},403);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
  let difference=0;for(let i=0;i<64;i++)difference|=hash.charCodeAt(i)^expectedHash.charCodeAt(i);
  if(difference)return reply({error:'Forbidden'},403);
  try{
    if(!env.DB)throw Error('No database');const cutoff=retentionCutoff(now);let deleted=0;
    for(let i=0;i<100;i++){
      const out=await env.DB.prepare('DELETE FROM applications WHERE id IN (SELECT id FROM applications WHERE created_at <= ? ORDER BY created_at LIMIT 100)').bind(cutoff).run();
      const n=Number(out.meta?.changes);if(!Number.isInteger(n)||n<0||n>100)throw Error('Invalid delete result');deleted+=n;
      if(n<100)return reply({ok:true,deleted,more:false},200);
    }
    const more=await env.DB.prepare('SELECT count(*) AS count FROM applications WHERE created_at <= ?').bind(cutoff).first();
    return Number(more?.count||0)>0?reply({error:'Backlog remains'},503):reply({ok:true,deleted,more:false},200);
  }catch{return reply({error:'Retention unavailable'},503)}
}
