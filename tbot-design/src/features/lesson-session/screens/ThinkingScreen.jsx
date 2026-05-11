import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';

export default function ThinkingPage({ go, robotProps }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('success'), 1600); return ()=>clearTimeout(t); },[]);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:24 }}>
        <Robot emotion="think" size={220} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:'var(--t-body)', color:'var(--ink-soft)' }}>Thinking…</div>
      </div>
    </ScreenShell>
  );
}
