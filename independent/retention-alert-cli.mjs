const token=process.env.APPLICATION_BACKUP_TOKEN||'';
if(!/^[a-f0-9]{64}$/.test(token))throw Error('Retention alert configuration unavailable');
const response=await fetch('https://finance-counseling-app-backup.4tencpkr.workers.dev/retention-alert',{method:'POST',headers:{'x-backup-token':token},redirect:'manual',signal:AbortSignal.timeout(30000)});
if(response.status!==204)throw Error('Retention alert unavailable');
console.log('Retention alert submitted');
