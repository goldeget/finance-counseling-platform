import { env } from 'cloudflare:workers';
import { isAdmin, sameOrigin } from '../../../../lib/admin-auth';
import { insertReviewSql, validateReview, type ImportedReview } from '../../../../lib/review-import';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
const reply = (data: object, status = 200) => Response.json(data, {status, headers});
export async function POST(request: Request) {
  if (!await isAdmin() || !sameOrigin(request)) return reply({error:'접근 권한이 없습니다.'}, 403);
  let body: {hash?: unknown; items?: unknown; confirmed?: unknown};
  try { const text = await request.text(); if (text.length > 200000) return reply({error:'요청이 너무 큽니다.'}, 413); body = JSON.parse(text); }
  catch { return reply({error:'입력 내용을 확인해 주세요.'}, 400); }
  if (!body || typeof body.hash !== 'string' || !/^[0-9a-f]{64}$/.test(body.hash) || body.confirmed !== true || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) return reply({error:'입력 내용을 확인해 주세요.'}, 400);
  const items = body.items as ImportedReview[];
  for (const item of items) {
    if (!item || typeof item.reviewId !== 'string' || typeof item.author !== 'string' || typeof item.content !== 'string' || typeof item.reviewDate !== 'string' || typeof item.rating !== 'number' || validateReview(item)) return reply({error:'후기 내용을 확인해 주세요.'}, 400);
  }
  try {
    const db = env.DB; const now = new Date().toISOString();
    const statements = items.map(item => db.prepare(insertReviewSql).bind(`csv-${body.hash}-${item.reviewId}`, item.author === '익명' ? '익명' : item.author.slice(0,1) + '**', '고객 직접 작성', item.rating, item.content, item.reviewDate, now));
    const results = await db.batch(statements);
    return reply({ok:true, inserted:results.reduce((n, result) => n + Number(result.meta.changes || 0), 0)});
  } catch { return reply({error:'후기를 저장하지 못했습니다. 같은 파일로 다시 시도해 주세요.'}, 503); }
}
