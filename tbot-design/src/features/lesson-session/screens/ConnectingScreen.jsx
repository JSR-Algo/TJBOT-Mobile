import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import WaveBars from '@/design-system/components/WaveBars';

export default function ConnectingPage({ go, robotProps }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('greeting'), 1800); return ()=>clearTimeout(t); },[]);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 100%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
        <Robot emotion="curious" size={220} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:26, color:'var(--ink)' }}>Tuning in…</div>
        <WaveBars color="var(--sky)" height={28} count={10}/>
      </div>
    </ScreenShell>
  );
}
