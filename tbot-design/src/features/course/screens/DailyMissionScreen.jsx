import React from 'react';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';

export default function DailyMissionPage({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, #FFD9B0 0%, var(--cream-2) 70%)">
      <PageHeader
        onBack={()=>go('home_hub_idle')}
        right={<div style={{ background:'#fff', padding:'8px 12px', borderRadius:999, fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)', boxShadow:'0 2px 6px rgba(0,0,0,.05)'}}>🔥 5 day</div>}
        subtitle="Today's mission"
        title="Make Robot smile"
      />

      <div style={{ padding:'4px 24px 16px', display:'flex', justifyContent:'center' }}>
        <Robot emotion="happy" size={180} accent="var(--coral)" {...robotProps}/>
      </div>

      {/* checklist */}
      <div style={{ padding:'4px 24px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        {[
          { done:true,  icon:'📚', title:"Today's lesson",     sub:'Lesson 3 — How are you?' },
          { done:false, icon:'🔁', title:'Review 4 words',     sub:'Quick 2-min refresh' },
          { done:false, icon:'🎮', title:'Play a word game',   sub:'1 mini-game' },
        ].map((m,i)=>(
          <div key={i} style={{
            background:'#fff', borderRadius:20, padding:'14px',
            display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{
              width:44, height:44, borderRadius:'50%', flexShrink:0,
              background: m.done? 'var(--mint)': '#FFE6CC',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff',
            }}>
              {m.done ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
              ) : <span>{m.icon}</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:17, color: m.done?'var(--ink-soft)':'var(--ink)', textDecoration: m.done?'line-through':'none' }}>{m.title}</div>
              <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)' }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* reward */}
      <div style={{ padding:'10px 24px 16px' }}>
        <div style={{
          background:'#fff', borderRadius:24, padding:'16px',
          display:'flex', alignItems:'center', gap:14,
          boxShadow:'0 2px 6px rgba(0,0,0,.05)',
        }}>
          <div style={{ width:54, height:54, borderRadius:18, background:'var(--sun)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>🎁</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:17, color:'var(--ink)' }}>Finish all 3</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>+50 stars · new sticker</div>
          </div>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:14, color:'var(--mint)' }}>1/3</div>
        </div>
      </div>

      <div style={{ padding:'4px 24px 30px' }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Continue Mission</PrimaryCTA>
      </div>
    </PageScroll>
  );
}
