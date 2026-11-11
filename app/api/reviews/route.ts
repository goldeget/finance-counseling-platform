import { getDb } from '../../../db';
import { reviews } from '../../../db/schema';
import { isAdmin, sameOrigin } from '../../../lib/admin-auth';
import { desc, eq, sql } from 'drizzle-orm';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(data:object,status=200)=>Response.json(data,{status,headers});
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value&&value>='1900-01-01'&&d.getTime()<=Date.now();}
export async function GET(request:Request){
  const url=new URL(request.url), rawOffset=Number(url.searchParams.get('offset')||0), rawLimit=Number(url.searchParams.get('limit')||12), rawRating=Number(url.searchParams.get('rating')||0);
  const offset=Number.isSafeInteger(rawOffset)&&rawOffset>=0?Math.min(rawOffset,1000000):0;
  const limit=Number.isSafeInteger(rawLimit)?Math.min(24,Math.max(1,rawLimit)):12;
  const selectedRating=Number.isFinite(rawRating)&&rawRating*2===Math.round(rawRating*2)&&rawRating>=1&&rawRating<=5?rawRating:0;
  try{const db=getDb(),filter=selectedRating?eq(reviews.rating,selectedRating):undefined;
    const [items,summary,filtered]=await Promise.all([
      db.select().from(reviews).where(filter).orderBy(desc(reviews.reviewDate),desc(reviews.createdAt),desc(reviews.id)).limit(limit).offset(offset),
      db.select({total:sql<number>`count(*)`,average:sql<number|null>`avg(${reviews.rating})`}).from(reviews),
      db.select({total:sql<number>`count(*)`}).from(reviews).where(filter),
    ]);
    return reply({items:items.map(({id,author,source,rating,content,reviewDate})=>({id,author,source,rating,content,reviewDate})),total:Number(summary[0].total),average:summary[0].average===null?null:Number(summary[0].average),filteredTotal:Number(filtered[0].total),offset});
  }catch{return reply({error:'후기를 불러오지 못했습니다.'},503)}
}
export async function POST(request:Request){
  if(!await isAdmin()||!sameOrigin(request))return reply({error:'접근 권한이 없습니다.'},403);
  if(Number(request.headers.get('content-length')||0)>8192)return reply({error:'입력 내용이 너무 깁니다.'},413);
  let b:Record<string,unknown>;try{const text=await request.text();if(text.length>8192)return reply({error:'입력 내용이 너무 깁니다.'},413);b=JSON.parse(text);if(!b||typeof b!=='object'||Array.isArray(b))throw Error()}catch{return reply({error:'입력 내용을 확인해 주세요.'},400)}
  const author=typeof b.author==='string'?b.author.trim():'',source=typeof b.source==='string'?b.source.trim():'',content=typeof b.content==='string'?b.content.trim():'',reviewDate=typeof b.reviewDate==='string'?b.reviewDate.trim():'',rating=Number(b.rating);
  if(!author||author.length>20||!source||source.length>50||content.length<5||content.length>1000||!validDate(reviewDate)||!Number.isInteger(rating)||rating<1||rating>5||b.confirmed!==true)return reply({error:'작성자, 출처, 후기, 날짜 및 확인 항목을 확인해 주세요.'},400);
  if(/\d{6,}|@/.test(author)||/\d{8,}|@/.test(source)||/01[016789][ -]?\d{3,4}[ -]?\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content))return reply({error:'작성자, 출처와 후기에는 전화번호나 이메일을 입력하지 마세요.'},400);
  const maskedAuthor=author==='익명'?'익명':author.slice(0,1)+'**';
  try{await getDb().insert(reviews).values({id:crypto.randomUUID(),author:maskedAuthor,source,rating,content,reviewDate,createdAt:new Date().toISOString()});return reply({ok:true},201)}catch{return reply({error:'후기를 등록하지 못했습니다.'},503)}
}
