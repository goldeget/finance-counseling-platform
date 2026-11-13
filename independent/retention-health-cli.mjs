import {checkRetentionHealth} from './src/retention-health.mjs';
try { console.log(JSON.stringify(await checkRetentionHealth(process.env.APPLICATION_BACKUP_TOKEN))); }
catch (error) { console.error('Retention health check failed:', error instanceof Error ? error.message : 'unknown error'); process.exitCode=1; }
