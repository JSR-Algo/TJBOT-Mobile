import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function LessonSummaryPage({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <div style={{ padding:'80px 24px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:14, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.5 }}>Lesson done</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:32, color:'var(--ink)', textAlign:'center', lineHeight:1.1 }}>Great effort!</div>
        <Robot emotion="success" size={200} accent="var(--sun)" {...robotProps}/>
      </div>
      <div style={{ padding:'4px 24px 14px' }}>
        <div style={{ background:'#fff', borderRadius:24, padding:'18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { icon:'🎤', label:'You tried', value:'8 English turns' },
              { icon:'⭐', label:'Earned',    value:'12 stars' },
              { icon:'📚', label:'Words',     value:'3 new friends' },
            ].map((r,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:14, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{r.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>{r.label}</div>
                  <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding:'8px 24px 28px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)">Keep going →</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          width:'100%', minHeight:56, borderRadius:'var(--r-button)', border:'2px solid rgba(0,0,0,.08)',
          background:'transparent', color:'var(--ink-soft)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>Stop for today</button>
      </div>
    </PageScroll>
  );
}
