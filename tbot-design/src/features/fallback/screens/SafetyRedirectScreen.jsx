import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function SafetyRedirectPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, #E8E5F0 0%, var(--paper) 70%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 28px 220px', gap:20 }}>
        <Robot emotion="gentle" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>Let's take a tiny pause.<br/>A grown-up can help if you need.</SpeechBubble>
        <div style={{
          background:'rgba(255,255,255,.85)', borderRadius:20, padding:'14px 18px',
          fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)',
          textAlign:'center', lineHeight:1.45, maxWidth:300,
        }}>
          We'll come back to learning when you're ready.
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home_hub_idle')} color="var(--plum)">Take a break</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('parent_gate');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Get a grown-up</button>
      </div>
    </ScreenShell>
  );
}
