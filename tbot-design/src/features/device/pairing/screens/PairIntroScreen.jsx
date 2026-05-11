import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairIntroPage({ go }){
  return (
    <DvShell title="Turn on Robot" onBack={()=>go('dv_pair_add')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="charging" size={180} accent={DV.accent}/>
        <div style={{ marginTop:24, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center' }}>
          Power on your Robot
        </div>
        <div style={{ marginTop:8, fontSize:14, color:DV.ink2, textAlign:'center', maxWidth:320, lineHeight:1.5, textWrap:'pretty' }}>
          Hold the button on top for 2 seconds. You'll hear a chime and see a friendly face when it's ready.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { n:'1', t:'Plug in or use a charged Robot' },
          { n:'2', t:'Hold the top button until it chimes' },
          { n:'3', t:'Place Robot within 1–2 m of your phone' },
        ].map(s=>(
          <div key={s.n} style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'12px 14px', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:DV.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>{s.n}</div>
            <div style={{ fontSize:14, color:DV.ink }}>{s.t}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>go('dv_pair_search')}>My Robot is on</DvBigBtn>
      </div>
    </DvShell>
  );
}
