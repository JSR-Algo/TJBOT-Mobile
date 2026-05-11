import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';

// LessonNode — circular tile used on the path/journey view.
function LessonNode({ state, label, icon, color='var(--coral)', onClick, big }){
  // state: done | current | locked | review
  const size = big ? 112 : 88;
  const isLocked = state === 'locked';
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const isReview = state === 'review';
  const bg = isLocked ? '#E5E0D6' : isDone ? 'var(--mint)' : isReview ? 'var(--sun)' : color;
  const fg = '#fff';
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:size, height:size, borderRadius:'50%', border:'none',
      background: bg, color: fg, cursor: isLocked? 'default':'pointer',
      boxShadow: isCurrent
        ? `0 6px 0 rgba(0,0,0,.12), 0 0 0 5px #fff, 0 0 0 10px ${color}, 0 12px 28px ${color}66`
        : isDone
        ? '0 4px 0 rgba(0,0,0,.12), 0 8px 18px rgba(108,226,182,.4)'
        : isReview
        ? '0 4px 0 rgba(0,0,0,.12), 0 8px 18px rgba(255,200,87,.5)'
        : '0 4px 0 rgba(0,0,0,.12), 0 8px 18px rgba(0,0,0,.06)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: big? 44:36, position:'relative',
      filter: isLocked? 'saturate(.4)':'none',
      animation: isCurrent? 'bot-bob 2s ease-in-out infinite':'none',
    }}>
      {isLocked ? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
      ) : isDone ? (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
      ) : (
        <span>{icon}</span>
      )}
      {isReview && (
        <div style={{ position:'absolute', top:-4, right:-4, width:30, height:30, borderRadius:'50%', background:'var(--coral)', color:'#fff', fontSize:14, fontWeight:800, fontFamily:'var(--display)', display:'flex', alignItems:'center', justifyContent:'center', border:'3px solid var(--cream)' }}>!</div>
      )}
      {label && (
        <div style={{
          position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)', marginTop:8,
          whiteSpace:'nowrap', fontFamily:'var(--display)', fontWeight:700, fontSize:13,
          color: isLocked? 'var(--ink-soft)': 'var(--ink)',
        }}>{label}</div>
      )}
    </button>
  );
}

export default function LevelPage({ go, robotProps }){
  const units = [
    { id:'U1', title:'Say hi',         icon:'👋', state:'done',    color:'var(--coral)' },
    { id:'U2', title:'My name',         icon:'🪪', state:'done',    color:'var(--sky)' },
    { id:'U3', title:'How are you?',    icon:'🙂', state:'current', color:'var(--coral)' },
    { id:'U4', title:'Numbers 1-5',     icon:'🔢', state:'locked',  color:'var(--mint)' },
    { id:'U5', title:'Colors',          icon:'🎨', state:'locked',  color:'var(--sun)' },
  ];
  return (
    <PageScroll bg="linear-gradient(180deg, #BFE2FF 0%, var(--cream) 60%)">
      <PageHeader
        onBack={()=>go('course')}
        right={<div style={{ background:'#fff', padding:'8px 14px', borderRadius:999, fontFamily:'var(--display)', fontWeight:700, fontSize:15, color:'var(--ink)', boxShadow:'0 2px 6px rgba(0,0,0,.05)'}}>⭐ 24</div>}
        subtitle="Level 1"
        title="Hello Friends"
      />
      <div style={{ padding:'8px 24px 18px', display:'flex', alignItems:'center', gap:12 }}>
        <Robot emotion="happy" size={80} {...robotProps}/>
        <div style={{
          background:'#fff', borderRadius:18, padding:'10px 14px',
          fontFamily:'var(--display)', fontWeight:700, fontSize:15, color:'var(--ink)',
          boxShadow:'0 2px 6px rgba(0,0,0,.05)', flex:1, textWrap:'pretty', lineHeight:1.3
        }}>You're on Unit 3 — let's go!</div>
      </div>

      {/* the journey path */}
      <div style={{ position:'relative', padding:'30px 24px 60px' }}>
        {/* dotted path */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:0, pointerEvents:'none' }} preserveAspectRatio="none" viewBox="0 0 340 600">
          <path d="M 80 50 Q 260 80 240 180 Q 220 280 100 320 Q 30 380 130 460 Q 220 510 200 570" stroke="rgba(43,33,64,0.25)" strokeWidth="5" strokeDasharray="4 12" strokeLinecap="round" fill="none"/>
        </svg>

        <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr 1fr', rowGap:60, columnGap:20 }}>
          {units.map((u,i)=>(
            <div key={u.id} style={{
              display:'flex', justifyContent: i%2 ? 'flex-end':'flex-start',
              transform:`translateX(${i%2? '8px':'0'})`,
              paddingTop: i*4
            }}>
              <div style={{ textAlign:'center' }}>
                <LessonNode
                  state={u.state}
                  icon={u.icon}
                  color={u.color}
                  big={u.state==='current'}
                  onClick={()=> u.state!=='locked' && go('unit')}
                />
                <div style={{
                  marginTop: u.state==='current'? 18:14,
                  fontFamily:'var(--display)', fontWeight:700, fontSize:14,
                  color: u.state==='locked'? 'var(--ink-soft)':'var(--ink)',
                  whiteSpace:'nowrap'
                }}>
                  <span style={{ opacity:.6 }}>Unit {i+1}</span><br/>{u.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageScroll>
  );
}
