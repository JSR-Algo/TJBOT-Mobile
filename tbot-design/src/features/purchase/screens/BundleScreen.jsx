import React from 'react';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';

export default function BundlePage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [pick, setPick] = React.useState(0);
  const opts = [
    { id:'robot',   tag:'Most parents pick this', tagColor:PR.good, title:'Robot + Hello Friends', body:'Robot device and your first course. Add more later, only if you want.', price:'$149', sub:'one-time · ships free' },
    { id:'family',  tag:'Saves more',             tagColor:PR.accent, title:'Robot + All Courses (1 year)', body:'Robot device and every course for a year. Cancel anytime.', price:'$219', sub:'$149 hardware + $70 first year' },
  ];
  return (
    <DvShell title="Pick your bundle" onBack={()=>go('pr_included')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
      </div>

      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {opts.map((o, i)=>{
          const sel = i===pick;
          return (
            <button key={o.id} onClick={(e)=>{e.stopPropagation(); setPick(i);}} style={{
              background: sel? '#E8F0FE' : PR.card, border: sel? `2px solid ${PR.accent}` : `1px solid ${PR.hair}`,
              borderRadius:16, padding:'14px 14px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:o.tagColor, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{o.tag}</div>
                  <div style={{ fontSize:15, fontWeight:600, color:PR.ink }}>{o.title}</div>
                  <div style={{ fontSize:12, color:PR.ink2, lineHeight:1.45, marginTop:3, textWrap:'pretty' }}>{o.body}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:PR.ink, letterSpacing:-0.3 }}>{o.price}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:PR.ink3, marginTop:8 }}>{o.sub}</div>
              {/* Mini contents */}
              <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:5 }}>
                {(i===0 ? ['Robot','Dock','Hello Friends','App'] : ['Robot','Dock','5 courses','New courses included','App']).map(t=>(
                  <span key={t} style={{ background:'#EEF1F5', color:PR.ink2, fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6 }}>{t}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding:'18px 20px 0', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        Both bundles include free shipping and a 30-day return.
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_subs')}>Continue</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_included')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}
