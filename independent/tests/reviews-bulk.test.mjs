import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,csvToReviews,bulkCreateReviews} from '../src/reviews-bulk.mjs';

test('parseCsv handles simple rows', () => {
  const rows = parseCsv('a,b,c\n1,2,3\n');
  assert.deepEqual(rows, [['a','b','c'], ['1','2','3']]);
});

test('parseCsv strips UTF-8 BOM', () => {
  const rows = parseCsv('\uFEFFauthor,source\n홍길동,네이버\n');
  assert.equal(rows[0][0], 'author');
  assert.equal(rows[1][0], '홍길동');
});

test('parseCsv handles quoted fields with embedded commas', () => {
  const rows = parseCsv('author,content\n"홍,길동","친절했습니다, 감사합니다"\n');
  assert.equal(rows[1][0], '홍,길동');
  assert.equal(rows[1][1], '친절했습니다, 감사합니다');
});

test('parseCsv handles CRLF line endings', () => {
  const rows = parseCsv('a,b\r\n1,2\r\n');
  assert.deepEqual(rows, [['a','b'], ['1','2']]);
});

test('parseCsv handles escaped quotes', () => {
  const rows = parseCsv('content\n"그래서 ""좋아요"" 했습니다"\n');
  assert.equal(rows[1][0], '그래서 "좋아요" 했습니다');
});

test('csvToReviews maps columns to review objects', () => {
  const csv = 'author,source,rating,content,review_date\n김준,네이버,5,정말 친절했습니다,2026-11-01\n이영,구글,4,만족합니다,2026-11-02\n';
  const reviews = csvToReviews(csv);
  assert.equal(reviews.length, 2);
  assert.equal(reviews[0].author, '김준');
  assert.equal(reviews[0].rating, 5);
  assert.equal(reviews[0].confirmed, true);
  assert.equal(reviews[1].reviewDate, '2026-11-02');
});

test('csvToReviews accepts Korean header names', () => {
  const csv = '작성자,출처,별점,후기,작성일\n김준,네이버,5,정말 친절했습니다,2026-11-01\n';
  const reviews = csvToReviews(csv);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].source, '네이버');
});

test('csvToReviews skips blank lines', () => {
  const csv = 'author,source,rating,content,review_date\n김준,네이버,5,정말 친절했습니다,2026-11-01\n\n\n이영,구글,4,만족합니다,2026-11-02\n';
  const reviews = csvToReviews(csv);
  assert.equal(reviews.length, 2);
});

test('csvToReviews rejects missing header columns', () => {
  const csv = 'author,source\n김준,네이버\n';
  assert.throws(() => csvToReviews(csv), /CSV 헤더에/);
});

test('csvToReviews rejects empty data', () => {
  const csv = 'author,source,rating,content,review_date\n\n';
  assert.throws(() => csvToReviews(csv), /등록할 후기 데이터가 없습니다/);
});

test('csvToReviews rejects more than 1000 rows', () => {
  let csv = 'author,source,rating,content,review_date\n';
  for (let i = 0; i < 1001; i++) csv += `김${i},네이버,5,정말 친절했습니다,2026-11-01\n`;
  assert.throws(() => csvToReviews(csv), /최대 1000건/);
});

// --- bulkCreateReviews with fake fetcher/request ---

function fakeRequest({origin='https://admin.example.com',contentType='text/csv',body='',assertion='jwt-token'}) {
  return {
    url: 'https://admin.example.com/api/admin/reviews/bulk',
    headers: new Map([['origin',origin],['content-type',contentType],['cf-access-jwt-assertion',assertion]].filter(([,v])=>v)),
    text: async () => body,
  };
}

test('bulkCreateReviews rejects non-CSV content type', async () => {
  const req = fakeRequest({contentType:'application/json',body:'{}'});
  const env = {SUPABASE_URL:'https://example.supabase.co'};
  const res = await bulkCreateReviews(req, env);
  assert.equal(res.status, 415);
  const d = await res.json();
  assert.match(d.error, /CSV/);
});

test('bulkCreateReviews rejects cross-origin requests', async () => {
  const req = fakeRequest({origin:'https://evil.com',body:'author,source,rating,content,review_date\n'});
  const env = {SUPABASE_URL:'https://example.supabase.co'};
  const res = await bulkCreateReviews(req, env);
  assert.equal(res.status, 403);
});

test('bulkCreateReviews rejects malformed CSV', async () => {
  const req = fakeRequest({body:'only-one-column\ndata\n'});
  const env = {SUPABASE_URL:'https://example.supabase.co'};
  const res = await bulkCreateReviews(req, env);
  assert.equal(res.status, 400);
  const d = await res.json();
  assert.match(d.error, /CSV 헤더에/);
});

test('bulkCreateReviews forwards valid reviews and returns inserted count', async () => {
  const csv = 'author,source,rating,content,review_date\n김준,네이버,5,정말 친절했습니다,2026-11-01\n';
  const req = fakeRequest({body:csv});
  const env = {SUPABASE_URL:'https://example.supabase.co'};
  const fetcher = async () => ({ok:true,status:201,json:async()=>({ok:true,inserted:1,errors:[]})});
  const res = await bulkCreateReviews(req, env, fetcher);
  assert.equal(res.status, 201);
  const d = await res.json();
  assert.equal(d.ok, true);
  assert.equal(d.inserted, 1);
});
