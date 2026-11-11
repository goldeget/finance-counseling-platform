import { getDb } from '../../../db';
import { applications } from '../../../db/schema';
import { encryptRecord, decryptRecord } from '../../../lib/application-crypto';
import { isAdmin, sameOrigin } from '../../../lib/admin-auth';
import { env } from 'cloudflare:workers';
import { allowSubmission } from '../../../lib/submission-rate-limit';
import { sameApplication, validApplicationKey } from '../../../lib/application-idempotency';
import { desc, eq, sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const response=(body:object,status=200)=>Response.json(body,{status,headers});
const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
function validDate(s:string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&s>='1900-01-01'&&d.getTime()<=Date.now(); }
export async function POST(request:Request) {
  if(!sameOrigin(request))return response({error:'잘못된 요청입니다.'},403);
  if(Number(request.headers.get('content-length')||0)>8192)return response({error:'입력 데이터가 너무 큽니다.'},413);
  let body:Record<string,unknown>;
  try{const text=await request.text();if(text.length>8192)return response({error:'입력 데이터가 너무 큽니다.'},413);body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return response({error:'입력값을 확인해 주세요.'},400)}
  const name=clean(body.name,60),phone=clean(body.phone,30),birth=clean(body.birth,10),job=clean(body.job,40),tenure=clean(body.tenure,40),industry=clean(body.industry,60),overdue=clean(body.overdue,30),card=clean(body.card,30);
  const amount=Number(body.amount),rate=Number(body.rate),term=Number(body.term);
  const jobs=['직장인','자영업자','프리랜서','대학생·취업준비','무직','기타'];
  const tenures=['3개월 미만','3개월 이상 ~ 6개월 미만','6개월 이상 ~ 1년 미만','1년 이상'];
  const industries=['요식업 · 카페','도소매 · 매장','온라인 쇼핑몰','미용 · 뷰티','숙박 · 관광','교육 · 학원','운송 · 배달','건설 · 인테리어','제조 · 생산','수리 · 정비','생활 · 전문 서비스','농업 · 어업','기타'];
  if(name.length<2||!/^01[016789]\d{7,8}$/.test(phone.replace(/[ -]/g,''))||!validDate(birth)||!jobs.includes(job)||!['없음','있음','잘 모르겠어요'].includes(overdue)||!['사용 중','사용 안 함','잘 모르겠어요'].includes(card)||!Number.isFinite(amount)||amount<10||amount>100000||!Number.isFinite(rate)||rate<0||rate>100||![12,24,36,48,60].includes(term)||body.consent!==true||(job==='직장인'&&!tenures.includes(tenure))||(job==='자영업자'&&!industries.includes(clean(body.industryCategory,40))))return response({error:'입력 항목과 동의 여부를 확인해 주세요.'},400);
  const ip=request.headers.get('cf-connecting-ip');const secret=(env as unknown as Record<string,string>).APPLICATION_ENCRYPTION_KEY;
  try{if(!env.DB||!ip||!secret)return response({error:'접수 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'},503);if(!await allowSubmission(env.DB,ip,secret))return Response.json({error:'접수 요청이 많습니다. 잠시 후 다시 시도해 주세요.'},{status:429,headers:{...headers,'Retry-After':'600'}})}catch{return response({error:'접수 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'},503)}
  const data={name,phone,birth,job,tenure:job==='직장인'?tenure:'',industry:job==='자영업자'?industry:'',overdue,card,amount,rate,term,consent:true,consentVersion:'consultation-v2'};
  if(body.idempotencyKey!==undefined&&!validApplicationKey(body.idempotencyKey))return response({error:'접수 요청을 확인해 주세요.'},400);
  try{
    const id=validApplicationKey(body.idempotencyKey)?body.idempotencyKey:crypto.randomUUID(),db=getDb();
    const replay=async()=>{
      const [row]=await db.select().from(applications).where(eq(applications.id,id)).limit(1);
      if(!row)return null;
      const original=await decryptRecord(row.iv,row.ciphertext);
      return row.reference&&sameApplication(original,data)?response({ok:true,reference:row.reference},200):response({error:'입력 내용이 변경되었습니다. 다시 접수해 주세요.'},409);
    };
    const prior=await replay();if(prior)return prior;
    const encrypted=await encryptRecord(data),now=new Date(),date=new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10).replace(/-/g,'');
    for(let attempt=0;attempt<5;attempt++){
      const random=crypto.getRandomValues(new Uint32Array(1))[0],reference=date+'-'+String(random%100000000).padStart(8,'0');
      try{await db.insert(applications).values({id,createdAt:now.toISOString(),reference,...encrypted});return response({ok:true,reference},201)}
      catch(error){const existing=await replay();if(existing)return existing;if(attempt===4)throw error}
    }
    throw Error('Reference generation failed');
  }catch{return response({error:'접수하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503)}
}
export async function GET(request:Request) {
  if(!await isAdmin())return response({error:'접근 권한이 없습니다.'},403);
  const url=new URL(request.url);const raw=Number(url.searchParams.get('offset')||0);const offset=Number.isSafeInteger(raw)&&raw>=0?Math.min(raw,100000):0;
  try{const db=getDb();const rows=await db.select().from(applications).orderBy(desc(applications.createdAt),desc(applications.id)).limit(25).offset(offset);const [count]=await db.select({value:sql<number>`count(*)`}).from(applications);const items=await Promise.all(rows.map(async row=>({id:row.id,reference:row.reference,createdAt:row.createdAt,...await decryptRecord(row.iv,row.ciphertext)})));return response({items,total:Number(count.value),offset})}catch{return response({error:'접수 목록을 불러오지 못했습니다.'},503)}
}
