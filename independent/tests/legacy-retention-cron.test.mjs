import test from 'node:test';
import assert from 'node:assert/strict';
import {runLegacyRetention} from '../src/legacy-retention-cron.mjs';
const env={SITE_RETENTION_TOKEN:'a'.repeat(64)};
test('calls only the authorized site retention endpoint with its secret',async()=>{
 let request;
 const result=await runLegacyRetention(env,async(url,options)=>{request={url,options};return Response.json({ok:true,deleted:2,more:false})});
 assert.equal(new URL(request.url).hostname,'finance-limit-studio-7611.koreaputduk.chatgpt.site');
 assert.equal(request.options.redirect,'error');assert.equal(request.options.headers['x-retention-token'],env.SITE_RETENTION_TOKEN);assert.equal(result.deleted,2);
});
test('reports a failed or malformed deletion result instead of accepting it',async()=>{
 await assert.rejects(runLegacyRetention(env,async()=>new Response('error',{status:503})),/failed/i);
 await assert.rejects(runLegacyRetention(env,async()=>Response.json({ok:true,deleted:-1})),/invalid/i);
});
