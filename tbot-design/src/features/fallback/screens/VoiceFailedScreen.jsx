import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function VoiceFailedPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--paper-2) 0%, var(--cream) 70%)">
      <TopBar onBack={()=>go('home_hub_idle')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 24px 220px', gap:18 }}>
        <Robot emotion="gentle" size={220} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>My voice got tangled up.<br/>Let's start the lesson fresh.</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('lesson_resume')} color="var(--coral)">Pick up where we left off</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}
