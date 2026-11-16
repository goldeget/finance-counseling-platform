import {checkSupabaseHealth} from './src/supabase-health.mjs';

try {
  const result = await checkSupabaseHealth(process.env);
  console.log(JSON.stringify({ok: true, ...result}));
} catch (error) {
  // Do not print responses, environment values, or request headers.
  console.error('Supabase health check failed:', error instanceof Error ? error.message : 'unknown error');
  // Optional redundant alert through the existing retention-alert pipeline.
  const token = process.env.APPLICATION_BACKUP_TOKEN;
  const backupUrl = process.env.BACKUP_URL;
  if (token && backupUrl) {
    try {
      await fetch(new URL('/retention-alert', backupUrl), {
        method: 'POST',
        headers: {'x-backup-token': token, 'content-type': 'application/json'},
        body: JSON.stringify({event: 'supabase-health', detail: 'unhealthy'}),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      // Alert delivery is best-effort; the workflow failure itself notifies via GitHub.
    }
  }
  process.exitCode = 1;
}
