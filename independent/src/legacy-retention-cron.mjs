const endpoint='https://finance-limit-studio-7611.koreaputduk.chatgpt.site/api/retention-bridge';
export async function runLegacyRetention(env,fetcher=fetch){
  if(!/^[a-f0-9]{64}$/.test(env.SITE_RETENTION_TOKEN||''))throw Error('Retention secret unavailable');
  const response=await fetcher(endpoint,{method:'POST',headers:{'x-retention-token':env.SITE_RETENTION_TOKEN},redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Retention request failed');
  const result=await response.json();if(result.ok!==true||!Number.isInteger(result.deleted)||result.deleted<0||result.more!==false)throw Error('Invalid retention result');
  return {deleted:result.deleted};
}
export default {
  fetch(){return new Response('Not found',{status:404});},
  async scheduled(_event,env){const result=await runLegacyRetention(env);console.log(JSON.stringify({event:'legacy-retention',deleted:result.deleted}));}
};
