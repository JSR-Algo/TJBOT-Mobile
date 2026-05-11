import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function OfftopicPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="happy" size={220} {...robotProps}/>
        <SpeechBubble>Oh fun! 🐱<br/>Let's stay with the cat for now.</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--mint)">Back to the cat</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
