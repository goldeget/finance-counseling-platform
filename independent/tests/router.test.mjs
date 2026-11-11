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
