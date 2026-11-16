const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

/** RFC 4180-style CSV parser: handles quoted fields, embedded commas, and CRLF. */
export function parseCsv(text){
  if(text.charCodeAt(0)===0xFEFF)text=text.slice(1); // strip UTF-8 BOM
  const rows=[];let row=[];let field='';let inQuotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQuotes){
      if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else inQuotes=false}
      else field+=c;
    }else{
      if(c==='"')inQuotes=true;
      else if(c===','){row.push(field);field=''}
      else if(c==='\r'){/* skip CR so CRLF and LF both work */}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field=''}
      else field+=c;
    }
  }
  if(field||row.length){row.push(field);rows.push(row)}
  return rows;
}

/** Convert parsed CSV rows into review objects ready for validation. */
export function csvToReviews(csvText){
  const rows=parseCsv(csvText);
  if(rows.length<2)throw Error('CSV에 헤더와 데이터가 필요합니다.');
  const header=rows[0].map(h=>h.trim().toLowerCase());
  const find=(...names)=>{for(const n of names){const i=header.indexOf(n);if(i>=0)return i}return -1};
  const idx={author:find('author','작성자'),source:find('source','출처'),rating:find('rating','별점','점수'),content:find('content','후기','내용'),reviewDate:find('review_date','reviewdate','date','작성일')};
  if(idx.author<0||idx.source<0||idx.rating<0||idx.content<0||idx.reviewDate<0)throw Error('CSV 헤더에 author, source, rating, content, review_date 가 필요합니다.');
  const reviews=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i];
    if(r.length===1&&r[0].trim()==='')continue; // skip blank lines
    reviews.push({author:(r[idx.author]||'').trim(),source:(r[idx.source]||'').trim(),rating:Number(r[idx.rating]||0),content:(r[idx.content]||'').trim(),reviewDate:(r[idx.reviewDate]||'').trim(),confirmed:true});
  }
  if(reviews.length===0)throw Error('등록할 후기 데이터가 없습니다.');
  if(reviews.length>1000)throw Error('한 번에 최대 1000건까지 등록할 수 있습니다.');
  return reviews;
}

/** Admin-only: parse CSV and forward a bulk_create request to the review-admin function. */
export async function bulkCreateReviews(request,env,fetcher=fetch){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'잘못된 요청입니다.'},{status:403,headers});
  const contentType=request.headers.get('content-type')||'';
  if(!contentType.includes('text/csv'))return Response.json({error:'CSV 파일을 업로드해 주세요.'},{status:415,headers});
  const text=await request.text();
  if(text.length>500000)return Response.json({error:'파일이 너무 큽니다. (최대 500KB)'},{status:413,headers});
  let reviews;
  try{reviews=csvToReviews(text)}catch(e){return Response.json({error:e.message},{status:400,headers})}
  try{
    const base=new URL(env.SUPABASE_URL);
    if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))throw Error();
    const assertion=request.headers.get('cf-access-jwt-assertion');if(!assertion)throw Error();
    const r=await fetcher(new URL('/functions/v1/review-admin',base).toString(),{method:'POST',headers:{'content-type':'application/json','x-access-jwt':assertion},body:JSON.stringify({action:'bulk_create',reviews}),signal:AbortSignal.timeout(30000)});
    const value=await r.json();
    return Response.json({ok:value.ok===true,inserted:value.inserted||0,errors:value.errors||[],...(value.error?{error:String(value.error).slice(0,200)}:{})},{status:r.status,headers});
  }catch{return Response.json({error:'후기 일괄 등록을 처리하지 못했습니다.'},{status:503,headers})}
}
