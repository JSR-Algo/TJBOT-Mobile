import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function GreetingPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.05} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:20 }}>
        <Robot emotion="greet" size={240} {...robotProps}/>
        <SpeechBubble>Hi friend! 👋<br/>Ready to play with words?</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('activity_intro')} color="var(--mint)">Yes, let's go!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
