export const resultPhrase='급하게 필요했던 비상 자금을 안전하게 계좌로 입금받을 수 있었습니다.';
export const specifiedPassage='금융상담 통합 지원센터의 1:1 맞춤형 세팅 덕분에 막혔던 심사 승인 기준을 극적으로 맞췄고, '+resultPhrase;
const endings:[string,string][]=[['가이드해 준 덕에,','가이드해 주었습니다.'],['맞춰준 덕에,','맞춰주었습니다.'],['진행해 준 결과,','진행해 주었습니다.'],['주신 덕분에,','주셨습니다.'],['맞춰지면서,','맞춰졌습니다.'],['맞춰졌으며,','맞춰졌습니다.'],['맞춰졌고,','맞춰졌습니다.'],['맞췄고,','맞췄습니다.'],['풀렸으며,','풀렸습니다.'],['있었으며,','있었습니다.'],['주셔서,','주셨습니다.'],['진행되어,','진행되었습니다.'],['진행하니,','진행했습니다.'],['되었고,','되었습니다.'],['있었고,','있었습니다.'],['주어,','주었습니다.']];
export function removeResultPhrase(text:string):string|null {
  const index=text.indexOf(resultPhrase);if(index<0)return null;
  if(text.indexOf(resultPhrase,index+resultPhrase.length)>=0)throw Error('중복 문장이 여러 번 있습니다.');
  const wholeIndex=text.indexOf(specifiedPassage);
  if(wholeIndex>=0){
    const before=text.slice(0,wholeIndex).replace(/정말이지\s*$/,'').trimEnd(),after=text.slice(wholeIndex+specifiedPassage.length).trim();
    let ending:string;
    if(before.endsWith('인데,'))ending=before.slice(0,-3)+'이에요.';
    else if(before.endsWith('는데,'))ending=before.slice(0,-3)+'어요.';
    else throw Error('문장 끝부분을 확인해야 합니다.');
    return ending+(after?' '+after:'');
  }
  const before=text.slice(0,index).trimEnd(),after=text.slice(index+resultPhrase.length).trim();
  const replacement=endings.find(([old])=>before.endsWith(old));
  if(!replacement)throw Error('문장 끝부분을 확인해야 합니다.');
  return before.slice(0,-replacement[0].length)+replacement[1]+(after?' '+after:'');
}
