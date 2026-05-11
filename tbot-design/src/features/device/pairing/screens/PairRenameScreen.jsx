import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairRenamePage({ go, tweaks }){
  const [buddy, setBuddy] = React.useState(2);
  const buddies = [
    { ic:'🐼', n:'Panda' }, { ic:'🦊', n:'Fox' }, { ic:'🐰', n:'Bunny' },
    { ic:'🐻', n:'Bear' }, { ic:'🐸', n:'Frog' }, { ic:'🦉', n:'Owl' },
    { ic:'🐢', n:'Turtle' }, { ic:'🐱', n:'Cat' },
  ];
  return (
    <DvShell title="Choose a Buddy">
      <div style={{ padding:'18px 20px 0', fontSize:14, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Pick the avatar your child will see on Robot's face. <b style={{ color:DV.ink }}>We don't ask for your child's name or photo.</b>
      </div>
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Buddy</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {buddies.map((b,i)=>(
            <button key={i} onClick={(e)=>{e.stopPropagation(); setBuddy(i);}} style={{
              aspectRatio:'1', borderRadius:14, background: i===buddy? '#FFF1C2' : DV.card,
              border: i===buddy? `2px solid ${tweaks?.accent || '#FF6F61'}` : `1px solid ${DV.hair}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, fontSize:28, cursor:'pointer' }}>
              <div>{b.ic}</div>
              <div style={{ fontSize:10, fontWeight:600, color:DV.ink }}>{b.n}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Robot's name (optional)</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:18 }}>🤖</div>
          <div style={{ fontSize:16, fontFamily:'inherit', color:DV.ink, flex:1 }}>Living-room Robot</div>
        </div>
        <div style={{ fontSize:12, color:DV.ink3, padding:'8px 6px', lineHeight:1.5 }}>Helpful if you have more than one Robot in the house.</div>
      </div>
      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>go('dv_pair_first_lesson')}>Save & continue</DvBigBtn>
      </div>
    </DvShell>
  );
}
