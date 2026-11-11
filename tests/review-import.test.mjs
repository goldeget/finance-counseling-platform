import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReviewCsv, insertReviewSql } from '../lib/review-import.ts';
import { DatabaseSync } from 'node:sqlite';

const header = 'review_id,writer_anonymous_id,writer_name_masked,created_at,review_text,rating,category,key_keyword\n';
test('preserves quoted review text and half-point ratings', () => {
  const rows = parseReviewCsv(header + '1,u1,김*수,2026-01-01,"좋아요, 정말 ""감사""합니다",4.5,상담,키워드\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].content, '좋아요, 정말 "감사"합니다');
  assert.equal(rows[0].rating, 4.5);
});
test('rejects duplicate review identifiers before importing', () => {
  const row = '1,u1,김*수,2026-01-01,감사합니다 좋은 상담,5.0,상담,키워드\n';
  assert.throws(() => parseReviewCsv(header + row + row), /중복/);
});
test('rejects personal contact details', () => {
  assert.throws(() => parseReviewCsv(header + '1,u1,김*수,2026-01-01,전화 010-1234-5678,5.0,상담,키워드\n'), /연락처/);
});
test('retrying a batch preserves the original review and half-point rating', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE reviews (id TEXT PRIMARY KEY, author TEXT NOT NULL, source TEXT NOT NULL, rating INTEGER NOT NULL, content TEXT NOT NULL, review_date TEXT NOT NULL, created_at TEXT NOT NULL)');
  const validSql = insertReviewSql.includes('ON CONFLICT');
  assert.equal(validSql, true, 'insert must be idempotent');
  const insert = db.prepare(insertReviewSql);
  const args = ['csv-123', '김**', '고객 직접 작성', 4.5, '좋은 상담 감사합니다', '2026-01-01', '2026-01-02'];
  assert.equal(insert.run(...args).changes, 1);
  assert.equal(insert.run(...args).changes, 0);
  assert.equal(db.prepare('SELECT rating FROM reviews').get().rating, 4.5);
});
