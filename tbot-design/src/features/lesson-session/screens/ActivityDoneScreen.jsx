import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function ActivityDonePage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.6} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:38, color:'var(--mint)' }}>Activity done!</div>
        <Robot emotion="success" size={220} accent="var(--sun)" {...robotProps}/>
        <div style={{ display:'flex', gap:14 }}>
          {['🐱','🐶','🐰'].map((e,i)=>(
            <div key={i} style={{
              width:64, height:64, borderRadius:18, background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
              boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.06)',
              border:'3px solid var(--mint)'
            }}>{e}</div>
          ))}
        </div>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:16, color:'var(--ink-soft)' }}>3 new word friends!</div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--coral)">Keep going →</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
