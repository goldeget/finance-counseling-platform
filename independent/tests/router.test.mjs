import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../src/router.mjs').catch(()=>({}));
test('private routes reject absent access tokens before touching the database',async()=>{
  let used=false;const env={PUBLIC_HOST:'loan.example.com',ADMIN_HOST:'admin-loan.example.com',DB:{prepare(){used=true;throw Error()}}};
  const req=new Request('https://admin-loan.example.com/api/admin/applications');
  const res=await mod.route?.(req,env,async()=>false);
  assert.equal(res?.status,403);assert.equal(used,false);
});
test('public hostname does not expose admin APIs',async()=>{
  const env={PUBLIC_HOST:'loan.example.com',ADMIN_HOST:'admin-loan.example.com'};
  const res=await mod.route?.(new Request('https://loan.example.com/api/admin/applications'),env,async()=>true);
  assert.equal(res?.status,404);
});
test('migration read-only mode rejects customer and admin writes before database access',async()=>{
  let used=false;const env={PUBLIC_HOST:'loan.example.com',ADMIN_HOST:'admin-loan.example.com',MIGRATION_READ_ONLY:'true',DB:{prepare(){used=true;throw Error()}}};
  const customer=await mod.route(new Request('https://loan.example.com/api/applications',{method:'POST'}),env,async()=>true);
  const admin=await mod.route(new Request('https://admin-loan.example.com/api/admin/reviews',{method:'POST'}),env,async()=>true);
  assert.equal(customer.status,503);assert.equal(admin.status,503);assert.equal(used,false);
});
test('staging QA submission remains restricted to an authorized staging admin host',async()=>{
  const request=()=>new Request('https://admin-loan.example.com/api/applications',{method:'POST'});
  const env={PUBLIC_HOST:'loan.example.com',ADMIN_HOST:'admin-loan.example.com',STAGING:'true'};
  assert.equal((await mod.route(request(),env,async()=>false)).status,403);
  assert.equal((await mod.route(request(),env,async()=>true)).status,403); // Missing same-origin header.
  assert.equal(await mod.route(request(),{...env,STAGING:'false'},async()=>true),null);
});
