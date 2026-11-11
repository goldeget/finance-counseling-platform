function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const str=atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='));
  return Uint8Array.from(str,c=>c.charCodeAt(0));
}
export async function verifyAccess(token, env, fetcher=fetch, nowSeconds=Math.floor(Date.now()/1000)) {
  try {
    if(typeof token!=='string'||token.length>8192||!env.ACCESS_AUD||!env.ADMIN_EMAIL)return false;
    const team=env.ACCESS_TEAM_DOMAIN;
    if(typeof team!=='string'||!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team))return false;
    const parts=token.split('.');if(parts.length!==3)return false;
    const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.iss!=='https://'+team||
       !Array.isArray(claims.aud)||!claims.aud.includes(env.ACCESS_AUD)||
       typeof claims.exp!=='number'||claims.exp<=nowSeconds||
       (typeof claims.nbf==='number'&&claims.nbf>nowSeconds)||
       (typeof claims.iat==='number'&&claims.iat>nowSeconds+60)||
       typeof claims.email!=='string'||claims.email.toLowerCase()!==env.ADMIN_EMAIL.trim().toLowerCase())return false;
    const response=await fetcher('https://'+team+'/cdn-cgi/access/certs',{headers:{accept:'application/json'}});
    if(!response.ok)return false;
    const data=await response.json();
    const jwk=Array.isArray(data.keys)?data.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'):null;
    if(!jwk)return false;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  } catch {return false;}
}
