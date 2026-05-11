import React from 'react';
import DvShell from '@/components/DeviceShell';
import { DV } from '@/components/Device-tokens';

export default function PairSearchPage({ go }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('dv_pair_found'), 2400); return ()=>clearTimeout(t); }, []);
  return (
    <DvShell title="Looking for Robot…" onBack={()=>go('dv_pair_intro')}>
      <div style={{ padding:'40px 24px 30px', display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
        <div style={{ position:'relative', width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {[0,0.5,1].map(d=>(
            <div key={d} style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:`2px solid ${DV.accent}`, opacity:0.5, animation:`pair-pulse 1.6s ease-out ${d}s infinite` }}/>
          ))}
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="1.6" strokeLinecap="round"><path d="M5 12.55a11 11 0 0114 0M8.5 16.5a7 7 0 017 0M12 20l.01 0M2 8.82a15 15 0 0120 0"/></svg>
        </div>
        <div style={{ fontSize:18, fontWeight:600, textAlign:'center' }}>Looking nearby…</div>
        <div style={{ fontSize:13, color:DV.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>Make sure Robot is within 3 meters and showing a face.</div>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_failed');}} style={{ marginTop:20, background:'transparent', border:'none', fontSize:14, color:DV.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500 }}>I don't see my Robot</button>
        <style>{`@keyframes pair-pulse { 0% { transform:scale(.4); opacity:.6 } 100% { transform:scale(1.1); opacity:0 } }`}</style>
      </div>
    </DvShell>
  );
}
