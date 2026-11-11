/** Per-IP, fixed-window limit; stores a window-scoped keyed digest, never a raw address. */
export async function allowSubmission(db: D1Database, ip: string, secret: string, now = Date.now()): Promise<boolean> {
  if (!ip || ip.length > 100 || !secret) throw new Error('Missing rate-limit input');
  const windowMs = 10 * 60 * 1000;
  const bucket = Math.floor(now / windowMs);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`submission-rate:v1:${bucket}:${ip}`));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const expiresAt = (bucket + 2) * windowMs;
  const row = await db.prepare('INSERT INTO submission_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count').bind(hash, expiresAt).first<{count:number}>();
  if (!row || typeof row.count !== 'number') throw new Error('Rate limit unavailable');
  if (crypto.getRandomValues(new Uint8Array(1))[0] < 4) {
    try { await db.prepare('DELETE FROM submission_limits WHERE expires_at < ?').bind(now).run(); } catch { /* Next request can retry cleanup. */ }
  }
  return row.count <= 10;
}
