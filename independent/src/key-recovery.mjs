import {createDecipheriv} from 'node:crypto';
export function verifyRecoveryKey(value,fixture){
  try{
    const key=Buffer.from(value,'base64'),iv=Buffer.from(fixture.iv,'base64'),data=Buffer.from(fixture.ciphertext,'base64');
    if(key.length!==32||iv.length!==12||data.length<17)return false;
    const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(data.subarray(-16));
    return Buffer.concat([decipher.update(data.subarray(0,-16)),decipher.final()]).toString('utf8')==='finance-counseling-recovery-drill-v1';
  }catch{return false}
}
