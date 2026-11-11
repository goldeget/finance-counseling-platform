'use client';
import {useState} from 'react';
import {parseReviewCsv} from '../../../lib/review-import';
export default function ImportPanel({onComplete}:{onComplete:()=>void}) {
  const [file,setFile] = useState<File|null>(null), [confirmed,setConfirmed] = useState(false), [busy,setBusy] = useState(false), [status,setStatus] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!file || !confirmed || busy) return;
    setBusy(true); setStatus('파일 확인 중입니다.');
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      const bytes = await file.arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2,'0')).join('');
      const rows = parseReviewCsv(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      if (!rows.length) throw Error('등록할 후기가 없습니다.');
      let inserted = 0;
      for (let i=0; i<rows.length; i+=100) {
        const payload = JSON.stringify({hash,items:rows.slice(i,i+100),confirmed:true});
        let result: {ok?:boolean; inserted?:number; error?:string}|undefined;
        for (let attempt=0; attempt<3; attempt++) {
          try { const res = await fetch('/api/reviews/import',{method:'POST',headers:{'Content-Type':'application/json'},body:payload}); const data = await res.json() as typeof result; if (!res.ok) throw Error(data?.error || '등록하지 못했습니다.'); result=data; break; }
          catch(e) { if (attempt===2) throw e; await new Promise(resolve => setTimeout(resolve,1000*(attempt+1))); }
        }
        inserted += result?.inserted || 0;
        setStatus(`${Math.min(i+100, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}건 확인 · 새로 등록 ${inserted.toLocaleString()}건`);
      }
      setStatus(`완료: ${rows.length.toLocaleString()}건 확인, 새로 등록 ${inserted.toLocaleString()}건. 이미 등록된 후기는 중복하지 않았습니다.`); onComplete();
    } catch(e) { setStatus((e instanceof Error ? e.message : '등록하지 못했습니다.') + ' 중단된 경우 같은 파일로 다시 시도할 수 있습니다.'); }
    finally {setBusy(false);}
  }
  return <section style={{background:'#f7f9fd',border:'1px solid #e7edf6',borderRadius:16,padding:22,margin:'24px 0'}}><h2>CSV 후기 등록</h2><p>파일을 확인한 후 순차 등록합니다. 등록된 후기는 즉시 공개되며 출처는 ‘고객 직접 작성’으로 표시됩니다. 같은 파일을 다시 올려도 중복하지 않습니다.</p><form onSubmit={submit} style={{display:'grid',gap:12}}><label>후기 CSV 파일 <input type="file" accept=".csv,text/csv" disabled={busy} required onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> 실제 고객 작성 후기이며 게시 동의를 확인했습니다.</label><button type="submit" disabled={busy || !file || !confirmed}>{busy?'등록 중…':'CSV 후기 등록'}</button></form><p role="status" aria-live="polite">{status}</p></section>;
}
