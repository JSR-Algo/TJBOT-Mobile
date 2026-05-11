import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';

export default function FirstLessonEntryPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sun) 0%, var(--cream-2) 60%)">
      <div style={{ position:'absolute', top:64, left:'50%', transform:'translateX(-50%)', zIndex:5,
        background:'rgba(255,255,255,.85)', backdropFilter:'blur(8px)', padding:'8px 14px', borderRadius:999,
        display:'flex', alignItems:'center', gap:8, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)',
        boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 11V8a4 4 0 118 0v3M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z"/></svg>
        Hand the phone to your child
      </div>

      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'140px 28px 230px' }}>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{
            position:'absolute', inset:30, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 70%)',
            animation:'splash-pop 1s ease both',
          }}/>
          <Robot emotion="greet" size={220} accent="var(--coral)" {...robotProps}/>
        </div>
        <SpeechBubble>Hi there!<br/>Want to play?</SpeechBubble>
        <div style={{
          marginTop:12, background:'rgba(255,255,255,.7)', backdropFilter:'blur(6px)',
          padding:'8px 14px', borderRadius:999, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)',
        }}>About 3 minutes · headphones if you have them</div>
      </div>

      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Yes!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
