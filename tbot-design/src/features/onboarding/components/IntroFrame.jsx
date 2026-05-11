import React from 'react';
import ScreenShell from '@/components/ScreenShell';
import CircleBtn from '@/design-system/components/CircleBtn';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import IntroDots from './IntroDots';

export default function IntroFrame({ go, idx, prev, next, accentBg, kicker, title, body, illo }){
  return (
    <ScreenShell bg={accentBg}>
      <div style={{ position:'absolute', top:64, left:18, right:18, display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:5 }}>
        <CircleBtn size={42} onClick={()=>prev && go(prev)} ariaLabel="back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </CircleBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_trust');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>Skip</button>
      </div>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 28px 220px', gap:18 }}>
        {illo}
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.5 }}>{kicker}</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', textAlign:'center', lineHeight:1.1, letterSpacing:-0.3, maxWidth:320 }}>{title}</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:'var(--ink-soft)', textAlign:'center', textWrap:'pretty', maxWidth:300, lineHeight:1.4 }}>{body}</div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:18, alignItems:'center' }}>
        <IntroDots idx={idx}/>
        <PrimaryCTA onClick={()=>go(next)} color="var(--coral)">Next</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
