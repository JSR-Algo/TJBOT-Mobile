import React from 'react';
import { PR } from '../components/tokens';
import RobotHero from '../components/RobotHero';
import PRChip from '../components/PRChip';

export default function ArrivedPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot is here">
      <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotHero size={220} accent={accent}/>
        <div style={{ marginTop:14 }}><PRChip color={PR.good} bg="#E6F4EE">📦 Delivered today</PRChip></div>
        <div style={{ marginTop:14, fontSize:28, fontWeight:600, color:PR.ink, letterSpacing:-0.5, textAlign:'center', textWrap:'pretty', lineHeight:1.15 }}>
          Your Robot has arrived
        </div>
        <div style={{ marginTop:8, fontSize:14, color:PR.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Setup takes about 5 minutes. Find a quiet spot and a nearby outlet.
        </div>
      </div>

      <div style={{ padding:'30px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📦" title="1. Open the box" body="Robot, charging dock, USB-C cable"/>
          <DvRow icon="🔌" title="2. Plug in the dock" body="Place Robot on it — a soft chime means hello"/>
          <DvRow icon="📶" title="3. Connect to your Wi-Fi" body="We'll guide you screen-by-screen"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:PR.warm, borderRadius:12, padding:'12px 14px', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
          Setting up later? Robot will wait quietly in its box.
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_activate')}>Set up Robot now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Later tonight</DvBigBtn>
      </div>
    </DvShell>
  );
}
