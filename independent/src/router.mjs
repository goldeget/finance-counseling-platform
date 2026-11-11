import {verifyAccess} from './access.mjs';
import {submitApplication,listApplications,deleteApplication} from './api.mjs';
import {listReviews,createReview} from './reviews.mjs';
import {listSupabaseReviews,forwardReviewMutation} from './supabase-reviews.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(x,status=200)=>Response.json(x,{status,headers});
export async function route(request,env,verify=verifyAccess){
  const url=new URL(request.url),path=url.pathname,admin=url.hostname===env.ADMIN_HOST;
  if(url.hostname!==env.PUBLIC_HOST&&!admin)return reply({error:'Not found'},404);
  if(admin){
    if(!await verify(request.headers.get('cf-access-jwt-assertion'),env))return reply({error:'접근 권한이 없습니다.'},403);
    if(env.MIGRATION_READ_ONLY==='true'&&path.startsWith('/api/admin/')&&!['GET','HEAD'].includes(request.method))return reply({error:'자료 이전 중에는 변경할 수 없습니다.'},503);
    if(path==='/api/admin/applications'&&request.method==='GET')return listApplications(request,env);
    const app=path.match(/^\/api\/admin\/applications\/([0-9a-f-]{36})$/i);
    if(app&&request.method==='DELETE')return deleteApplication(request,env,app[1]);
    if(path==='/api/reviews'&&request.method==='GET')return env.SUPABASE_URL?listSupabaseReviews(request,env):listReviews(request,env);
    if(path==='/api/admin/reviews'&&request.method==='POST')return env.SUPABASE_URL?forwardReviewMutation(request,env,'create'):createReview(request,env);
    const rev=path.match(/^\/api\/admin\/reviews\/([a-zA-Z0-9_-]{1,170})$/);
    if(rev&&request.method==='DELETE'){
      if(request.headers.get('origin')!==url.origin)return reply({error:'잘못된 요청입니다.'},403);
      if(!/^[0-9a-f-]{36}$/i.test(rev[1])&&!/^csv-[0-9a-f]{64}-[a-zA-Z0-9_-]{1,100}$/.test(rev[1]))return reply({error:'잘못된 후기 번호입니다.'},400);
      if(env.SUPABASE_URL)return forwardReviewMutation(request,env,'delete',rev[1]);
      try{await env.DB.prepare('DELETE FROM reviews WHERE id=?').bind(rev[1]).run();return reply({ok:true})}catch{return reply({error:'후기를 삭제하지 못했습니다.'},503)}
    }
    return null;
  }
  if(path==='/api/applications'&&request.method==='POST')return env.MIGRATION_READ_ONLY==='true'?reply({error:'서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.'},503):submitApplication(request,env);
  if(path==='/api/reviews'&&request.method==='GET')return env.SUPABASE_URL?listSupabaseReviews(request,env):listReviews(request,env);
  if(path.startsWith('/api/'))return reply({error:'Not found'},404);
  return null;
}
