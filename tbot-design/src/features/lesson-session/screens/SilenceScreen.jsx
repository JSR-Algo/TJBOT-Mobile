import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function SilencePage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="curious" size={220} {...robotProps}/>
        <SpeechBubble>Hmm, I didn't hear that clearly.<br/>Let's try again.</SpeechBubble>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', padding:'10px 16px', borderRadius:999, boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
          <span style={{ fontSize:20 }}>🤫</span>
          <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)' }}>Speak a little louder</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)" icon={<span>🎤</span>}>I'm here!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
