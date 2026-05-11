import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import DvBigBtn from '@/components/DeviceBigBtn';
import { RM } from '../components/styles';

export default function MicTestPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [phase, setPhase] = React.useState('idle'); // idle | listening | done
  const [level, setLevel] = React.useState(0);

  React.useEffect(()=>{
    if (phase!=='listening') return;
    let t = 0;
    const id = setInterval(()=>{
      t += 1;
      setLevel(0.3 + 0.7*Math.abs(Math.sin(t*0.6)));
      if (t > 14) { clearInterval(id); setPhase('done'); setLevel(0); }
    }, 120);
    return ()=>clearInterval(id);
  }, [phase]);

  const bars = 14;

  return (
    <DvShell title="Microphone test" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8 }}>
          <LCDFace emotion={phase==='listening'?'listening' : phase==='done'?'happy':'idle'} size={140} accent={accent}/>
        </div>

        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center' }}>
          {phase==='idle' && 'Can Robot hear you?'}
          {phase==='listening' && 'Speak in your normal voice'}
          {phase==='done' && "Robot heard you clearly"}
        </div>
        <div style={{ marginTop:6, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          {phase==='idle' && 'Stand about an arm\'s length from Robot, then tap Start.'}
          {phase==='listening' && 'Try saying "Hello, Robot!"'}
          {phase==='done' && 'You can run this test anytime if Robot seems quiet.'}
        </div>
      </div>

      {/* Level meter */}
      <div style={{ padding:'30px 30px 0', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:5, height:90 }}>
        {Array.from({length:bars}).map((_, i)=>{
          const dist = Math.abs(i - bars/2 + 0.5) / (bars/2);
          const h = phase==='listening'
            ? 6 + (1 - dist*0.6) * level * 70
            : phase==='done' ? 6 + (1-dist*0.6)*22 : 6;
          return (
            <div key={i} style={{ width:7, height: h, borderRadius:4,
              background: phase==='done' ? RM.good : phase==='listening' ? RM.accent : '#D5D9E0',
              transition: phase==='listening' ? 'none' : 'height .25s, background .25s',
            }}/>
          );
        })}
      </div>

      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📍" title="Where Robot listens best" body="Within 6 feet, away from TVs and fans"/>
          <DvRow icon="🌬️" title="Background noise" body={phase==='done'?'Low · good for lessons':'Checking…'}/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        {phase==='idle' && <DvBigBtn onClick={()=>setPhase('listening')}>Start test</DvBigBtn>}
        {phase==='listening' && <DvBigBtn secondary>Listening…</DvBigBtn>}
        {phase==='done' && (
          <>
            <DvBigBtn onClick={()=>go('rm_my_robot')}>Looks good</DvBigBtn>
            <DvBigBtn secondary onClick={()=>setPhase('idle')}>Test again</DvBigBtn>
          </>
        )}
      </div>
    </DvShell>
  );
}
