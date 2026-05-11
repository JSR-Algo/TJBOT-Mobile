import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function ReconnectingOverlay({ go, robotProps }){
  React.useEffect(()=>{
    const t = setTimeout(()=>go('robot_listening'), 2400);
    return ()=>clearTimeout(t);
  }, []);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      {/* faded background hint of lesson */}
      <div style={{ position:'absolute', inset:0, opacity:0.35, pointerEvents:'none' }}>
        <TopBar/>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Robot emotion="idle" size={180} {...robotProps}/>
        </div>
      </div>

      {/* dimmer */}
      <div style={{ position:'absolute', inset:0, background:'rgba(43,33,64,0.45)', backdropFilter:'blur(4px)' }}/>

      {/* card */}
      <div style={{
        position:'absolute', left:24, right:24, top:'50%', transform:'translateY(-50%)',
        background:'#fff', borderRadius:28, padding:'28px 22px',
        boxShadow:'0 20px 60px rgba(0,0,0,.25)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14,
      }}>
        <Robot emotion="worry" size={140} accent="var(--plum)" {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, color:'var(--ink)', textAlign:'center' }}>
          I'm trying to connect again…
        </div>
        <div style={{ display:'flex', gap:6, marginTop:2 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width:10, height:10, borderRadius:5, background:'var(--plum)',
              animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite` }}/>
          ))}
        </div>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          marginTop:6, background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>Stop and go home</button>
      </div>
    </ScreenShell>
  );
}
