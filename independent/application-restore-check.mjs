import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {openBackup} from './src/application-backup.mjs';

// Reads the recovery key from stdin; restores ciphertext into memory only.
const key=readFileSync(0,'utf8').trim(),file=process.argv[2];
if(!file)throw Error('Encrypted backup file required');
const backup=openBackup(readFileSync(file,'utf8'),key),db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE applications (id TEXT PRIMARY KEY,created_at TEXT NOT NULL,reference TEXT UNIQUE,iv TEXT NOT NULL,ciphertext TEXT NOT NULL)');
const insert=db.prepare('INSERT INTO applications VALUES (?,?,?,?,?)');
for(const row of backup.rows)insert.run(row.id,row.created_at,row.reference,row.iv,row.ciphertext);
const count=db.prepare('SELECT count(*) AS n FROM applications').get().n;
if(count!==backup.rows.length)throw Error('Restore verification failed');
console.log(JSON.stringify({restored:count,excludedExpired:backup.expired,storage:'memory only'}));
db.close();
