import React from 'react';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';

export default function TrustPage({ go }){
  const promises = [
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>),
      title:'Voice stays in the lesson', body:"Audio is processed during the lesson and discarded. We don't keep recordings." },
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>),
      title:'Short, focused sessions', body:'Designed for a few minutes a day. No streaks that pressure your child to keep playing.' },
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>),
      title:'No social, no chat, no ads', body:'No other kids, no messages, no advertising. Just your child and Robot.' },
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>),
      title:'You stay in control', body:'Settings, data, and subscription live behind a parent gate the child cannot solve.' },
  ];
  return (
    <OnbShell title="Our promise" onBack={()=>go('onb_intro_celebrate')}>
      <div style={{ padding:'18px 20px 8px' }}>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, marginBottom:6, textWrap:'pretty' }}>
          Made for kids 6–10. Designed with parents.
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5 }}>
          Before we set things up, here's how we treat your child's privacy and time.
        </div>
      </div>
      <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {promises.map((p,i)=>(
          <div key={i} style={{ background:OB.card, border:`1px solid ${OB.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'#EEF1F5', color:OB.ink, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {p.icon}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:OB.ink, marginBottom:3 }}>{p.title}</div>
              <div style={{ fontSize:13, color:OB.ink2, lineHeight:1.45, textWrap:'pretty' }}>{p.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'14px 20px 6px', fontSize:12, color:OB.ink3, lineHeight:1.5 }}>
        Full details any time in <span style={{ color:OB.accent, fontWeight:500 }}>Parent Space → Safety & Privacy</span>.
      </div>
      <div style={{ padding:'14px 20px 30px' }}>
        <OnbBigBtn onClick={()=>go('onb_mic')}>Continue</OnbBigBtn>
      </div>
    </OnbShell>
  );
}
