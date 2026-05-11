import React from 'react';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';

export default function SubscriptionsPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [pick, setPick] = React.useState('none');
  const opts = [
    { id:'none', tag:'No subscription', body:"Stick with Hello Friends. You can add courses one at a time later.", price:'Free', sub:'Always an option' },
    { id:'all',  tag:'All Courses',     body:'Every course on your Robot, including new ones we add.', price:'$8.99', sub:'/ month · 7-day free trial' },
    { id:'pack', tag:'Starter pack',    body:'Hello Friends, Animals, Yummy Words — once, yours forever.', price:'$48', sub:'one-time · save $24' },
  ];
  return (
    <DvShell title="Add courses?" onBack={()=>go('pr_bundle')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:PR.ink, letterSpacing:-0.3, textWrap:'pretty', lineHeight:1.2 }}>
          Optional · skip if you'd rather wait
        </div>
        <div style={{ marginTop:6, fontSize:13, color:PR.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          Robot already comes with the Hello Friends course. Add more only if you want — you can change this anytime.
        </div>
      </div>

      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {opts.map(o=>{
          const sel = pick===o.id;
          return (
            <button key={o.id} onClick={(e)=>{e.stopPropagation(); setPick(o.id);}} style={{
              background: sel? '#E8F0FE' : PR.card, border: sel? `2px solid ${PR.accent}` : `1px solid ${PR.hair}`,
              borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left',
              display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:22, height:22, borderRadius:11, border: sel? 'none' : `2px solid ${PR.hair}`,
                background: sel? PR.accent : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>{o.tag}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:PR.ink, letterSpacing:-0.2 }}>{o.price}</div>
                </div>
                <div style={{ fontSize:12, color:PR.ink2, lineHeight:1.5, marginTop:3, textWrap:'pretty' }}>{o.body}</div>
                <div style={{ fontSize:11, color:PR.ink3, marginTop:5 }}>{o.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding:'18px 20px 0', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        Your child never sees prices. Subscriptions are managed only here.
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_privacy')}>Continue</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_bundle')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}
