import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import CircleBtn from '@/design-system/components/CircleBtn';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function LessonReadyPage({ go, robotProps }){
  return (
    <ScreenShell>
      <TopBar
        left={<CircleBtn size={42} onClick={()=>go('exit_confirm')} ariaLabel="exit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></CircleBtn>}
        right={<CircleBtn size={42} onClick={()=>go('home_hub_idle')} ariaLabel="home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2z"/></svg></CircleBtn>}
      />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 28px 220px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:18, color:'var(--ink-soft)', marginBottom:6 }}>Today's lesson</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--ink)', marginBottom:24 }}>Animal Friends</div>
        <Robot emotion="happy" size={240} {...robotProps}/>
        <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center', background:'#fff', padding:'8px 16px', borderRadius:999, boxShadow:'0 2px 6px rgba(0,0,0,.05)'}}>
          <span style={{ fontSize:18 }}>🎧</span>
          <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)'}}>Wear headphones if you can</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('connecting')} icon={<span style={{fontSize:26}}>▶</span>}>I'm ready!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}
