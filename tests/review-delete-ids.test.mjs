import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as reviewImport from '../lib/review-import.ts';

test('allows administrator to address an imported review and a manually created review', () => {
  const valid = reviewImport.isDeletableReviewId;
  assert.equal(valid?.('csv-' + 'a'.repeat(64) + '-43057'), true);
  assert.equal(valid?.('123e4567-e89b-42d3-a456-426614174000'), true);
});

test('rejects malformed imported and unrelated review identifiers', () => {
  const valid = reviewImport.isDeletableReviewId;
  for (const id of ['csv-short-123', 'csv-' + 'a'.repeat(64) + '-../../other', '', 'csv-' + 'a'.repeat(64) + '-']) {
    assert.equal(valid?.(id), false, id);
  }
});
