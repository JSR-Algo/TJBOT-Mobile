import React from 'react';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';

export default function ActivatePage({ go }){
  const [vals, setVals] = React.useState(['','','','','','']);
  const filled = vals.every(Boolean);
  return (
    <DvShell title="Activate your Robot" onBack={()=>go('pr_arrived')}>
      <div style={{ padding:'18px 24px 0', textAlign:'center' }}>
        <PRStepTab step={1} total={3}/>
      </div>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:54, height:54, borderRadius:14, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PR.ink2} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <div style={{ fontSize:22, fontWeight:600, color:PR.ink, letterSpacing:-0.3, textAlign:'center' }}>Enter activation code</div>
        <div style={{ marginTop:8, fontSize:13, color:PR.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          You'll find a 6-character code on the card inside Robot's box.
        </div>
      </div>

      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          {vals.map((v, i)=>(
            <div key={i} style={{ width:42, height:54, borderRadius:10, background:PR.card, border: `2px solid ${v ? PR.accent : PR.hair}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:PR.ink, fontFamily:'ui-monospace, monospace', textTransform:'uppercase' }}>
              {v || ''}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6 }}>
          {['T','B','4','7','K','9'].map((k, i)=>(
            <button key={i} onClick={(e)=>{
              e.stopPropagation();
              setVals(prev => { const next=[...prev]; const idx = next.findIndex(x=>!x); if (idx>=0) next[idx]=k; return next; });
            }} style={{ height:46, borderRadius:10, border:`1px solid ${PR.hair}`, background:PR.card, color:PR.ink, fontSize:16, fontWeight:600, fontFamily:'ui-monospace, monospace', cursor:'pointer' }}>{k}</button>
          ))}
        </div>
        <button onClick={(e)=>{ e.stopPropagation(); setVals(['','','','','','']); }} style={{ marginTop:10, background:'transparent', border:'none', color:PR.accent, fontWeight:600, fontSize:13, fontFamily:'inherit', cursor:'pointer', display:'block', width:'100%', padding:8 }}>Clear</button>
      </div>

      <div style={{ padding:'18px 20px 0' }}>
        <DvRow icon="❓" title="Can't find the code?" body="It's printed on the inside flap of the box"/>
      </div>

      <div style={{ padding:'18px 20px 30px' }}>
        <DvBigBtn onClick={()=>{ if (filled) go('pr_first_course'); }}>{filled ? 'Activate Robot' : 'Enter the code'}</DvBigBtn>
      </div>
    </DvShell>
  );
}
