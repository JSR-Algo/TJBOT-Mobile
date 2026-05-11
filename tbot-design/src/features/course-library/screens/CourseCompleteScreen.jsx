import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from '../components/CL';
import CLChip from '../components/CLChip';

export default function CourseCompletePage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Today's lesson">
      <div style={{ padding:'36px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="celebrate" size={170} accent={accent}/>
        <div style={{ marginTop:18 }}>
          <CLChip state="completed"/>
        </div>
        <div style={{ marginTop:12, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          A lovely 4 minutes
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Synced from Robot just now. Audio was never saved.
        </div>
      </div>

      {/* Summary stats — child-friendly framing, no grades */}
      <div style={{ padding:'24px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { v:'10', l:'Words played with' },
          { v:'7',  l:'Tried out loud' },
          { v:'4 min', l:'Time together' },
          { v:'3', l:'Words to revisit' },
        ].map(s=>(
          <div key={s.l} style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:12, padding:'12px 12px' }}>
            <div style={{ fontSize:22, fontWeight:700, color:CL.ink, letterSpacing:-0.4 }}>{s.v}</div>
            <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Words list */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>What Robot taught</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[
              { w:'cat', good:true }, { w:'dog', good:true }, { w:'bird', good:true },
              { w:'fish', good:true }, { w:'rabbit', good:false }, { w:'happy', good:true },
              { w:'big', good:true }, { w:'small', good:false }, { w:'jump', good:true },
              { w:'sleep', good:false },
            ].map(t=>(
              <span key={t.w} style={{
                background: t.good ? '#E6F4EE' : '#FFF4D9',
                color: t.good ? '#1F8A5B' : '#8A6A12',
                fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:7 }}>{t.w}</span>
            ))}
          </div>
          <div style={{ fontSize:11, color:CL.ink3, marginTop:10, lineHeight:1.5, textWrap:'pretty' }}>
            <span style={{ color:'#1F8A5B', fontWeight:700 }}>Green</span> = practiced confidently · <span style={{ color:'#8A6A12', fontWeight:700 }}>Yellow</span> = Robot will revisit
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_send')}>Plan tomorrow's lesson</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Done</DvBigBtn>
      </div>
    </DvShell>
  );
}
