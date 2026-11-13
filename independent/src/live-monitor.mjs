// This checks the independent public service; it does not prove cron execution.
export async function checkLiveService(env, fetcher = fetch) {
  const get = (url) => fetcher(url, {redirect: 'manual', signal: AbortSignal.timeout(30000)});
  const landing = await get('https://loan.climekr.com/landing');
  if (landing.status !== 200) throw Error('Public landing unavailable');
  const html = await landing.text();
  if (!html.includes('접수 후 1년')) throw Error('Retention notice missing');
  const reviews = await get('https://loan.climekr.com/api/reviews?limit=1');
  if (reviews.status !== 200) throw Error('Public reviews unavailable');
  const body = await reviews.json();
  if (!Number.isSafeInteger(body.total) || body.total < 1) throw Error('Review count unavailable');
  const admin = await get('https://admin-loan.climekr.com/');
  if (admin.status !== 302 || !admin.headers.get('location')?.includes('cloudflareaccess.com')) {
    throw Error('Admin authentication redirect unavailable');
  }
  const rejected=await fetcher('https://loan.climekr.com/api/applications',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(rejected.status!==403)throw Error('Submission origin protection unavailable');
  return {reviewTotal: body.total};
}
