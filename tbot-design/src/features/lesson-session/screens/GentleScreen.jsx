import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function GentlePage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--paper-2) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="gentle" size={220} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>Let's try that together.<br/><span style={{ color:'var(--coral)' }}>"cat"</span> 🐱</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:12 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)" icon={<span>🎤</span>}>Try again</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('robot_speaking');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)', fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Hear it again</button>
      </div>
    </ScreenShell>
  );
}
