import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';

export default function ReconnectingPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, #E8E5F0 0%, var(--cream) 70%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:20 }}>
        <Robot emotion="worry" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>One sec — finding my voice again.</SpeechBubble>
        <div style={{ display:'flex', gap:6 }}>
          {[0,1,2].map(i=><div key={i} style={{ width:10, height:10, borderRadius:5, background:'var(--plum)', animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite` }}/>)}
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('robot_listening');}} style={{
          width:'100%', minHeight:60, borderRadius:'var(--r-button)', border:'2px solid rgba(0,0,0,.1)',
          background:'transparent', color:'var(--ink-soft)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>Wait with Robot</button>
      </div>
    </ScreenShell>
  );
}
