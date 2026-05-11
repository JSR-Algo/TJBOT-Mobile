import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairFailedPage({ go, tweaks }){
  return (
    <DvShell title="Pairing didn't work" onBack={()=>go('dv_pair_intro')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="gentle" size={160} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:20, fontSize:20, fontWeight:600, letterSpacing:-0.3, textAlign:'center' }}>
          We couldn't reach your Robot
        </div>
        <div style={{ marginTop:6, fontSize:13, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          No worries — pairing usually works on the second try. Pick what likely happened:
        </div>
      </div>
      <div style={{ padding:'20px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { ic:'🔋', t:'Robot looks asleep', b:'Hold the top button until you hear a chime.', go:'dv_pair_intro' },
          { ic:'📶', t:'Wrong Wi-Fi password', b:'Try entering it again — common typos: O vs 0.', go:'dv_pair_wifi_pw' },
          { ic:'📡', t:'Robot is too far', b:'Bring Robot within 1–2 m of your phone.', go:'dv_pair_search' },
          { ic:'🔌', t:'Battery is low', b:'Plug Robot in for 5 minutes, then try again.', go:'dv_pair_intro' },
        ].map((r,i)=>(
          <button key={i} onClick={(e)=>{e.stopPropagation(); go(r.go);}} style={{
            background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'12px 14px',
            display:'flex', gap:12, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:DV.ink }}>{r.t}</div>
              <div style={{ fontSize:12, color:DV.ink2, marginTop:2, lineHeight:1.4, textWrap:'pretty' }}>{r.b}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        ))}
      </div>
      <div style={{ padding:'20px 20px 30px' }}>
        <DvBigBtn secondary onClick={()=>go('dv_pair_search')}>Try again</DvBigBtn>
      </div>
    </DvShell>
  );
}
