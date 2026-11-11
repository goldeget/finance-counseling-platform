const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function listReviews(request,env) {
  const url=new URL(request.url),rawOffset=Number(url.searchParams.get('offset')||0),rawLimit=Number(url.searchParams.get('limit')||12),rawRating=Number(url.searchParams.get('rating')||0);
  const offset=Number.isSafeInteger(rawOffset)&&rawOffset>=0?Math.min(rawOffset,1000000):0;
  const limit=Number.isSafeInteger(rawLimit)?Math.min(24,Math.max(1,rawLimit)):12;
  const rating=Number.isFinite(rawRating)&&rawRating*2===Math.round(rawRating*2)&&rawRating>=1&&rawRating<=5?rawRating:0;
  try{
    const where=rating?' WHERE rating=?':'',binds=rating?[rating]:[];
    const [rows,summary,filtered]=await Promise.all([
      env.DB.prepare('SELECT id,author,source,rating,content,review_date FROM reviews'+where+' ORDER BY review_date DESC,created_at DESC,id DESC LIMIT ? OFFSET ?').bind(...binds,limit,offset).all(),
      env.DB.prepare('SELECT COALESCE(sum(count),0) AS total,CASE WHEN sum(count)>0 THEN sum(rating*count)*1.0/sum(count) ELSE NULL END AS average FROM review_stats').bind().first(),
      env.DB.prepare('SELECT COALESCE(sum(count),0) AS total FROM review_stats'+where).bind(...binds).first()
    ]);
    const items=rows.results.map(x=>({id:x.id,author:x.author,source:x.source,rating:x.rating,content:x.content,reviewDate:x.review_date}));
    return Response.json({items,total:Number(summary.total),average:summary.average===null?null:Number(summary.average),filteredTotal:Number(filtered.total),offset},{headers});
  }catch{return Response.json({error:'후기를 불러오지 못했습니다.'},{status:503,headers})}
}
export async function createReview(request,env) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'잘못된 요청입니다.'},{status:403,headers});
  let b;try{const text=await request.text();if(text.length>8192)throw Error();b=JSON.parse(text);if(!b||typeof b!=='object'||Array.isArray(b))throw Error()}catch{return Response.json({error:'입력 내용을 확인해 주세요.'},{status:400,headers})}
  const author=typeof b.author==='string'?b.author.trim():'',source=typeof b.source==='string'?b.source.trim():'',content=typeof b.content==='string'?b.content.trim():'',reviewDate=typeof b.reviewDate==='string'?b.reviewDate.trim():'',rating=Number(b.rating);
  const d=new Date(reviewDate+'T00:00:00Z'),today=new Date(Date.now()+9*3600000).toISOString().slice(0,10),dateOk=/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===reviewDate&&reviewDate>='1900-01-01'&&reviewDate<=today;
  if(!author||author.length>20||!source||source.length>50||content.length<5||content.length>1000||!dateOk||!Number.isInteger(rating)||rating<1||rating>5||b.confirmed!==true||/\d{6,}|@/.test(author)||/\d{8,}|@/.test(source)||/01[016789][ -]?\d{3,4}[ -]?\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content))return Response.json({error:'작성자, 출처, 후기, 날짜 및 확인 항목을 확인해 주세요.'},{status:400,headers});
  try{await env.DB.prepare('INSERT INTO reviews(id,author,source,rating,content,review_date,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),author==='익명'?'익명':author.slice(0,1)+'**',source,rating,content,reviewDate,new Date().toISOString()).run();return Response.json({ok:true},{status:201,headers})}catch{return Response.json({error:'후기를 등록하지 못했습니다.'},{status:503,headers})}
}
