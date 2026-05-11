import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from './components/CL';

export default function UnlockConfirmModalPage({ go, tweaks }){
  const [vals, setVals] = React.useState(['','','','']);
  const target = ['7','3','5','1'];
  const filled = vals.every(Boolean);
  const ok = vals.join('') === target.join('');
  return (
    <DvShell title="Quick parent check" onBack={()=>go('cl_buy')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={CL.ink2} strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
        </div>
        <div style={{ fontSize:20, fontWeight:600, color:CL.ink, letterSpacing:-0.2, textAlign:'center' }}>Type the number below</div>
        <div style={{ fontSize:13, color:CL.ink2, marginTop:6, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          A small step so kids can't add courses by accident.
        </div>
      </div>

      <div style={{ padding:'24px 20px 0', textAlign:'center' }}>
        <div style={{ fontSize:42, fontWeight:700, color:CL.ink, letterSpacing:6, fontFamily:'ui-monospace, monospace' }}>{target.join(' ')}</div>
      </div>

      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          {vals.map((v, i)=>(
            <div key={i} style={{ width:54, height:64, borderRadius:12, background:CL.card,
              border: `2px solid ${ok ? CL.good : v ? CL.accent : CL.hair}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:CL.ink, fontFamily:'ui-monospace, monospace' }}>
              {v || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Mini keypad */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i)=>(
            <button key={i} disabled={!k} onClick={(e)=>{
              e.stopPropagation();
              setVals(prev=>{
                const next = [...prev];
                if (k === '⌫'){
                  for (let j=next.length-1;j>=0;j--) if (next[j]){ next[j]=''; break; }
                } else if (k){
                  const idx = next.findIndex(x=>!x);
                  if (idx>=0) next[idx]=k;
                }
                return next;
              });
            }} style={{
              height:54, borderRadius:12, border:`1px solid ${CL.hair}`,
              background: k? CL.card : 'transparent', color:CL.ink, fontSize:20, fontWeight:600,
              fontFamily:'inherit', cursor: k? 'pointer':'default', visibility: k? 'visible':'hidden',
            }}>{k}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>{ if (ok) go('cl_added'); }}>
          {ok ? 'Confirm purchase' : filled ? 'Try again' : 'Enter the number'}
        </DvBigBtn>
      </div>
    </DvShell>
  );
}
