import {route} from './router.mjs';
import {purgeExpired} from './retention.mjs';
import {landing,reviews,progress,admin,favicon} from '../dist/assets.mjs';
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
const response=(body,type,status=200)=>new Response(body,{status,headers:{...noStore,'Content-Type':type}});
export default {
  async fetch(request,env){
    if(env.STAGING==='true'&&new URL(request.url).hostname!==env.ADMIN_HOST){
      const expected=env.STAGING_TOKEN||'',actual=request.headers.get('x-staging-token')||'';
      let difference=expected.length^actual.length;
      for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^(actual.charCodeAt(i)||0);
      if(!expected||difference)return response('Not available','text/plain',403);
    }
    const routed=await route(request,env);if(routed)return routed;
    const url=new URL(request.url);
    if(request.method!=='GET'&&request.method!=='HEAD')return response('Not found','text/plain',404);
    if(url.hostname===env.ADMIN_HOST){
      if(env.STAGING==='true'&&url.pathname==='/qa-test')return response(landing,'text/html; charset=utf-8');
      if(env.STAGING==='true'&&url.pathname==='/consultation-progress.mjs')return response(progress,'text/javascript; charset=utf-8');
      return (url.pathname==='/'||url.pathname==='/admin')?response(admin,'text/html; charset=utf-8'):response('Not found','text/plain',404);
    }
    if(url.hostname!==env.PUBLIC_HOST)return response('Not found','text/plain',404);
    if(url.pathname==='/'||url.pathname==='/landing'||url.pathname==='/landing.html')return response(landing,'text/html; charset=utf-8');
    if(url.pathname==='/reviews'||url.pathname==='/reviews.html')return response(reviews,'text/html; charset=utf-8');
    if(url.pathname==='/consultation-progress.mjs')return response(progress,'text/javascript; charset=utf-8');
    if(url.pathname==='/favicon.svg')return response(favicon,'image/svg+xml');
    return response('Not found','text/plain',404);
  },
  async scheduled(event,env){
    const out=await purgeExpired(env.DB,new Date(event.scheduledTime));
    await env.DB.prepare('DELETE FROM submission_limits WHERE expires_at < ?').bind(event.scheduledTime).run();
    console.log(JSON.stringify({event:'application-retention',deleted:out.deleted,more:out.more,cutoff:out.cutoff}));
    if(out.more)throw new Error('Retention backlog remains; retry required');
  }
};
