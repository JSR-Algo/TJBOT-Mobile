import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function LessonResumePage({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <TopBar onBack={()=>go('home_hub_idle')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'90px 24px 240px', gap:18 }}>
        <Robot emotion="happy" size={220} {...robotProps}/>
        <SpeechBubble>Welcome back!<br/>Want to keep going?</SpeechBubble>

        {/* lesson card */}
        <div style={{
          background:'#fff', borderRadius:24, padding:'16px 18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          display:'flex', alignItems:'center', gap:14, width:'min(320px, 90%)',
        }}>
          <div style={{ width:54, height:54, borderRadius:16, background:'var(--coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📖</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>Where we stopped</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>How are you?</div>
            <div style={{ marginTop:6, height:6, borderRadius:3, background:'rgba(0,0,0,.06)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:'60%', background:'var(--mint)', borderRadius:3 }}/>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Keep going</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Stop for now</button>
      </div>
    </ScreenShell>
  );
}
