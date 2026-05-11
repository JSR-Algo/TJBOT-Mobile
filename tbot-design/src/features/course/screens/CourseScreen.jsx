import React from 'react';
import Robot from '@/design-system/components/Robot';
import CircleBtn from '@/design-system/components/CircleBtn';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import MiniProgress from '../components/MiniProgress';

export default function CoursePage({ go, robotProps }){
  const levels = [
    { id:'L1', title:'Hello Friends', subtitle:'Greetings & me', state:'current', progress:0.4, color:'var(--coral)', icon:'👋' },
    { id:'L2', title:'Animal World',  subtitle:'Animals & sounds', state:'locked',  progress:0,   color:'var(--mint)',  icon:'🐱' },
    { id:'L3', title:'My Day',        subtitle:'Daily routines',   state:'locked',  progress:0,   color:'var(--sky)',   icon:'🌤️' },
    { id:'L4', title:'Yummy Foods',   subtitle:'Food & drinks',    state:'locked',  progress:0,   color:'var(--sun)',   icon:'🍎' },
  ];
  return (
    <PageScroll>
      <PageHeader
        left={<CircleBtn size={42} onClick={()=>go('home_hub_idle')} ariaLabel="home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2z"/></svg></CircleBtn>}
        right={<div style={{ background:'#fff', padding:'8px 14px', borderRadius:999, fontFamily:'var(--display)', fontWeight:700, fontSize:15, color:'var(--ink)', boxShadow:'0 2px 6px rgba(0,0,0,.05)'}}>⭐ 124</div>}
        subtitle="My adventure"
        title="English with Robot"
      />
      <div style={{ padding:'4px 18px 28px', display:'flex', flexDirection:'column', gap:18 }}>
        {/* hero card */}
        <div style={{
          background:'linear-gradient(135deg, var(--coral) 0%, #FF9C8B 100%)',
          borderRadius:28, padding:'18px 20px', display:'flex', alignItems:'center', gap:14,
          color:'#fff', boxShadow:'0 4px 0 rgba(0,0,0,.1), 0 12px 30px rgba(255,111,97,.35)'
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:13, opacity:.9, textTransform:'uppercase', letterSpacing:1 }}>Keep going!</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, lineHeight:1.1, marginTop:2 }}>Level 1<br/>Hello Friends</div>
            <div style={{ marginTop:10, background:'rgba(255,255,255,.3)', borderRadius:10, height:10, overflow:'hidden' }}>
              <div style={{ width:'40%', height:'100%', background:'#fff', borderRadius:10 }}/>
            </div>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, marginTop:6, opacity:.95 }}>4 of 10 lessons</div>
          </div>
          <div style={{ flexShrink:0 }}><Robot emotion="happy" size={110} {...robotProps}/></div>
        </div>

        {/* level list */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {levels.map((lvl,i)=>(
            <button key={lvl.id} disabled={lvl.state==='locked'} onClick={()=>go('level')} style={{
              border:'none', cursor: lvl.state==='locked'?'default':'pointer',
              background:'#fff', borderRadius:24, padding:'16px 18px',
              display:'flex', alignItems:'center', gap:14,
              boxShadow:'0 2px 0 rgba(0,0,0,.05), 0 8px 18px rgba(0,0,0,.04)',
              opacity: lvl.state==='locked'? .55: 1,
              textAlign:'left',
            }}>
              <div style={{
                width:64, height:64, borderRadius:20, flexShrink:0,
                background: lvl.state==='locked'? '#E5E0D6': lvl.color,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
                boxShadow:'inset 0 -3px 0 rgba(0,0,0,.08)',
                filter: lvl.state==='locked'? 'saturate(.3)':'none',
              }}>
                {lvl.state==='locked'
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth="2.5" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                  : lvl.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:13, color:'var(--ink-soft)' }}>Level {i+1}</div>
                <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:20, color:'var(--ink)', lineHeight:1.1 }}>{lvl.title}</div>
                {lvl.state==='current' ? (
                  <div style={{ marginTop:8 }}><MiniProgress value={lvl.progress}/></div>
                ) : (
                  <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', marginTop:2 }}>{lvl.subtitle}</div>
                )}
              </div>
              {lvl.state!=='locked' && (
                <svg width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3l8 8-8 8"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </PageScroll>
  );
}
