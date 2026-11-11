export type ImportedReview = { reviewId: string; author: string; content: string; rating: number; reviewDate: string };
export const insertReviewSql = 'INSERT INTO reviews (id, author, source, rating, content, review_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING';
export function isDeletableReviewId(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id) || /^csv-[0-9a-f]{64}-[a-zA-Z0-9_-]{1,100}$/.test(id);
}
const contact = /01[016789][ -]?\d{3,4}[ -]?\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
export function validateReview(r: ImportedReview): string | null {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(r.reviewId)) return '후기 번호가 올바르지 않습니다.';
  if (!r.author || r.author.length > 20 || /\d{6,}|@/.test(r.author)) return '작성자를 확인해 주세요.';
  if (r.content.length < 5 || r.content.length > 1000) return '후기 내용 길이를 확인해 주세요.';
  if (contact.test(r.content)) return '후기에 연락처가 포함되어 있습니다.';
  if (!Number.isFinite(r.rating) || r.rating < 1 || r.rating > 5 || r.rating * 2 !== Math.round(r.rating * 2)) return '별점을 확인해 주세요.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.reviewDate)) return '작성일을 확인해 주세요.';
  const date = new Date(r.reviewDate + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== r.reviewDate || r.reviewDate < '1900-01-01' || date.getTime() > Date.now() + 86400000) return '작성일을 확인해 주세요.';
  return null;
}
export function parseReviewCsv(text: string): ImportedReview[] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
    else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw Error('CSV 따옴표가 닫히지 않았습니다.');
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift(); if (!header) throw Error('파일이 비어 있습니다.');
  const required = ['review_id','writer_name_masked','created_at','review_text','rating'];
  const indices = required.map(key => header.indexOf(key));
  if (indices.some(i => i < 0)) throw Error('필수 열이 없습니다.');
  const ids = new Set<string>();
  return rows.map((values, index) => {
    if (values.length !== header.length) throw Error(`${index + 2}행의 열 개수를 확인해 주세요.`);
    const [reviewId,author,reviewDate,content,rating] = indices.map(i => values[i].trim());
    const item = {reviewId, author, reviewDate, content, rating: Number(rating)};
    if (ids.has(reviewId)) throw Error(`${index + 2}행에 중복 후기 번호가 있습니다.`);
    ids.add(reviewId); const error = validateReview(item); if (error) throw Error(`${index + 2}행: ${error}`);
    return item;
  });
}
