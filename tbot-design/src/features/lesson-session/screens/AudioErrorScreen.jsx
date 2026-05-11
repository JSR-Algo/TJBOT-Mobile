import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function AudioErrorPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--danger-soft) 0%, var(--cream) 70%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 220px', gap:18 }}>
        <Robot emotion="sad" size={220} accent="var(--coral)" {...robotProps}/>
        <SpeechBubble>I can't hear my microphone.<br/>Let's check it together.</SpeechBubble>
        <div style={{
          background:'#fff', padding:'14px 18px', borderRadius:18,
          display:'flex', alignItems:'center', gap:12, maxWidth:300, boxShadow:'0 2px 8px rgba(0,0,0,.06)'
        }}>
          <span style={{ fontSize:28 }}>🎤</span>
          <span style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:14, color:'var(--ink-soft)', textWrap:'pretty' }}>
            Ask a grown-up to turn the mic on.
          </span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)">Try again</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)', fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Go home</button>
      </div>
    </ScreenShell>
  );
}
