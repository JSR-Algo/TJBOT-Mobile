import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function NetworkErrorPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, #E8E5F0 0%, var(--cream) 70%)">
      <TopBar onBack={()=>go('home_hub_idle')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 24px 220px', gap:18 }}>
        <Robot emotion="worry" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>Oops — I lost my signal.<br/>Let's try again in a sec.</SpeechBubble>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.7)', padding:'8px 14px', borderRadius:999, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12" y2="20"/></svg>
          No internet connection
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('reconnecting_overlay')} color="var(--plum)">Try again</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}
