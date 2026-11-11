import {verifyAccess} from './access.mjs';
const h={'Cache-Control':'no-store','Content-Type':'application/json'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:h});
export function validReviewDate(date,now=Date.now()){
  const d=new Date(date+'T00:00:00Z'),today=new Date(now+9*3600000).toISOString().slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date&&date>='1900-01-01'&&date<=today;
}
export async function handleAdmin(request,env,fetcher=fetch,verify=verifyAccess){
  if(request.method!=='POST')return reply({error:'잘못된 요청입니다.'},405);
  if(!await verify(request.headers.get('x-access-jwt'),env,fetcher))return reply({error:'접근 권한이 없습니다.'},403);
  if(env.MIGRATION_READ_ONLY==='true')return reply({error:'자료 이전 중에는 변경할 수 없습니다.'},503);
  let body;try{const text=await request.text();if(text.length>8192)throw Error();body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error()}catch{return reply({error:'입력값을 확인해 주세요.'},400)}
  if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)return reply({error:'후기 서비스를 사용할 수 없습니다.'},503);
  const endpoint=new URL('/rest/v1/reviews',env.SUPABASE_URL),headers={apikey:env.SUPABASE_SECRET_KEY,'content-type':'application/json',prefer:'return=minimal'};
  try{
    if(body.action==='delete'){
      const id=body.id;if(typeof id!=='string'||(!/^[0-9a-f-]{36}$/i.test(id)&&!/^csv-[0-9a-f]{64}-[a-zA-Z0-9_-]{1,100}$/.test(id)))return reply({error:'잘못된 후기 번호입니다.'},400);
      endpoint.searchParams.set('id','eq.'+id);const r=await fetcher(endpoint.toString(),{method:'DELETE',headers});if(!r.ok)throw Error();return reply({ok:true});
    }
    if(body.action==='create'){
      const b=body.review||{},author=typeof b.author==='string'?b.author.trim():'',source=typeof b.source==='string'?b.source.trim():'',content=typeof b.content==='string'?b.content.trim():'',date=typeof b.reviewDate==='string'?b.reviewDate.trim():'',rating=Number(b.rating);
      const dateOk=validReviewDate(date);
      if(!author||author.length>20||!source||source.length>50||content.length<5||content.length>1000||!dateOk||!Number.isInteger(rating)||rating<1||rating>5||b.confirmed!==true||/\d{6,}|@/.test(author)||/\d{8,}|@/.test(source)||/01[016789][ -]?\d{3,4}[ -]?\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content))return reply({error:'작성자, 출처, 후기, 날짜 및 확인 항목을 확인해 주세요.'},400);
      const row={id:crypto.randomUUID(),author:author==='익명'?'익명':author.slice(0,1)+'**',source,rating,content,review_date:date,created_at:new Date().toISOString()};
      const r=await fetcher(endpoint.toString(),{method:'POST',headers,body:JSON.stringify(row)});if(!r.ok)throw Error();return reply({ok:true},201);
    }
    return reply({error:'지원하지 않는 작업입니다.'},400);
  }catch{return reply({error:'후기를 처리하지 못했습니다.'},503)}
}
