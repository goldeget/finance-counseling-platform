export const repeatedPassage = '정말이지 금융상담 통합 지원센터 담당자께서 끝까지 포기하지 않고 맞춤 승인 조건을 다각도로 조율해 주셔서, 급하게 필요했던 비상 자금을 안전하게 계좌로 입금받을 수 있었습니다.';
export function removeRepeatedPassage(text:string):string|null {
  const index=text.indexOf(repeatedPassage); if(index<0)return null;
  if(text.indexOf(repeatedPassage,index+repeatedPassage.length)>=0)throw Error('한 후기에 중복 문장이 여러 번 있습니다.');
  const before=text.slice(0,index).trimEnd(),after=text.slice(index+repeatedPassage.length).trim();
  let ending:string;
  if(before.endsWith('인데,')) ending=before.slice(0,-3)+'입니다.';
  else if(before.endsWith('는데,')) ending=before.slice(0,-3)+'습니다.';
  else throw Error('문장 끝부분을 확인해야 합니다.');
  return ending+(after?' '+after:'');
}
