import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairSuccessPage({ go, tweaks }){
  return (
    <DvShell title="Robot is ready">
      <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="celebrate" size={200} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:30, fontSize:24, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:DV.ink }}>
          Your Robot is paired
        </div>
        <div style={{ marginTop:8, fontSize:14, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Lessons will play <b style={{ color:DV.ink }}>on the Robot</b>. Your phone is just for setup, progress, and safety.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          {[
            { ic:'🤖', t:'Robot listens & speaks', b:'Mic and speaker on the Robot, not your phone.' },
            { ic:'📚', t:'Starter course is loaded', b:'Unit 1 is on the device, ready to go.' },
            { ic:'🛡️', t:'Audio is not saved', b:'Conversations stay between Robot and your child.' },
          ].map((r,i,a)=>(
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none', alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:DV.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_rename')}>Choose a Buddy & name</DvBigBtn>
      </div>
    </DvShell>
  );
}
