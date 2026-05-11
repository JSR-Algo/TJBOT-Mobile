import React from 'react';
import IntroFrame from '../components/IntroFrame';

export default function IntroCelebratePage({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={3} prev="onb_intro_retry" next="onb_trust"
      accentBg="linear-gradient(180deg, var(--sun) 0%, var(--cream-2) 70%)"
      kicker="How it works · 4"
      title="Small wins, every day"
      body="Each lesson is short and ends with a celebration. Built for 3–5 minutes a day."
      illo={(
        <div style={{ position:'relative', width:240, height:170, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          {['🐱','🐶','🐰'].map((e,i)=>(
            <div key={i} style={{ width:60, height:60, borderRadius:18, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
              boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.06)', border:'3px solid var(--coral)',
              animation:`splash-pop .5s ease ${i*0.15}s both` }}>{e}</div>
          ))}
        </div>
      )}/>
  );
}
