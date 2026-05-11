import React from 'react';
import { PR } from '../components/tokens';
import PRChip from '../components/PRChip';

export default function PrivacyPage({ go, tweaks }){
  const rows = [
    { ic:'🎙️', t:"We don't save audio", b:"What your child says is processed in real time and discarded. There is no transcript stored." },
    { ic:'🚫', t:'No ads, ever', b:'Robot will never show, mention, or hint at advertising — at any age, in any course.' },
    { ic:'🔒', t:'Parent-only purchases', b:"Buying Robot, adding courses, or upgrading always passes through a parent gate." },
    { ic:'🌐', t:'Stops if Robot is offline', b:'Robot only listens during a lesson, and a lesson can only start with your Wi-Fi.' },
    { ic:'📁', t:'Easy data export & delete', b:"Download or wipe your child's summary history with one tap, anytime." },
    { ic:'🇺🇸', t:'COPPA & GDPR-K compliant', b:"Independently audited. Reports available in Settings → Safety & Privacy." },
  ];
  return (
    <DvShell title="What we promise parents" onBack={()=>go('pr_subs')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRChip color={PR.good} bg="#E6F4EE">Privacy first · always</PRChip>
        <div style={{ marginTop:14, fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textWrap:'pretty', lineHeight:1.2 }}>
          Your child's voice stays your child's
        </div>
      </div>

      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, overflow:'hidden' }}>
          {rows.map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:14, padding:'13px 16px', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'#E6F4EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_checkout')}>I'm ready · go to checkout</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_subs')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}
