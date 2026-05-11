import React from 'react';
import { PA } from '../components/palette';
import ParentScroll from '../components/ParentScroll';

export default function ParentHistoryPage({ go }){
  // 30 days of synthetic summaries
  const days = React.useMemo(()=>{
    const out = [];
    const verbs = ['Greetings & feelings','Family words','Numbers 1–10','Animals','Daily routines','Color words','Food vocabulary','Polite phrases'];
    for (let i=0; i<30; i++){
      const active = i % 7 !== 5; // weekend skip pattern
      const min = 4 + ((i*3)%9);
      const turns = 5 + ((i*7)%10);
      const date = new Date(); date.setDate(date.getDate()-i);
      out.push({
        i,
        date,
        active,
        min,
        turns,
        topic: verbs[i % verbs.length],
      });
    }
    return out;
  }, []);

  // group by week
  const fmtDay = d => d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });

  return (
    <ParentScroll title="Past 30 days" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'14px 16px 4px' }}>
        <div style={{ display:'flex', gap:14, fontSize:13, color:PA.ink2 }}>
          <div><b style={{ color:PA.ink, fontWeight:600 }}>22</b> active days</div>
          <div style={{ width:1, background:PA.hair }}/>
          <div><b style={{ color:PA.ink, fontWeight:600 }}>2h 48m</b> total</div>
          <div style={{ width:1, background:PA.hair }}/>
          <div><b style={{ color:PA.ink, fontWeight:600 }}>14</b> lessons</div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 28px' }}>
        <div style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:14, overflow:'hidden' }}>
          {days.map((d, i)=>(
            <div key={d.i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              borderBottom: i===days.length-1? 'none' : `1px solid ${PA.hair}`,
              opacity: d.active? 1 : 0.55,
            }}>
              {/* day chip */}
              <div style={{
                width:42, flexShrink:0, textAlign:'center', padding:'6px 0',
                background: d.active? '#EEF1F5':'transparent',
                borderRadius:8,
              }}>
                <div style={{ fontSize:10, color:PA.ink3, textTransform:'uppercase', letterSpacing:0.5, fontWeight:600 }}>
                  {d.date.toLocaleDateString(undefined,{ month:'short' })}
                </div>
                <div style={{ fontSize:16, fontWeight:600, color:PA.ink, fontVariantNumeric:'tabular-nums', lineHeight:1.1 }}>
                  {d.date.getDate()}
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, color: d.active? PA.ink : PA.ink3, fontWeight: d.active? 500: 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {d.active? d.topic : 'No practice'}
                </div>
                {d.active && (
                  <div style={{ fontSize:12, color:PA.ink2, marginTop:2 }}>
                    {d.min} min · {d.turns} speaking turns
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:PA.ink3, padding:'10px 4px 0', lineHeight:1.5 }}>
          Daily summaries are kept for 30 days, then deleted automatically.
        </div>
      </div>
    </ParentScroll>
  );
}
