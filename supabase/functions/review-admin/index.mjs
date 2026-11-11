import {handleAdmin} from './core.mjs';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const env={
  SUPABASE_URL:Deno.env.get('SUPABASE_URL'),
  SUPABASE_SECRET_KEY:keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  ACCESS_TEAM_DOMAIN:'still-wildflower-dbed.cloudflareaccess.com',
  ACCESS_AUD:'4b13de5c7d2267311302c7d263f6206a19669d22c3ecb3a6dde2d0b1c3f52202',
  ADMIN_EMAIL:'4tencpkr@gmail.com'
};
Deno.serve(request=>handleAdmin(request,env));
