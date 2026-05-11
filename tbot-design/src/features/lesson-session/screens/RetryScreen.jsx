import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function RetryPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="curious" size={220} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>I heard you trying.<br/>One more time?</SpeechBubble>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:18, color:'var(--ink-soft)' }}>Say: <b style={{ color:'var(--ink)' }}>"cat"</b></div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)" icon={<span>🎤</span>}>I'll try!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
