export async function checkRetentionHealth(token, fetcher=fetch, now=new Date()) {
  if (!/^[a-f0-9]{64}$/.test(token || '') || !Number.isFinite(now.getTime())) throw Error('Retention monitor configuration unavailable');
  const response=await fetcher('https://finance-counseling-app-backup.4tencpkr.workers.dev/retention-status', {headers:{'x-backup-token':token},redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(response.status!==200) throw Error('Retention status unavailable');
  const body=await response.json();
  const completed=Date.parse(body?.completed_at);
  let latest=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),18);
  // Give the 18:00 UTC job one hour to finish before requiring that slot.
  if(now.getTime()<latest+3600000)latest-=86400000;
  if(!Number.isFinite(completed)||completed<latest||completed>now.getTime()+300000||body.more!==false||!Number.isSafeInteger(body.deleted)||body.deleted<0) throw Error('Retention job missing, stale or incomplete');
  return {ok:true,completedAt:body.completed_at,deleted:body.deleted};
}
