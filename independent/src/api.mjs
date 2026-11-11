const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const validKey=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const fields=['name','phone','birth','job','tenure','industry','overdue','card','amount','rate','term','consent','consentVersion'];
const equal=(a,b)=>fields.every(k=>a[k]===b[k]);
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&s>='1900-01-01'&&d.getTime()<=Date.now();}
function bytes(b64){return Uint8Array.from(atob(b64),c=>c.charCodeAt(0));}
function base64(arr){return btoa(String.fromCharCode(...arr));}
async function encryptionKey(env){const b=bytes(env.APPLICATION_ENCRYPTION_KEY||'');if(b.length!==32)throw Error('Invalid encryption key');return crypto.subtle.importKey('raw',b,'AES-GCM',false,['encrypt','decrypt']);}
async function decrypt(row,key){const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(row.iv)},key,bytes(row.ciphertext));return JSON.parse(new TextDecoder().decode(data));}
async function encrypt(data,key){const iv=crypto.getRandomValues(new Uint8Array(12));const out=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));return {iv:base64(iv),ciphertext:base64(new Uint8Array(out))};}
export async function listApplications(request,env){
  const raw=Number(new URL(request.url).searchParams.get('offset')||0),offset=Number.isSafeInteger(raw)&&raw>=0?Math.min(raw,100000):0;
  try{
    const [data,total,key]=await Promise.all([env.DB.prepare('SELECT id,reference,created_at,iv,ciphertext FROM applications ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?').bind(offset).all(),env.DB.prepare('SELECT count(*) AS n FROM applications').bind().first(),encryptionKey(env)]);
    const items=await Promise.all(data.results.map(async row=>({id:row.id,reference:row.reference,createdAt:row.created_at,...await decrypt(row,key)})));
    return reply({items,total:Number(total.n),offset});
  }catch{return reply({error:'접수 목록을 불러오지 못했습니다.'},503)}
}
export async function deleteApplication(request,env,id){
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'잘못된 요청입니다.'},403);
  if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'잘못된 요청입니다.'},400);
  try{await env.DB.prepare('DELETE FROM applications WHERE id=?').bind(id).run();return reply({ok:true})}catch{return reply({error:'삭제에 실패했습니다.'},503)}
}
async function allow(db,ip,secret){
  if(!ip||ip.length>100)throw Error('Missing address');
  const bucket=Math.floor(Date.now()/600000),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('submission-rate:v1:'+bucket+':'+ip));
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const row=await db.prepare('INSERT INTO submission_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(hash,(bucket+2)*600000).first();
  return Number(row?.count)<=10;
}
export async function submitApplication(request,env){
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'잘못된 요청입니다.'},403);
  if(Number(request.headers.get('content-length')||0)>8192)return reply({error:'입력 데이터가 너무 큽니다.'},413);
  let body;try{const text=await request.text();if(text.length>8192)throw Error();body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return reply({error:'입력값을 확인해 주세요.'},400)}
  const name=clean(body.name,60),phone=clean(body.phone,30),birth=clean(body.birth,10),job=clean(body.job,40),tenure=clean(body.tenure,40),industry=clean(body.industry,60),overdue=clean(body.overdue,30),card=clean(body.card,30);
  const amount=Number(body.amount),rate=Number(body.rate),term=Number(body.term);
  const jobs=['직장인','자영업자','프리랜서','대학생·취업준비','무직','기타'];
  const tenures=['3개월 미만','3개월 이상 ~ 6개월 미만','6개월 이상 ~ 1년 미만','1년 이상'];
  const industries=['요식업 · 카페','도소매 · 매장','온라인 쇼핑몰','미용 · 뷰티','숙박 · 관광','교육 · 학원','운송 · 배달','건설 · 인테리어','제조 · 생산','수리 · 정비','생활 · 전문 서비스','농업 · 어업','기타'];
  if(name.length<2||!/^01[016789]\d{7,8}$/.test(phone.replace(/[ -]/g,''))||!validDate(birth)||!jobs.includes(job)||!['없음','있음','잘 모르겠어요'].includes(overdue)||!['사용 중','사용 안 함','잘 모르겠어요'].includes(card)||!Number.isFinite(amount)||amount<10||amount>100000||!Number.isFinite(rate)||rate<0||rate>100||![12,24,36,48,60].includes(term)||body.consent!==true||!validKey(body.idempotencyKey)||(job==='직장인'&&!tenures.includes(tenure))||(job==='자영업자'&&!industries.includes(clean(body.industryCategory,40))))return reply({error:'입력 항목과 동의 여부를 확인해 주세요.'},400);
  const data={name,phone,birth,job,tenure:job==='직장인'?tenure:'',industry:job==='자영업자'?industry:'',overdue,card,amount,rate,term,consent:true,consentVersion:'consultation-v3-one-year'};
  try {
    if(!env.DB||!env.APPLICATION_ENCRYPTION_KEY)return reply({error:'접수 서비스를 일시적으로 사용할 수 없습니다.'},503);
    if(!await allow(env.DB,request.headers.get('cf-connecting-ip'),env.APPLICATION_ENCRYPTION_KEY))return reply({error:'접수 요청이 많습니다. 잠시 후 다시 시도해 주세요.'},429);
    const key=await encryptionKey(env),id=body.idempotencyKey;
    const replay=async()=>{const row=await env.DB.prepare('SELECT reference,iv,ciphertext FROM applications WHERE id=?').bind(id).first();if(!row)return null;return row.reference&&equal(await decrypt(row,key),data)?reply({ok:true,reference:row.reference},200):reply({error:'입력 내용이 변경되었습니다. 다시 접수해 주세요.'},409)};
    const prior=await replay();if(prior)return prior;
    const encrypted=await encrypt(data,key),now=new Date(),date=new Date(now.getTime()+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
    for(let attempt=0;attempt<5;attempt++){
      const reference=date+'-'+String(crypto.getRandomValues(new Uint32Array(1))[0]%100000000).padStart(8,'0');
      try{await env.DB.prepare('INSERT INTO applications(id,created_at,reference,iv,ciphertext) VALUES(?,?,?,?,?)').bind(id,now.toISOString(),reference,encrypted.iv,encrypted.ciphertext).run();return reply({ok:true,reference},201)}
      catch(error){const existing=await replay();if(existing)return existing;if(attempt===4)throw error}
    }
    return reply({error:'접수하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);
  }catch{return reply({error:'접수하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503)}
}
