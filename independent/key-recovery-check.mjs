import {readFileSync} from 'node:fs';
import {verifyRecoveryKey} from './src/key-recovery.mjs';
const fixture=JSON.parse(readFileSync(new URL('./key-recovery-fixture.json',import.meta.url),'utf8'));
if(!verifyRecoveryKey(process.env.APPLICATION_ENCRYPTION_KEY||'',fixture))throw Error('Recovery key verification failed');
console.log('Synthetic encrypted record successfully recovered');
