import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import MiniProgress from '../components/MiniProgress';

export default function UnitPage({ go, robotProps }){
  const lessons = [
    { id:1, title:'Hello!',           icon:'👋', state:'done' },
    { id:2, title:'I am happy',       icon:'😊', state:'done' },
    { id:3, title:'How are you?',     icon:'🙂', state:'current' },
    { id:4, title:"I'm fine",         icon:'👍', state:'locked' },
    { id:5, title:'Goodbye',          icon:'👋', state:'locked' },
  ];
  return (
    <PageScroll bg="linear-gradient(180deg, #FFE6DD 0%, var(--cream) 50%)">
      <PageHeader
        onBack={()=>go('level')}
        subtitle="Unit 3"
        title="How are you?"
      />
      <div style={{ padding:'4px 24px 16px' }}>
        <div style={{
          background:'#fff', borderRadius:24, padding:'18px',
          display:'flex', alignItems:'center', gap:14,
          boxShadow:'0 2px 0 rgba(0,0,0,.05), 0 8px 18px rgba(0,0,0,.04)'
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink-soft)' }}>2 of 5 done</div>
            <div style={{ marginTop:6 }}><MiniProgress value={0.4}/></div>
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <span style={{ background:'var(--mint-soft)', color:'#1F8A5B', padding:'4px 10px', borderRadius:10, fontFamily:'var(--body)', fontWeight:700, fontSize:12 }}>3 words</span>
              <span style={{ background:'var(--sky-soft)', color:'#0E5A92', padding:'4px 10px', borderRadius:10, fontFamily:'var(--body)', fontWeight:700, fontSize:12 }}>2 phrases</span>
            </div>
          </div>
          <Robot emotion="happy" size={86} {...robotProps}/>
        </div>
      </div>

      <div style={{ padding:'8px 18px 40px', display:'flex', flexDirection:'column', gap:12 }}>
        {lessons.map(l=>(
          <button key={l.id} disabled={l.state==='locked'} onClick={()=>go('lesson_detail')} style={{
            border:'none', cursor: l.state==='locked'?'default':'pointer',
            background:'#fff', borderRadius:22, padding:'14px',
            display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 2px 0 rgba(0,0,0,.05), 0 6px 14px rgba(0,0,0,.04)',
            opacity: l.state==='locked'? .6:1,
            textAlign:'left',
          }}>
            <div style={{
              width:54, height:54, borderRadius:'50%', flexShrink:0,
              background: l.state==='done'? 'var(--mint)' : l.state==='current'? 'var(--coral)':'#E5E0D6',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'#fff',
              boxShadow: l.state==='current'? '0 0 0 4px #fff, 0 0 0 8px var(--coral-soft)':'none'
            }}>
              {l.state==='done' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
              ) : l.state==='locked' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth="2.5" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              ) : <span>{l.icon}</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>Lesson {l.id}</div>
              <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>{l.title}</div>
            </div>
            {l.state==='current' && (
              <span style={{ background:'var(--coral)', color:'#fff', padding:'6px 12px', borderRadius:999, fontFamily:'var(--display)', fontWeight:800, fontSize:12 }}>NOW</span>
            )}
            {l.state==='done' && (
              <button onClick={(e)=>{e.stopPropagation(); go('review_entry');}} style={{
                background:'transparent', border:'2px solid var(--mint)', color:'#1F8A5B',
                padding:'6px 12px', borderRadius:999, fontFamily:'var(--display)', fontWeight:700, fontSize:12, cursor:'pointer'
              }}>Replay</button>
            )}
          </button>
        ))}
      </div>
    </PageScroll>
  );
}
