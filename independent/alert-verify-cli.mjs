// Verify the alert pipeline end-to-end by posting a test alert through the
// production retention-alert path. Confirms token + endpoint + Cloudflare wiring.
// Final email-inbox reception remains a manual check (see REDEPLOY_RUNBOOK.md checklist).
const backupUrl = process.env.BACKUP_URL || '';
const token = process.env.APPLICATION_BACKUP_TOKEN || '';

if (!backupUrl.startsWith('https://')) throw Error('BACKUP_URL is required');
if (!/^[a-f0-9]{64}$/.test(token)) throw Error('APPLICATION_BACKUP_TOKEN is required');

try {
  const res = await fetch(new URL('/retention-alert', backupUrl), {
    method: 'POST',
    headers: {'x-backup-token': token, 'content-type': 'application/json'},
    body: JSON.stringify({event: 'alert-verification', detail: 'manual test'}),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 204) {
    console.log(JSON.stringify({ok: true, endpoint: '/retention-alert', status: 204, message: 'Alert pipeline accepted the test alert. Verify email inbox reception manually.'}));
  } else {
    console.error(JSON.stringify({ok: false, status: res.status, message: 'Alert endpoint returned an unexpected status.'}));
    process.exitCode = 1;
  }
} catch (error) {
  // Do not print environment values or response bodies.
  console.error('Alert verification failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
}
