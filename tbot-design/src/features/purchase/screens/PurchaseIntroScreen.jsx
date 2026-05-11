import React from 'react';
import { PR } from '../components/tokens';
import RobotHero from '../components/RobotHero';
import PRChip from '../components/PRChip';

export default function PurchaseIntroPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Meet Robot" onBack={()=>go('dv_home')}>
      <div style={{ padding:'18px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotHero size={220} accent={accent}/>
        <div style={{ marginTop:14 }}><PRChip>A gentle English buddy</PRChip></div>
        <div style={{ marginTop:14, fontSize:30, fontWeight:600, color:PR.ink, letterSpacing:-0.6, textAlign:'center', textWrap:'pretty', lineHeight:1.1 }}>
          A small robot that helps your child practice spoken English
        </div>
        <div style={{ marginTop:10, fontSize:14, color:PR.ink2, textAlign:'center', maxWidth:320, lineHeight:1.55, textWrap:'pretty' }}>
          4 minutes a day. Just talking. No screens, no pressure, no scores.
        </div>
      </div>

      <div style={{ padding:'28px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, padding:'4px 4px' }}>
          {[
            { ic:'🎙️', t:'Built for spoken English', b:'Robot is a patient listener — kids speak out loud, not type.' },
            { ic:'🪶', t:'Calm, never pushy', b:'No streaks, no badges that hurt to lose. Just steady warmth.' },
            { ic:'👨‍👩‍👧', t:'Designed with parents', b:'You set the courses. Your child sees only what you choose.' },
          ].map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:14, padding:'14px 14px', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_how')}>See how it works</DvBigBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('pr_privacy');}} style={{ background:'transparent', border:'none', fontSize:13, color:PR.ink2, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:8 }}>Privacy & safety first</button>
      </div>
    </DvShell>
  );
}
