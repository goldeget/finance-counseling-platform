import {runLegacyRetention} from './src/legacy-retention-cron.mjs';
try { const result=await runLegacyRetention(process.env); console.log(JSON.stringify({ok:true,deleted:result.deleted})); }
catch (error) { console.error('Legacy retention failed:', error instanceof Error ? error.message : 'unknown error'); process.exitCode=1; }
