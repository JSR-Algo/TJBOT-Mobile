import React from 'react';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';

export default function IncludedPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const items = [
    { ic:'🤖', t:'Robot device', b:'3.2" LCD face, soft-touch shell, 8-hour battery' },
    { ic:'🔌', t:'Charging dock', b:'USB-C cable, magnet-aligned base' },
    { ic:'📱', t:'Parent app', b:'Free, no ads, course library and summaries' },
    { ic:'🎁', t:'Hello Friends starter course', b:'24 lessons of greetings, names, and feelings' },
    { ic:'📖', t:'Quick start booklet', b:'Setup in 5 minutes, with Spanish & English' },
    { ic:'🛡️', t:'2-year warranty', b:'Replace or refund if anything goes wrong' },
  ];
  return (
    <DvShell title="In the box" onBack={()=>go('pr_how')}>
      <div style={{ padding:'18px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <PRStepTab step={2} total={3}/>
        <div style={{ marginTop:18, fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Everything to start tomorrow
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, overflow:'hidden' }}>
          {items.map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:14, padding:'14px 16px', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:PR.warm, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 20px 0', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        Hardware is yours. The starter course is included forever.
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_bundle')}>Choose a bundle</DvBigBtn>
      </div>
    </DvShell>
  );
}
