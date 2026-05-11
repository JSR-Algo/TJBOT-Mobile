import React from 'react';
import Robot from '@/design-system/components/Robot';
import WaveBars from '@/design-system/components/WaveBars';
import IntroFrame from '../components/IntroFrame';

export default function IntroSpeakPage({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={1} prev="onb_intro_listen" next="onb_intro_retry"
      accentBg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)"
      kicker="How it works · 2"
      title="Robot speaks back"
      body="Robot replies out loud, so kids hear how words really sound."
      illo={(
        <div style={{ position:'relative', width:240, height:200, display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
          <Robot emotion="speak" size={160} accent="var(--mint)" {...robotProps}/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ background:'#fff', padding:'8px 12px', borderRadius:14, fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>"Hello!"</div>
            <WaveBars count={8} color="var(--mint)" height={26}/>
          </div>
        </div>
      )}/>
  );
}
