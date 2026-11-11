import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../src/worker.mjs').catch(()=>({}));
test('staging rejects visitors without its private preview token',async()=>{
  const request=new Request('https://staging.example/landing.html');
  const env={STAGING:'true',STAGING_TOKEN:'secret',PUBLIC_HOST:'staging.example',ADMIN_HOST:'admin.example'};
  const response=await mod.default?.fetch(request,env);
  assert.equal(response?.status,403);
});
test('staging admin still requires an independently verified Access token',async()=>{
  const request=new Request('https://admin.example/admin');
  const env={STAGING:'true',STAGING_TOKEN:'secret',PUBLIC_HOST:'staging.example',ADMIN_HOST:'admin.example'};
  const response=await mod.default?.fetch(request,env);
  assert.equal(response?.status,403);
});
