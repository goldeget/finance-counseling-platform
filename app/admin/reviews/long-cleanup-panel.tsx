'use client';
import {useState} from 'react';
export default function LongCleanupPanel({onComplete}:{onComplete:()=>void}){
  const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
  async function run(){setBusy(true);setStatus('대상 후기를 확인하고 있습니다.');
    try{
      const getCount=async()=>{const response=await fetch('/api/reviews/cleanup-long',{cache:'no-store'});const data=await response.json() as {remaining?:number;error?:string};if(!response.ok||typeof data.remaining!=='number')throw Error(data.error||'대상을 확인하지 못했습니다.');return data.remaining;};
      const initial=await getCount();let changed=0;
      while(true){const response=await fetch('/api/reviews/cleanup-long',{method:'POST'});const data=await response.json() as {changed?:number;error?:string};if(!response.ok||typeof data.changed!=='number')throw Error(data.error||'수정하지 못했습니다.');changed+=data.changed;setStatus(`대상 ${initial.toLocaleString()}건 중 ${changed.toLocaleString()}건 수정`);if(data.changed===0)break;}
      const remaining=await getCount();if(remaining)throw Error(`수정되지 않은 후기가 ${remaining.toLocaleString()}건 남았습니다.`);setStatus(`완료: 대상 ${initial.toLocaleString()}건, 남은 대상 0건.`);onComplete();
    }catch(e){setStatus((e instanceof Error?e.message:'수정하지 못했습니다.')+' 다시 실행하면 남은 후기부터 처리합니다.');}finally{setBusy(false);}
  }
  return <section style={{background:'#f7f9fd',border:'1px solid #e7edf6',borderRadius:16,padding:22,margin:'24px 0'}}><h2>긴 반복 문구 삭제</h2><p>요청한 반복 문구를 삭제하고 앞 문장의 연결 어미만 다듬습니다.</p><button type="button" disabled={busy} onClick={run}>{busy?'수정 중…':'긴 반복 문구 정리'}</button><p role="status" aria-live="polite">{status}</p></section>;
}
