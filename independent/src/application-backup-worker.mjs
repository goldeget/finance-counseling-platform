import {retentionCutoff} from './retention.mjs';

const reply=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const encoder=new TextEncoder();
async function validToken(provided,secret) {
  if(!/^[a-f0-9]{64}$/.test(provided)||!/^[a-f0-9]{64}$/.test(secret||''))return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode('finance-backup:v1'));
  const candidate=await crypto.subtle.importKey('raw',encoder.encode(provided),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',candidate,signature,encoder.encode('finance-backup:v1'));
}
export default {
  async fetch(request,env) {
    const u=new URL(request.url);
    const alarm=request.method==='POST'&&u.pathname==='/retention-alert';
    if(!alarm&&(request.method!=='GET'||!['/snapshot','/retention-status'].includes(u.pathname)))return reply({error:'Not found'},404);
    if(!await validToken(request.headers.get('x-backup-token')||'',env.BACKUP_TOKEN))return reply({error:'Not found'},404);
    if(alarm){console.error('Production retention health check failed');return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});}
    if(u.pathname==='/retention-status') {
      try {
        const row=await env.DB.prepare("SELECT completed_at,deleted,more FROM maintenance_status WHERE name='application-retention'").first();
        return row ? reply({completed_at:row.completed_at,deleted:row.deleted,more:row.more!==0},200) : reply({error:'No completed run'},503);
      } catch { return reply({error:'Retention status unavailable'},503); }
    }
    const cursor=u.searchParams.get('after')||'';
    if(cursor&&!/^[0-9a-f-]{36}$/i.test(cursor))return reply({error:'Invalid cursor'},400);
    try {
      const cutoff=retentionCutoff(new Date());
      const rows=await env.DB.prepare('SELECT id,created_at,reference,iv,ciphertext FROM applications WHERE id > ? AND created_at > ? ORDER BY id LIMIT 201').bind(cursor,cutoff).all();
      const items=rows.results.slice(0,200);
      return reply({items,next:rows.results.length>200?items.at(-1).id:null},200);
    } catch { return reply({error:'Snapshot unavailable'},503); }
  }
};
