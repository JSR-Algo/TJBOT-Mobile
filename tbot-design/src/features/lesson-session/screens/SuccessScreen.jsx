import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function SuccessPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.45} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="success" size={240} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble color="#fff">
          <span style={{ color:'var(--mint)' }}>Nice speaking!</span><br/>
          <span style={{ fontSize:18, fontWeight:600, color:'var(--ink-soft)' }}>You said "cat" 🐱</span>
        </SpeechBubble>
        <div style={{ display:'flex', gap:6 }}>
          {[0,1,2].map(i=><span key={i} style={{ fontSize:32, animation:`bot-spark 1.2s ease-out ${i*0.15}s infinite` }}>⭐</span>)}
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--mint)">Next →</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
