import {test} from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../src/access.mjs').catch(() => ({}));
const pair = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256',use:'sig'};
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const env = {ACCESS_TEAM_DOMAIN:'example.cloudflareaccess.com',ACCESS_AUD:'app-audience',ADMIN_EMAIL:'owner@example.com'};
const keys = async () => new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{'content-type':'application/json'}});
async function token(claims, key=pair.privateKey) {
  const h=enc({alg:'RS256',kid:'test-key'}), p=enc({iss:'https://example.cloudflareaccess.com',aud:['app-audience'],email:'owner@example.com',exp:2000000000,...claims});
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(h+'.'+p));
  return h+'.'+p+'.'+Buffer.from(sig).toString('base64url');
}
test('accepts only a signed, current token issued to the configured owner and application', async () => {
  assert.equal(await mod.verifyAccess?.(await token({}),env,keys,1900000000),true);
  assert.equal(await mod.verifyAccess?.(await token({email:'other@example.com'}),env,keys,1900000000),false);
  assert.equal(await mod.verifyAccess?.(await token({aud:['other']}),env,keys,1900000000),false);
  assert.equal(await mod.verifyAccess?.(await token({exp:1800000000}),env,keys,1900000000),false);
  const parts=(await token({})).split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);const forged=parts.join('.');
  assert.equal(await mod.verifyAccess?.(forged,env,keys,1900000000),false);
});
