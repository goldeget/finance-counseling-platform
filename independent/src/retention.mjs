export function retentionCutoff(now) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid retention time');
  const year=now.getUTCFullYear()-1,month=now.getUTCMonth();
  const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return new Date(Date.UTC(year,month,Math.min(now.getUTCDate(),lastDay),now.getUTCHours(),now.getUTCMinutes(),now.getUTCSeconds(),now.getUTCMilliseconds())).toISOString();
}
export const deleteExpiredSql='DELETE FROM applications WHERE id IN (SELECT id FROM applications WHERE created_at <= ? ORDER BY created_at LIMIT 100)';
export async function purgeExpired(db,now=new Date()) {
  const cutoff=retentionCutoff(now);
  let deleted=0;
  for(let i=0;i<100;i++) {
    const result=await db.prepare(deleteExpiredSql).bind(cutoff).run();
    const count=Number(result.meta?.changes);
    if(!Number.isInteger(count)||count<0||count>100)throw Error('Unexpected retention result');
    deleted+=count;
    if(count<100)return {deleted,cutoff,more:false};
  }
  const row=await db.prepare('SELECT count(*) AS count FROM applications WHERE created_at <= ?').bind(cutoff).first();
  return {deleted,cutoff,more:Number(row?.count||0)>0};
}
