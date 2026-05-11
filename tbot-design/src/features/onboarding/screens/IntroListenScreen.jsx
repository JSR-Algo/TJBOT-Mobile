import React from 'react';
import Robot from '@/design-system/components/Robot';
import PulseRing from '@/design-system/components/PulseRing';
import IntroFrame from '../components/IntroFrame';

export default function IntroListenPage({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={0} prev="onb_welcome" next="onb_intro_speak"
      accentBg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 60%)"
      kicker="How it works · 1"
      title="Robot listens"
      body="Kids tap the mic and speak. Robot listens patiently — no reading, no typing."
      illo={(
        <div style={{ position:'relative', width:240, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={200} color="var(--sky)"/>
          <Robot emotion="listen" size={170} accent="var(--sky)" {...robotProps}/>
        </div>
      )}/>
  );
}
