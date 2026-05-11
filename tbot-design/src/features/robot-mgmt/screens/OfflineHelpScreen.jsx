import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import RmChip from '../components/RmChip';
import { RM } from '../components/styles';

export default function OfflineHelpPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot offline help" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'24px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={150} accent={accent}/>
        <div style={{ marginTop:14 }}><RmChip color={RM.warn} bg="#FFF4D9">⚠️ Robot is offline</RmChip></div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Let's bring Robot back online
        </div>
        <div style={{ marginTop:6, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Try these in order. Most parents fix it in under a minute.
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {[
          { n:1, t:'Is Robot powered on?', b:"Look at the LCD face. If it's dark, place Robot on the dock or hold the top button for 2 seconds." },
          { n:2, t:'Is your Wi-Fi working?', b:'Open another app on your phone. If that fails too, restart your router.' },
          { n:3, t:'Move Robot closer', b:'Thick walls or a far room can drop the signal. Try the same room as the router.' },
          { n:4, t:'Restart Robot', b:'Hold the top button for 5 seconds. Robot will gently chime when it wakes up.' },
          { n:5, t:'Update Wi-Fi', b:'If your password changed, give Robot the new one.', cta:'Update Wi-Fi', go:'rm_wifi' },
        ].map(s=>(
          <div key={s.n} style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:RM.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{s.n}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>{s.t}</div>
              <div style={{ fontSize:12, color:RM.ink2, lineHeight:1.5, marginTop:3, textWrap:'pretty' }}>{s.b}</div>
              {s.cta && <button onClick={(e)=>{e.stopPropagation(); go(s.go);}} style={{ marginTop:8, background:'transparent', border:'none', color:RM.accent, fontWeight:600, fontSize:13, fontFamily:'inherit', cursor:'pointer', padding:0 }}>{s.cta} →</button>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>Try connecting again</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_support')}>Still stuck · contact support</DvBigBtn>
      </div>
    </DvShell>
  );
}
