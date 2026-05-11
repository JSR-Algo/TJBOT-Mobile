import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import { DV } from '@/components/Device-tokens';

export default function PairConnectingPage({ go, tweaks }){
  const steps = ['Sending Wi-Fi to Robot', 'Connecting to Casa-Familia', 'Logging in to your account', 'Loading starter lesson'];
  const [i, setI] = React.useState(0);
  React.useEffect(()=>{
    if (i < steps.length-1){ const t = setTimeout(()=>setI(i+1), 900); return ()=>clearTimeout(t); }
    const t = setTimeout(()=>go('dv_pair_success'), 1100);
    return ()=>clearTimeout(t);
  }, [i]);
  return (
    <DvShell title="Connecting Robot…">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={180} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:24, fontSize:18, fontWeight:600, textAlign:'center' }}>
          Hang tight — about 30 seconds
        </div>
      </div>
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {steps.map((s, idx)=>(
          <div key={s} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12 }}>
            <div style={{ width:22, height:22, borderRadius:11, background: idx<i? DV.good : idx===i? DV.accent : '#EEF1F5',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {idx<i ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
                : idx===i ? <div style={{ width:8, height:8, borderRadius:4, background:'#fff', animation:'pair-blink 0.9s ease-in-out infinite' }}/>
                : <div style={{ width:6, height:6, borderRadius:3, background:DV.ink3 }}/> }
            </div>
            <div style={{ fontSize:14, color: idx<=i ? DV.ink : DV.ink3 }}>{s}</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pair-blink { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </DvShell>
  );
}
