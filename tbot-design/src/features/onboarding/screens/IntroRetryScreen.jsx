import React from 'react';
import Robot from '@/design-system/components/Robot';
import IntroFrame from '../components/IntroFrame';

export default function IntroRetryPage({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={2} prev="onb_intro_speak" next="onb_intro_celebrate"
      accentBg="linear-gradient(180deg, #FFF1D6 0%, var(--cream) 60%)"
      kicker="How it works · 3"
      title="It's okay to try again"
      body="If a word is tricky, Robot says it once more — slowly, with no pressure."
      illo={(
        <div style={{ position:'relative', width:240, height:200, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
          <Robot emotion="gentle" size={160} accent="var(--sun)" {...robotProps}/>
          <div style={{
            background:'#fff', padding:'10px 14px', borderRadius:18,
            fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)',
            boxShadow:'0 2px 8px rgba(0,0,0,.06)', display:'flex', alignItems:'center', gap:8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sun)" strokeWidth="2.4" strokeLinecap="round"><path d="M3 12a9 9 0 1015-6.7L21 8M21 3v5h-5"/></svg>
            Once more!
          </div>
        </div>
      )}/>
  );
}
