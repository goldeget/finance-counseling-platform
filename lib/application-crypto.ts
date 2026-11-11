import { env } from 'cloudflare:workers';
function keyBytes(): Uint8Array<ArrayBuffer> {
  const encoded = (env as unknown as Record<string,string>).APPLICATION_ENCRYPTION_KEY;
  if (!encoded) throw new Error('Encryption is not configured');
  const binary = atob(encoded);
  if (binary.length !== 32) throw new Error('Encryption key is invalid');
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function toBase64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function fromBase64(value: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
async function getKey() { return crypto.subtle.importKey('raw', keyBytes(), 'AES-GCM', false, ['encrypt','decrypt']); }
export async function encryptRecord(record: object) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM',iv}, await getKey(), new TextEncoder().encode(JSON.stringify(record)));
  return {iv:toBase64(iv), ciphertext:toBase64(new Uint8Array(encrypted))};
}
export async function decryptRecord(iv: string, ciphertext: string): Promise<Record<string,unknown>> {
  const decrypted = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(iv)}, await getKey(), fromBase64(ciphertext));
  return JSON.parse(new TextDecoder().decode(decrypted));
}
