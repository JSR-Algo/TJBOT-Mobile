import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function SafetyPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, #E8E5F0 0%, var(--paper) 70%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 28px 220px', gap:20 }}>
        <Robot emotion="gentle" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>Let's pause for a moment.<br/>A grown-up can help if you need.</SpeechBubble>
        <div style={{
          background:'rgba(255,255,255,.85)', borderRadius:20, padding:'16px 18px',
          display:'flex', alignItems:'center', gap:12, maxWidth:320,
          boxShadow:'0 2px 6px rgba(0,0,0,.05)'
        }}>
          <div style={{ width:46, height:46, borderRadius:'50%', background:'var(--plum)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5zm-7 14a7 7 0 0014 0v-1H5v1z"/></svg>
          </div>
          <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:'var(--ink)', textWrap:'pretty' }}>
            We can take a break or ask for a grown-up.
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home_hub_idle')} color="var(--plum)">Take a break</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)', fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Get a grown-up</button>
      </div>
    </ScreenShell>
  );
}
