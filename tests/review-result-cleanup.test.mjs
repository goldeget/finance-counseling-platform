import {test} from 'node:test';import assert from 'node:assert/strict';
import {resultPhrase,specifiedPassage,removeResultPhrase} from '../lib/review-result-cleanup.ts';
test('removes the repeated result and changes only the connecting ending',()=>{
 assert.equal(removeResultPhrase(`조건을 맞췄고, ${resultPhrase} 친절했습니다.`),'조건을 맞췄습니다. 친절했습니다.');
 assert.equal(removeResultPhrase(`진행해 주셔서, ${resultPhrase}`),'진행해 주셨습니다.');
 assert.equal(removeResultPhrase(`조건을 맞춰준 덕에, ${resultPhrase}`),'조건을 맞춰주었습니다.');
 assert.equal(removeResultPhrase('다른 후기'),null);
});
test('rejects an unexpected connecting ending',()=>assert.throws(()=>removeResultPhrase(`알 수 없는 문장, ${resultPhrase}`),/문장/));
test('removes the complete requested passage and retains a distinct natural ending',()=>{
 assert.equal(removeResultPhrase(`조건이 어려웠는데, 정말이지 ${specifiedPassage} 상담이 친절했습니다.`),'조건이 어려웠어요. 상담이 친절했습니다.');
 assert.equal(removeResultPhrase(`어려운 상황인데, 정말이지 ${specifiedPassage}`),'어려운 상황이에요.');
});
test('preserves the meaning of each source-file connecting ending',()=>{
 const endings=[['맞췄고,','맞췄습니다.'],['풀렸으며,','풀렸습니다.'],['주어,','주었습니다.'],['맞춰지면서,','맞춰졌습니다.'],['가이드해 준 덕에,','가이드해 주었습니다.'],['맞춰졌고,','맞춰졌습니다.'],['있었으며,','있었습니다.'],['주셔서,','주셨습니다.'],['진행되어,','진행되었습니다.'],['맞춰준 덕에,','맞춰주었습니다.'],['진행하니,','진행했습니다.'],['되었고,','되었습니다.'],['있었고,','있었습니다.'],['맞춰졌으며,','맞춰졌습니다.'],['주신 덕분에,','주셨습니다.'],['진행해 준 결과,','진행해 주었습니다.']];
 for(const [before,after] of endings) assert.equal(removeResultPhrase(`앞 문장 ${before} ${resultPhrase} 뒤 문장입니다.`),`앞 문장 ${after} 뒤 문장입니다.`);
});
