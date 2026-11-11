import {test} from 'node:test';
import assert from 'node:assert/strict';
import { repeatedPassage, removeRepeatedPassage } from '../lib/review-long-cleanup.ts';
test('removes the specified repeated passage and repairs only the preceding ending', () => {
  assert.equal(removeRepeatedPassage(`승인이 어려웠는데, ${repeatedPassage} 상담에 만족했습니다.`), '승인이 어려웠습니다. 상담에 만족했습니다.');
  assert.equal(removeRepeatedPassage(`어려운 상황인데, ${repeatedPassage}`), '어려운 상황입니다.');
  assert.equal(removeRepeatedPassage('다른 후기입니다.'),null);
});
test('rejects an unexpected sentence shape rather than changing it',()=>{
  assert.throws(()=>removeRepeatedPassage(`예상하지 못한 문장. ${repeatedPassage}`),/문장/);
});
