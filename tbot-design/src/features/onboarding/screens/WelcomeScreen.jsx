import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function WelcomePage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', padding:'120px 28px 230px' }}>
        <Robot emotion="greet" size={200} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:34, color:'var(--ink)', textAlign:'center', marginTop:14, lineHeight:1.1, letterSpacing:-0.4 }}>
          Hi! I'm Robot.<br/>I help kids talk in English.
        </div>
        <div style={{
          marginTop:22, background:'rgba(255,255,255,.7)', backdropFilter:'blur(8px)',
          padding:'12px 16px', borderRadius:14, display:'flex', alignItems:'center', gap:10,
          fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)', maxWidth:300, textWrap:'pretty', textAlign:'left',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
          A grown-up sets things up the first time.
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('onb_intro_listen')} color="var(--coral)">Get started</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_login');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:15, cursor:'pointer',
        }}>I already have an account</button>
      </div>
    </ScreenShell>
  );
}
