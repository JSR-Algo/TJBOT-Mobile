// Course Navigation screens — Course / Level / Unit / Lesson / Daily Mission
// Same visual system as screens.jsx (robot, tokens, shared bits).

// ── shared bits for course nav ──

function PageScroll({ children, bg, persona='child' }){
  return (
    <div data-persona={persona} style={{
      width:'100%', height:'100%', overflow:'auto',
      background: bg || 'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)',
      WebkitOverflowScrolling:'touch',
    }}>
      {children}
    </div>
  );
}

function PageHeader({ left, right, title, subtitle, onBack }){
  return (
    <div style={{ padding:'62px 18px 12px', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {left || (onBack ? (
          <CircleBtn size={42} onClick={onBack} ariaLabel="back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
          </CircleBtn>
        ) : <div style={{width:42}}/>)}
        {right}
      </div>
      {title && (
        <div>
          {subtitle && <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:14, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2 }}>{subtitle}</div>}
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', letterSpacing:-.5 }}>{title}</div>
        </div>
      )}
    </div>
  );
}

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

// progress bar in mint
function MiniProgress({ value=0, color='var(--mint)' }){
  return (
    <div style={{ height:10, background:'rgba(0,0,0,.07)', borderRadius:8, overflow:'hidden' }}>
      <div style={{ width:`${value*100}%`, height:'100%', background:color, borderRadius:8, transition:'width .4s' }}/>
    </div>
  );
}

// ── 1. Course Overview ─────────────────────────
// Single course → shows Level path/scroll
function S_Course({ go, robotProps }){
  const levels = [
    { id:'L1', title:'Hello Friends', subtitle:'Greetings & me', state:'current', progress:0.4, color:'var(--coral)', icon:'👋' },
    { id:'L2', title:'Animal World',  subtitle:'Animals & sounds', state:'locked',  progress:0,   color:'var(--mint)',  icon:'🐱' },
    { id:'L3', title:'My Day',        subtitle:'Daily routines',   state:'locked',  progress:0,   color:'var(--sky)',   icon:'🌤️' },
    { id:'L4', title:'Yummy Foods',   subtitle:'Food & drinks',    state:'locked',  progress:0,   color:'var(--sun)',   icon:'🍎' },
  ];
  return (
    <PageScroll>
      <PageHeader
        left={<CircleBtn size={42} onClick={()=>go('home')} ariaLabel="home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2z"/></svg></CircleBtn>}
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

// ── 2. Level Overview ─────────────────────────
// "Map" with units as islands the child travels through
function S_Level({ go, robotProps }){
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

// ── 3. Unit Detail ─────────────────────────
function S_Unit({ go, robotProps }){
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

// ── 5. Lesson Detail ──────────────────────────
function S_LessonDetail({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <PageHeader
        onBack={()=>go('unit')}
        subtitle="Lesson 3"
        title="How are you?"
      />
      <div style={{ padding:'8px 24px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <Robot emotion="greet" size={170} {...robotProps}/>
        <SpeechBubble>We'll learn to ask and answer "How are you?"</SpeechBubble>
      </div>

      {/* what's inside */}
      <div style={{ padding:'4px 24px 16px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Today you'll practice</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { icon:'👂', title:'Listen to Robot', n:5 },
            { icon:'🎤', title:'Say it back', n:5 },
            { icon:'🎮', title:'Play a word game', n:1 },
          ].map((a,i)=>(
            <div key={i} style={{
              background:'#fff', borderRadius:18, padding:'14px',
              display:'flex', alignItems:'center', gap:14,
              boxShadow:'0 2px 6px rgba(0,0,0,.05)',
            }}>
              <div style={{
                width:44, height:44, borderRadius:14, background:'var(--cream-2)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0
              }}>{a.icon}</div>
              <div style={{ flex:1, fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'var(--ink)' }}>{a.title}</div>
              <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>×{a.n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'10px 24px 12px', display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
          <span style={{fontSize:18}}>⏱️</span> ~5 min
        </div>
        <div style={{ width:4, height:4, background:'rgba(0,0,0,.2)', borderRadius:2 }}/>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
          <span style={{fontSize:18}}>⭐</span> +20 stars
        </div>
      </div>

      <div style={{ padding:'8px 24px 30px' }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Start Lesson</PrimaryCTA>
      </div>
    </PageScroll>
  );
}

// ── 4. Lesson List (alt — flat list view) ────────────
function S_LessonList({ go, robotProps }){
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
              border:'none', cursor:isLocked?'default':'pointer',
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

// ── 6. Review Lesson Entry ────────────────────
function S_ReviewEntry({ go, robotProps }){
  const words = ['Hello','Hi','Friend','Happy'];
  return (
    <PageScroll bg="linear-gradient(180deg, #FFE6BD 0%, var(--cream) 60%)">
      <PageHeader
        onBack={()=>go('home')}
        subtitle="Quick review"
        title="Words to revisit"
      />
      <div style={{ padding:'4px 24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <Robot emotion="curious" size={170} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>4 words want to say hi again!</SpeechBubble>
      </div>

      <div style={{ padding:'10px 24px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {words.map((w,i)=>(
          <div key={w} style={{
            background:'#fff', borderRadius:20, padding:'18px 16px',
            display:'flex', flexDirection:'column', gap:6,
            boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{ fontSize:34 }}>{['👋','🙋','👫','😊'][i]}</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, color:'var(--ink)' }}>{w}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)'}}/> Practice
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'10px 24px 30px' }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--sun)" icon={<span style={{fontSize:26}}>▶</span>}>Start Review</PrimaryCTA>
      </div>
    </PageScroll>
  );
}

// ── 7. Daily Mission ────────────────────────
function S_DailyMission({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, #FFD9B0 0%, var(--cream-2) 70%)">
      <PageHeader
        onBack={()=>go('home')}
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

const COURSE_SCREEN_MAP = {
  course: S_Course,
  level: S_Level,
  unit: S_Unit,
  lesson_list: S_LessonList,
  lesson_detail: S_LessonDetail,
  review_entry: S_ReviewEntry,
  daily_mission: S_DailyMission,
};

const COURSE_STATES = [
  { id:'course',         title:'Course Overview', group:'Course' },
  { id:'level',          title:'Level Overview',  group:'Course' },
  { id:'unit',           title:'Unit Detail',     group:'Course' },
  { id:'lesson_list',    title:'Lesson List',     group:'Course' },
  { id:'lesson_detail',  title:'Lesson Detail',   group:'Course' },
  { id:'review_entry',   title:'Review Entry',    group:'Course' },
  { id:'daily_mission',  title:'Daily Mission',   group:'Course' },
];

Object.assign(window, { COURSE_SCREEN_MAP, COURSE_STATES, S_Course, S_Level, S_Unit, S_LessonList, S_LessonDetail, S_ReviewEntry, S_DailyMission });
