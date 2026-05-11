import React from 'react';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';

export default function LessonListPage({ go, robotProps }){
  const lessons = [
    { id:1, title:'Hello!',         state:'done',    stars:3 },
    { id:2, title:'I am happy',     state:'done',    stars:2 },
    { id:3, title:'Good morning',   state:'review',  stars:1 },
    { id:4, title:'How are you?',   state:'current', stars:0 },
    { id:5, title:"I'm fine",       state:'locked',  stars:0 },
    { id:6, title:'Goodbye',        state:'locked',  stars:0 },
  ];
  return (
    <PageScroll>
      <PageHeader
        onBack={()=>go('unit')}
        subtitle="All lessons"
        title="Hello Friends"
      />
      <div style={{ padding:'4px 18px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        {lessons.map((l,i)=>{
          const isReview = l.state==='review';
          const isLocked = l.state==='locked';
          const isCurrent = l.state==='current';
          const isDone = l.state==='done';
          return (
            <button key={l.id} disabled={isLocked} onClick={()=>go('lesson_detail')} style={{
              cursor:isLocked?'default':'pointer',
              background:'#fff', borderRadius:22, padding:'14px',
              display:'flex', alignItems:'center', gap:14, opacity: isLocked?.6:1,
              boxShadow:'0 2px 6px rgba(0,0,0,.05)',
              textAlign:'left',
              border: isCurrent? '3px solid var(--coral)':'none',
            }}>
              <div style={{
                width:50, height:50, borderRadius:'50%', flexShrink:0,
                background: isDone? 'var(--mint)': isReview?'var(--sun)': isCurrent?'var(--coral)':'#E5E0D6',
                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--display)', fontWeight:800, fontSize:20,
              }}>
                {isLocked? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth="2.5" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg> : l.id}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:17, color:'var(--ink)' }}>{l.title}</div>
                <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                  {isDone && [0,1,2].map(s=> <span key={s} style={{ fontSize:14, opacity: s<l.stars? 1:.25 }}>⭐</span>)}
                  {isReview && <span style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'#A06900' }}>Let's review!</span>}
                  {isCurrent && <span style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--coral)' }}>Up next</span>}
                  {isLocked && <span style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)' }}>Coming soon</span>}
                </div>
              </div>
              {!isLocked && (
                <svg width="12" height="20" viewBox="0 0 14 22" fill="none" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3l8 8-8 8"/></svg>
              )}
            </button>
          );
        })}
      </div>
    </PageScroll>
  );
}
