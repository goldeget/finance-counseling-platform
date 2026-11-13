import {handleAdmin} from './core.mjs';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const env={
  SUPABASE_URL:Deno.env.get('SUPABASE_URL'),
  SUPABASE_SECRET_KEY:keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  ACCESS_TEAM_DOMAIN:'still-wildflower-dbed.cloudflareaccess.com',
  ACCESS_AUD:'12d31462a7674a43784a2c90fa1efbd1b56d6f438e2f4164cb986ac480fe460e',
  ADMIN_EMAIL:'4tencpkr@gmail.com',
  MIGRATION_READ_ONLY:'false'
};
Deno.serve(request=>handleAdmin(request,env));
