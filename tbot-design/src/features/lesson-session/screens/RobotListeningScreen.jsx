import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PulseRing from '@/design-system/components/PulseRing';
import MicButton from '@/components/MicButton';

export default function RobotListeningPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.3} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 240px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--coral)', marginBottom:6 }}>Your turn!</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:18, color:'var(--ink-soft)', marginBottom:24 }}>Say: <b style={{ color:'var(--ink)' }}>"cat"</b> 🐱</div>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={240} color="var(--coral)"/>
          <Robot emotion="listen" size={200} {...robotProps}/>
        </div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:60, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <MicButton on onClick={()=>go('user_speaking')} label="speak now"/>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:15, color:'var(--ink-soft)' }}>I'm listening…</div>
      </div>
    </ScreenShell>
  );
}
