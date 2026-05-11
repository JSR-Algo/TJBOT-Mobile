import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from '../components/CL';

export default function RunningPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Lesson is on Robot">
      <div style={{ padding:'36px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ position:'relative', width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {[0,0.6].map(d=>(
            <div key={d} style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:`2px solid ${accent}`, opacity:0.4, animation:`cl-pulse 2s ease-out ${d}s infinite` }}/>
          ))}
          <RobotDevice emotion="speak" size={170} accent={accent}/>
        </div>
        <div style={{ marginTop:14 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#FFF4D9', color:'#8A6A12',
            fontSize:11, fontWeight:700, padding:'5px 11px', borderRadius:999 }}>
            <span style={{ width:7, height:7, borderRadius:4, background:'#E8A33C', animation:'cl-blink 1s ease-in-out infinite' }}/>
            Lesson playing
          </div>
        </div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          Animals at home
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Your child is talking with Robot. Your phone can stay in your pocket.
        </div>
      </div>

      <div style={{ padding:'30px 16px 0' }}>
        <div style={{ background:'#F8F6F1', borderRadius:12, padding:'12px 14px', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          You'll get a calm summary here when the lesson ends. <b style={{ color:CL.ink }}>Audio is never saved.</b>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_companion')}>See what's happening</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Done for now</DvBigBtn>
      </div>

      <style>{`
        @keyframes cl-pulse { 0%{transform:scale(.7);opacity:.5} 100%{transform:scale(1.15);opacity:0} }
        @keyframes cl-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </DvShell>
  );
}
