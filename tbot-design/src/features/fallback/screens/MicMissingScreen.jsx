import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function MicMissingPage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--danger-soft) 0%, var(--cream) 70%)">
      <TopBar onBack={()=>go('home_hub_idle')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 24px 220px', gap:18 }}>
        <Robot emotion="sad" size={220} accent="var(--coral)" {...robotProps}/>
        <SpeechBubble>Hmm, I can't hear yet.<br/>Let's check the microphone.</SpeechBubble>
        <div style={{
          background:'#fff', padding:'14px 18px', borderRadius:20,
          fontFamily:'var(--body)', fontWeight:700, fontSize:15, color:'var(--ink-soft)',
          textAlign:'center', lineHeight:1.4, maxWidth:300,
        }}>
          A grown-up can turn on the microphone in Settings.
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('audio_recovery')} color="var(--coral)">Get a grown-up</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}
