import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createCipheriv} from 'node:crypto';
import {verifyRecoveryKey} from '../src/key-recovery.mjs';
test('recovery key decrypts a synthetic verification record and rejects an incorrect key',()=>{
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([cipher.update('finance-counseling-recovery-drill-v1'),cipher.final(),cipher.getAuthTag()]);
 const fixture={iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')};
 assert.equal(verifyRecoveryKey(key.toString('base64'),fixture),true);
 assert.equal(verifyRecoveryKey(randomBytes(32).toString('base64'),fixture),false);
});
