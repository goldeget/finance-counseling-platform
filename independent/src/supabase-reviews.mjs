const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function listSupabaseReviews(request,env,fetcher=fetch){
  try{
    const base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||!env.SUPABASE_PUBLISHABLE_KEY)throw Error('Invalid review backend');
    const q=new URL(request.url).searchParams,offsetRaw=Number(q.get('offset')||0),limitRaw=Number(q.get('limit')||12),ratingRaw=Number(q.get('rating')||0);
    const offset=Number.isSafeInteger(offsetRaw)&&offsetRaw>=0?Math.min(offsetRaw,1000000):0,limit=Number.isSafeInteger(limitRaw)?Math.min(24,Math.max(1,limitRaw)):12;
    const rating=Number.isFinite(ratingRaw)&&ratingRaw*2===Math.round(ratingRaw*2)&&ratingRaw>=1&&ratingRaw<=5?ratingRaw:0;
    const records=new URL('/rest/v1/reviews',base);records.searchParams.set('select','id,author,source,rating,content,review_date');records.searchParams.set('order','review_date.desc,created_at.desc,id.desc');records.searchParams.set('limit',String(limit));records.searchParams.set('offset',String(offset));if(rating)records.searchParams.set('rating','eq.'+rating);
    const stats=new URL('/rest/v1/review_stats?select=rating,count',base),options={headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,accept:'application/json'},signal:AbortSignal.timeout(15000)};
    const [a,b]=await Promise.all([fetcher(records.toString(),options),fetcher(stats.toString(),options)]);if(!a.ok||!b.ok)throw Error('Review backend unavailable');
    const [rows,counts]=await Promise.all([a.json(),b.json()]);if(!Array.isArray(rows)||!Array.isArray(counts))throw Error('Invalid response');
    const total=counts.reduce((n,x)=>n+Number(x.count),0),sum=counts.reduce((n,x)=>n+Number(x.count)*Number(x.rating),0),filteredTotal=rating?counts.reduce((n,x)=>n+(Number(x.rating)===rating?Number(x.count):0),0):total;
    const items=rows.map(x=>({id:x.id,author:x.author,source:x.source,rating:Number(x.rating),content:x.content,reviewDate:x.review_date}));
    return Response.json({items,total,average:total?sum/total:null,filteredTotal,offset},{headers});
  }catch{return Response.json({error:'후기를 불러오지 못했습니다.'},{status:503,headers})}
}
export async function forwardReviewMutation(request,env,action,id,fetcher=fetch){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'잘못된 요청입니다.'},{status:403,headers});
  try{
    const base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))throw Error();
    const assertion=request.headers.get('cf-access-jwt-assertion');if(!assertion)throw Error();
    let body;if(action==='delete')body={action,id};else{const text=await request.text();if(text.length>8192)throw Error();body={action,review:JSON.parse(text)};}
    const r=await fetcher(new URL('/functions/v1/review-admin',base).toString(),{method:'POST',headers:{'content-type':'application/json','x-access-jwt':assertion},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const value=await r.json();return Response.json({ok:value.ok===true,...(value.error?{error:String(value.error).slice(0,200)}:{})},{status:r.status,headers});
  }catch{return Response.json({error:'후기를 처리하지 못했습니다.'},{status:503,headers})}
}
