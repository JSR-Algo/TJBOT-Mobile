import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function ExitConfirmPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>{}}/>
      <div style={{ position:'absolute', inset:0, background:'rgba(43,33,64,0.45)', backdropFilter:'blur(4px)' }}/>
      <div style={{ position:'absolute', left:20, right:20, bottom:30, background:'#fff', borderRadius:32, padding:'28px 24px', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display:'flex', justifyContent:'center', marginTop:-90 }}>
          <Robot emotion="sad" size={140} accent="var(--coral)" {...robotProps}/>
        </div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:26, color:'var(--ink)', textAlign:'center', marginTop:6 }}>
          Stop the lesson?
        </div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:16, color:'var(--ink-soft)', textAlign:'center', marginTop:6, marginBottom:22 }}>
          We can finish later.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--mint)">Keep playing</PrimaryCTA>
          <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
            width:'100%', minHeight:56, borderRadius:'var(--r-button)', border:'2px solid rgba(0,0,0,.08)',
            background:'transparent', color:'var(--ink-soft)',
            fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
          }}>Stop for now</button>
        </div>
      </div>
    </ScreenShell>
  );
}
