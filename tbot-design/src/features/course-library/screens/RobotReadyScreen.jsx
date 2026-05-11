import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from '../components/CL';
import CLChip from '../components/CLChip';

export default function RobotReadyPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot is ready">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="happy" size={200} accent={accent}/>
        <div style={{ marginTop:22 }}>
          <CLChip state="ready"/>
        </div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          Lesson 4 · Animals at home
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Place Robot on the table. When your child taps it, the lesson starts. About 4 minutes.
        </div>
      </div>

      {/* Pre-flight checklist */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            { ic:'🔋', t:'Battery', v:'78% · plenty', good:true },
            { ic:'📶', t:'Wi-Fi', v:'Casa-Familia · strong', good:true },
            { ic:'🔉', t:'Volume', v:'6 of 10 · room-friendly', good:true },
            { ic:'📚', t:'Lesson loaded', v:'Ready on Robot', good:true },
          ].map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px',
              borderBottom: i<a.length-1? `1px solid ${CL.hair}`:'none' }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>{r.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:CL.ink2, marginTop:1 }}>{r.v}</div>
              </div>
              {r.good && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CL.good} strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_running')}>Hand it to your child</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_send')}>Pick a different lesson</DvBigBtn>
      </div>
    </DvShell>
  );
}
