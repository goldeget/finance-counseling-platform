'use client';
import {useState} from 'react';
export default function VerificationPanel(){
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function run(){setBusy(true);setStatus('전체 후기를 확인하고 있습니다.');try{const response=await fetch('/api/reviews/verify',{cache:'no-store'});const data=await response.json() as {total:number;unique_count:number;common_count:number;long_count:number;result_count:number;match_count:number;error?:string};if(!response.ok)throw Error(data.error||'확인하지 못했습니다.');setStatus(`전체 ${data.total.toLocaleString()}건 · 서로 다른 후기 ${data.unique_count.toLocaleString()}건 · 감사 문구 ${data.common_count.toLocaleString()}건 · 긴 반복 문구 ${data.long_count.toLocaleString()}건 · 자금 수령 문구 ${data.result_count.toLocaleString()}건 · 지정 1:1 문장 ${data.match_count.toLocaleString()}건`);}catch(e){setStatus(e instanceof Error?e.message:'확인하지 못했습니다.');}finally{setBusy(false);}}
 return <section style={{background:'#f7f9fd',border:'1px solid #e7edf6',borderRadius:16,padding:22,margin:'24px 0'}}><h2>후기 전체 확인</h2><button type="button" disabled={busy} onClick={run}>{busy?'확인 중…':'전체 후기 중복 확인'}</button><p role="status" aria-live="polite">{status}</p></section>;
}
