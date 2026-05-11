import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairCodePage({ go, tweaks }){
  return (
    <DvShell title="Confirm it's yours" onBack={()=>go('dv_pair_found')}>
      <div style={{ padding:'18px 20px 0', fontSize:14, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Robot is showing a 4-digit code on its face. Type it here so we know we're pairing the right one.
      </div>
      <div style={{ padding:'18px 16px 0', display:'flex', justifyContent:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:'16px 24px' }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {['4','7','2','1'].map((d,i)=>(
              <div key={i} style={{ fontSize:48, fontWeight:800, color:'#E8F4FF', fontFamily:'ui-monospace, monospace', letterSpacing:-1 }}>{d}</div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textAlign:'center', textTransform:'uppercase', letterSpacing:0.6, marginTop:6 }}>On Robot's face</div>
        </div>
      </div>
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Type the code</div>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          {['4','7','2','1'].map((d,i)=>(
            <div key={i} style={{ width:56, height:64, borderRadius:10, background:DV.card, border:`2px solid ${DV.accent}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:DV.ink, fontFamily:'ui-monospace, monospace' }}>{d}</div>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_wifi')}>Confirm & continue</DvBigBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_search');}} style={{ background:'transparent', border:'none', fontSize:14, color:DV.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:8 }}>Codes don't match</button>
      </div>
    </DvShell>
  );
}
