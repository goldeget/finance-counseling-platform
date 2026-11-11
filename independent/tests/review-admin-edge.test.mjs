import {test} from 'node:test';import assert from 'node:assert/strict';
import {handleAdmin} from '../../supabase/functions/review-admin/core.mjs';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'test-only'};
function request(data){return new Request('https://example.supabase.co/functions/v1/review-admin',{method:'POST',headers:{'content-type':'application/json','x-access-jwt':'test'},body:JSON.stringify(data)});}
test('admin mutation never reaches the database without a verified Access token',async()=>{
 let writes=0;const response=await handleAdmin(request({action:'delete',id:'123e4567-e89b-42d3-a456-426614174000'}),env,async()=>{writes++;return new Response(null,{status:204})},async()=>false);
 assert.equal(response.status,403);assert.equal(writes,0);
});
test('authorized review creation masks the name and rejects contact information',async()=>{
 let saved;const fetcher=async(_url,opts)=>{saved=JSON.parse(opts.body);return new Response(null,{status:201})};
 const review={author:'김고객',source:'고객 확인 후기',rating:5,content:'상담을 잘 받았습니다.',reviewDate:'2026-01-01',confirmed:true};
 assert.equal((await handleAdmin(request({action:'create',review}),env,fetcher,async()=>true)).status,201);assert.equal(saved.author,'김**');
 assert.equal((await handleAdmin(request({action:'create',review:{...review,content:'연락처 010-1234-5678'}}),env,fetcher,async()=>true)).status,400);
});
