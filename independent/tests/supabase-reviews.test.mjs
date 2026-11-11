import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../src/supabase-reviews.mjs').catch(()=>({}));
test('public review results retain total, filtered count, average and half-star rating',async()=>{
 const fake=async input=>{const u=new URL(input);if(u.pathname.endsWith('/review_stats'))return Response.json([{rating:4.5,count:1},{rating:5,count:1}]);return Response.json([{id:'one',author:'김**',source:'고객 확인 후기',rating:4.5,content:'후기 내용',review_date:'2026-01-01'}]);};
 const r=await mod.listSupabaseReviews?.(new Request('https://loan.example/api/reviews?rating=4.5'),{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-key'},fake);
 assert.equal(r?.status,200);const d=await r.json();assert.equal(d.total,2);assert.equal(d.filteredTotal,1);assert.equal(d.average,4.75);assert.equal(d.items[0].reviewDate,'2026-01-01');
});
test('missing or failed upstream data returns a safe error',async()=>{
 const r=await mod.listSupabaseReviews?.(new Request('https://loan.example/api/reviews'),{},async()=>{throw Error()});
 assert.equal(r?.status,503);
});
test('admin mutations forward the verified Access assertion without exposing it in the response',async()=>{
 let body,token;const fake=async(_url,options)=>{body=JSON.parse(options.body);token=options.headers['x-access-jwt'];return Response.json({ok:true},{status:201})};
 const req=new Request('https://admin.example/api/admin/reviews',{method:'POST',headers:{origin:'https://admin.example','content-type':'application/json','cf-access-jwt-assertion':'verified-token'},body:JSON.stringify({author:'김고객',content:'상담을 잘 받았습니다.'})});
 const r=await mod.forwardReviewMutation?.(req,{SUPABASE_URL:'https://example.supabase.co'},'create',null,fake);
 assert.equal(r?.status,201);assert.equal(body.action,'create');assert.equal(token,'verified-token');assert.equal((await r.text()).includes('verified-token'),false);
});
