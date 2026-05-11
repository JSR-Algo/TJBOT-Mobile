import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import CL from '../components/CL';

export default function CompanionPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [phase, setPhase] = React.useState(2); // 0..4
  const phases = [
    { lcd:'speak',  label:'Robot is speaking', time:'00:42' },
    { lcd:'listen', label:'Robot is listening', time:'00:51' },
    { lcd:'think',  label:'Robot is thinking', time:'00:55' },
    { lcd:'success',label:'Robot heard them!',  time:'01:02' },
    { lcd:'happy',  label:'Robot is celebrating', time:'01:08' },
  ];
  React.useEffect(()=>{
    const t = setTimeout(()=>setPhase(p => (p+1) % phases.length), 1800);
    return ()=>clearTimeout(t);
  }, [phase]);
  const cur = phases[phase];

  return (
    <DvShell title="What Robot sees" onBack={()=>go('cl_running')}>
      <div style={{ padding:'14px 20px 0', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        A live mirror of Robot's face. <b style={{ color:CL.ink }}>No transcript</b> — what your child says stays between them.
      </div>

      {/* Big LCD mirror */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:'#0E1116', borderRadius:18, padding:'18px 18px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600, alignSelf:'flex-start' }}>
            <span style={{ width:7, height:7, borderRadius:4, background:'#EF5454', animation:'cl-blink 1s ease-in-out infinite' }}/>
            Live · {cur.time}
          </div>
          <LCDFace emotion={cur.lcd} size={220} accent={accent}/>
          <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginTop:4 }}>{cur.label}</div>
        </div>
      </div>

      {/* Lesson progress */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>Animals at home</div>
            <div style={{ fontSize:11, color:CL.ink2, fontVariantNumeric:'tabular-nums' }}>3 / 8 turns</div>
          </div>
          <div style={{ height:8, borderRadius:4, background:'#EEF1F5', overflow:'hidden' }}>
            <div style={{ width:'37%', height:'100%', background:`linear-gradient(90deg, ${CL.accent}, ${accent})`, borderRadius:4 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:CL.ink2, marginTop:8 }}>
            <div>About 2 minutes left</div>
            <div>Words: 4 of 10</div>
          </div>
        </div>
      </div>

      {/* Calm controls — parent only, no scary "stop" */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>If you need to</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔉" title="Turn volume down" body="Currently at 6 of 10"/>
          <DvRow icon="⏸️" title="Pause Robot gently" body="Robot will say 'Let's take a quick break'"/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}
