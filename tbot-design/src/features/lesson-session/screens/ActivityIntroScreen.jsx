import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

function ProgressDots({ total=5, current=2 }){
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{
          width: i===current? 28:12, height:12, borderRadius:8,
          background: i<current? 'var(--mint)' : i===current? 'var(--coral)' : 'rgba(0,0,0,.1)',
          transition:'all .3s'
        }}/>
      ))}
    </div>
  );
}

export default function ActivityIntroPage({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.15} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', top:120, left:0, right:0, display:'flex', justifyContent:'center' }}>
        <ProgressDots total={5} current={0}/>
      </div>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'160px 24px 200px', gap:18 }}>
        <div style={{
          background:'#fff', padding:'10px 18px', borderRadius:999,
          fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--coral)',
          letterSpacing:1, textTransform:'uppercase'
        }}>Activity 1 of 5</div>
        <Robot emotion="happy" size={200} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', textAlign:'center', color:'var(--ink)', textWrap:'pretty' }}>
          Let's name some animals!
        </div>
        <div style={{ display:'flex', gap:14, fontSize:48 }}>
          <span>🐱</span><span>🐶</span><span>🐰</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--coral)">Start</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
