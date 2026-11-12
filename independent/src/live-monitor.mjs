import {runLegacyRetention} from './legacy-retention-cron.mjs';

// This checks the current Sites service. It is not a cutover or a cron log check.
export async function checkLiveService(env, fetcher = fetch) {
  // Attempt deletion first so a public-page or admin outage does not skip it.
  const retention = await runLegacyRetention(env, fetcher);
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
    throw Error('Candidate admin authentication redirect unavailable');
  }
  return {reviewTotal: body.total, expiredDeleted: retention.deleted};
}
