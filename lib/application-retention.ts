/** Return the UTC instant one calendar year before now, clamped on leap day. */
export function retentionCutoff(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid retention time');
  const year=now.getUTCFullYear()-1,month=now.getUTCMonth();
  const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return new Date(Date.UTC(year,month,Math.min(now.getUTCDate(),lastDay),now.getUTCHours(),now.getUTCMinutes(),now.getUTCSeconds(),now.getUTCMilliseconds())).toISOString();
}
export const deleteExpiredApplicationsSql = 'DELETE FROM applications WHERE id IN (SELECT id FROM applications WHERE created_at <= ? ORDER BY created_at LIMIT 100)';
