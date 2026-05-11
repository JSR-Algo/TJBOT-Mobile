import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import WaveBars from '@/design-system/components/WaveBars';

export default function RobotSpeakingPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.25} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 220px', gap:18 }}>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.5 }}>Listen 👂</div>
        <Robot emotion="speak" size={220} {...robotProps}/>
        <SpeechBubble>This is a <span style={{ color:'var(--coral)' }}>cat</span>.<div style={{fontSize:48,marginTop:6}}>🐱</div></SpeechBubble>
        <div style={{ marginTop:8 }}><WaveBars color="var(--sky)" height={20} count={12}/></div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('robot_listening');}} style={{
          width:'100%', minHeight:60, borderRadius:'var(--r-button)', border:'2px dashed rgba(0,0,0,.15)',
          background:'rgba(255,255,255,.5)', color:'var(--ink-soft)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>🤖 Robot is talking…</button>
      </div>
    </ScreenShell>
  );
}
