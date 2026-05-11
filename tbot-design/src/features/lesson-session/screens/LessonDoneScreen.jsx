import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function LessonDonePage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sun) 0%, var(--cream-2) 70%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px 200px', gap:14 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-hero)', color:'var(--ink)', textAlign:'center', lineHeight:1.05 }}>You did it!</div>
        <Robot emotion="success" size={240} accent="var(--coral)" {...robotProps}/>
        <div style={{ display:'flex', gap:8 }}>
          {[0,1,2].map(i=><span key={i} style={{ fontSize:48 }}>⭐</span>)}
        </div>
        <div style={{
          background:'rgba(255,255,255,.7)', backdropFilter:'blur(8px)',
          padding:'14px 22px', borderRadius:20, fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)',
          textAlign:'center', maxWidth:300,
        }}>
          You learned 3 words today.<br/>See you tomorrow! 👋
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:12 }}>
        <PrimaryCTA onClick={()=>go('lesson_summary')} color="var(--coral)">See what you did</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}
