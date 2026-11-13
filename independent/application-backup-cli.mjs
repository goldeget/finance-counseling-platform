import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {collect,seal,openBackup} from './src/application-backup.mjs';

try {
  const {BACKUP_URL,BACKUP_TOKEN,APPLICATION_ENCRYPTION_KEY,RUNNER_TEMP}=process.env;
  if(!/^https:\/\/finance-counseling-app-backup\.4tencpkr\.workers\.dev\/?$/.test(BACKUP_URL||'')||!/^[a-f0-9]{64}$/.test(BACKUP_TOKEN||'')||!RUNNER_TEMP)throw Error('Backup configuration unavailable');
  const first=await collect(fetch,BACKUP_URL,BACKUP_TOKEN),second=await collect(fetch,BACKUP_URL,BACKUP_TOKEN);
  if(JSON.stringify(first)!==JSON.stringify(second))throw Error('Application data changed during collection');
  const sealed=seal(first,APPLICATION_ENCRYPTION_KEY),dir=join(RUNNER_TEMP,'finance-application-backup');mkdirSync(dir,{recursive:true});
  const file=join(dir,'applications.enc.json');writeFileSync(file,sealed,{mode:0o600,flag:'wx'});
  const restored=openBackup(readFileSync(file,'utf8'),APPLICATION_ENCRYPTION_KEY);
  if(restored.rows.length!==first.length||restored.expired!==0)throw Error('Backup verification failed');
  console.log(JSON.stringify({records:first.length,sha256:createHash('sha256').update(sealed).digest('hex'),verified:true}));
}catch(error){console.error('Application backup failed:',error instanceof Error?error.message:'unknown error');process.exitCode=1}
