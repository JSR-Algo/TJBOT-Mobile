import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PulseRing from '@/design-system/components/PulseRing';
import MicButton from '@/components/MicButton';

export default function BargeinPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.3} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 240px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--sky)', marginBottom:18 }}>Oh — go ahead!</div>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={260} color="var(--sky)"/>
          <Robot emotion="listen" size={200} accent="var(--sky)" {...robotProps}/>
        </div>
        <div style={{ marginTop:18, fontFamily:'var(--body)', fontWeight:700, fontSize:16, color:'var(--ink-soft)' }}>I'm listening 👂</div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:60, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <MicButton on onClick={()=>go('thinking')}/>
      </div>
    </ScreenShell>
  );
}
