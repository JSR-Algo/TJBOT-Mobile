import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';

export default function HowItWorksPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const steps = [
    { n:1, t:'Robot talks and listens', b:'A short greeting, a question, a game. Robot speaks with warmth and waits patiently.', emo:'speak', side:'robot' },
    { n:2, t:'Your child practices speaking', b:'They answer out loud. Robot celebrates effort, gently revisits tricky words.', emo:'listen', side:'child' },
    { n:3, t:'You see a calm summary', b:'Words your child played with today. No transcripts, no recordings.', emo:'happy', side:'parent' },
  ];
  return (
    <DvShell title="How it works" onBack={()=>go('pr_intro')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={1} total={3}/>
      </div>
      <div style={{ padding:'24px 24px 0' }}>
        <div style={{ fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textWrap:'pretty', lineHeight:1.2 }}>
          Three small parts, one calm rhythm
        </div>
      </div>

      <div style={{ padding:'20px 16px 0', display:'flex', flexDirection:'column', gap:12 }}>
        {steps.map(s=>(
          <div key={s.n} style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, padding:'16px 16px', display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background: PR.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>{s.n}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, color:PR.ink }}>{s.t}</div>
              <div style={{ fontSize:13, color:PR.ink2, marginTop:4, lineHeight:1.5, textWrap:'pretty' }}>{s.b}</div>
              <div style={{ marginTop:10, background:'#0E1116', borderRadius:10, padding:6, display:'inline-block' }}>
                <LCDFace emotion={s.emo} size={88} accent={accent}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_included')}>What's included</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_intro')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}
