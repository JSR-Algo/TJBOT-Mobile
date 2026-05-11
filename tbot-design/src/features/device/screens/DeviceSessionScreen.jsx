import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import { DV } from '@/components/Device-tokens';

export default function DeviceSessionPage({ go, tweaks }){
  const [lcdState, setLcd] = React.useState('listen');
  React.useEffect(()=>{
    // simple loop demo: listen → think → speak → listen
    const seq = ['listen','think','speak','success','listen'];
    let i = 0;
    const t = setInterval(()=>{ i = (i+1) % seq.length; setLcd(seq[i]); }, 2200);
    return ()=>clearInterval(t);
  }, []);
  const stateLabel = { listen:'Listening to your child', think:'Thinking', speak:'Robot is speaking', success:'Got the word!' }[lcdState] || 'Active';

  return (
    <DvShell title="Lesson in progress" onBack={()=>go('dv_home')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:'#1A1A1F', borderRadius:18, padding:'18px 18px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>Live · what Robot sees</div>
          <RobotDevice emotion={lcdState} size={200} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ fontSize:16, fontWeight:600, color:'#fff', marginTop:6 }}>{stateLabel}</div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Now playing</div>
          <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>Unit 2 · Animals</div>
          <div style={{ fontSize:13, color:DV.ink2, marginTop:2 }}>Lesson 4 · about 2 minutes left</div>
          <div style={{ marginTop:10, height:6, background:'#EEF1F5', borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:'62%', height:'100%', background:DV.accent }}/>
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔉" title="Lower volume" body="Currently: 6 of 10"/>
          <DvRow icon="⏸️" title="Pause Robot" body="Robot will wait until you resume"/>
          <DvRow danger icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>} title="End lesson" body="Robot will say goodbye"/>
        </div>
      </div>

      <div style={{ padding:'14px 20px 30px', fontSize:12, color:DV.ink3, textAlign:'center', lineHeight:1.5 }}>
        Audio stays between Robot and your child. Recordings are not saved.
      </div>
    </DvShell>
  );
}
