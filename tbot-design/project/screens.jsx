// Screens for the lesson player flow.
// Each screen renders into a 402x874 iOS frame area.

const STATES = [
  { id: 'lesson_ready',    title: 'Lesson Ready',          group: 'Start' },
  { id: 'connecting',      title: 'Connecting Voice',      group: 'Start' },
  { id: 'greeting',        title: 'Robot Greeting',        group: 'Start' },
  { id: 'activity_intro',  title: 'Activity Intro',        group: 'Activity' },
  { id: 'robot_speaking',  title: 'Robot Speaking',        group: 'Activity' },
  { id: 'robot_listening', title: 'Robot Listening',       group: 'Activity' },
  { id: 'user_speaking',   title: 'User Speaking',         group: 'Activity' },
  { id: 'thinking',        title: 'Robot Thinking',        group: 'Activity' },
  { id: 'success',         title: 'Success Moment',        group: 'Feedback' },
  { id: 'gentle',          title: 'Gentle Correction',     group: 'Feedback' },
  { id: 'retry',           title: 'Retry Prompt',          group: 'Feedback' },
  { id: 'silence',         title: 'Silence Prompt',        group: 'Feedback' },
  { id: 'offtopic',        title: 'Off-topic Redirect',    group: 'Feedback' },
  { id: 'bargein',         title: 'Interrupted (Barge-in)', group: 'Feedback' },
  { id: 'activity_done',   title: 'Activity Complete',     group: 'Done' },
  { id: 'lesson_done',     title: 'Lesson Complete',       group: 'Done' },
  { id: 'reconnecting',    title: 'Reconnecting',          group: 'Edge' },
  { id: 'audio_error',     title: 'Audio Error',           group: 'Edge' },
  { id: 'safety',          title: 'Safety Fallback',       group: 'Edge' },
  { id: 'exit_confirm',    title: 'Exit Confirmation',     group: 'Edge' },
];

// ─────────────── shared bits ───────────────
function ScreenShell({ children, bg, onTap, persona='child' }){
  return (
    <div onClick={onTap} data-persona={persona} style={{
      width:'100%', height:'100%',
      background: bg || 'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)',
      position:'relative', overflow:'hidden',
      fontFamily:'var(--body)', color:'var(--ink)',
    }}>
      {children}
    </div>
  );
}

function TopBar({ left, right, title, dark }){
  const fg = dark ? '#fff' : 'var(--ink)';
  return (
    <div style={{
      position:'absolute', top:64, left:0, right:0, padding:'0 18px',
      display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:5,
    }}>
      <div>{left}</div>
      {title && <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:fg }}>{title}</div>}
      <div>{right}</div>
    </div>
  );
}

function CircleBtn({ children, bg='#fff', onClick, size=48, ariaLabel }){
  return (
    <button aria-label={ariaLabel} onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:size, height:size, borderRadius:'50%', border:'none',
      background:bg, boxShadow:'0 2px 0 rgba(0,0,0,.08), 0 6px 14px rgba(0,0,0,.06)',
      display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      color:'var(--ink-soft)',
    }}>{children}</button>
  );
}

function PrimaryCTA({ children, onClick, color='var(--coral)', icon }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:72, borderRadius:'var(--r-button)', border:'none',
      background: color, color:'#fff',
      fontFamily:'var(--display)', fontWeight:700, fontSize:26, letterSpacing:.2,
      boxShadow:`0 4px 0 rgba(0,0,0,.15), 0 10px 24px ${color === 'var(--coral)' ? 'rgba(255,111,97,.4)' : 'rgba(0,0,0,.12)'}`,
      display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
      padding:'0 22px',
    }}>
      {icon}{children}
    </button>
  );
}

function ProgressDots({ total=5, current=2 }){
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{
          width: i===current? 28:12, height:12, borderRadius:8,
          background: i<current? 'var(--mint)' : i===current? 'var(--coral)' : 'rgba(0,0,0,.1)',
          transition:'all .3s'
        }}/>
      ))}
    </div>
  );
}

function SpeechBubble({ children, dark, color }){
  const bg = color || (dark ? 'rgba(255,255,255,.95)' : '#fff');
  return (
    <div style={{
      background: bg, padding:'18px 24px', borderRadius:24,
      fontFamily:'var(--display)', fontWeight:700, fontSize:'var(--t-body)',
      lineHeight:1.25, color:'var(--ink)', textWrap:'pretty', textAlign:'center',
      boxShadow:'0 2px 0 rgba(0,0,0,.05), 0 10px 30px rgba(0,0,0,.06)',
      position:'relative', maxWidth:'88%',
    }}>
      {children}
    </div>
  );
}

function WaveBars({ count=14, color='var(--coral)', active=true, height=42 }){
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', height }}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} style={{
          width:5, height: '100%', borderRadius:6, background: color,
          transformOrigin:'center',
          animation: active ? `wave-bar ${0.7 + (i%4)*0.15}s ease-in-out ${(i*0.07)%1}s infinite` : 'none',
          opacity: active? 1: .3,
        }}/>
      ))}
    </div>
  );
}

function PulseRing({ size=240, color='var(--coral)' }){
  return (
    <>
      {[0,1,2].map(i=>(
        <div key={i} style={{
          position:'absolute', left:'50%', top:'50%',
          width:size, height:size, marginLeft:-size/2, marginTop:-size/2,
          borderRadius:'50%', border:`3px solid ${color}`,
          animation:`ring-pulse 2.4s ease-out ${i*0.8}s infinite`,
          pointerEvents:'none',
        }}/>
      ))}
    </>
  );
}

function MicButton({ on, onClick, label }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:108, height:108, borderRadius:'50%', border:'none',
      background: on ? 'var(--coral)' : '#fff',
      color: on ? '#fff' : 'var(--coral)',
      boxShadow: on
        ? '0 4px 0 rgba(0,0,0,.15), 0 0 0 8px rgba(255,111,97,.18), 0 12px 30px rgba(255,111,97,.4)'
        : '0 4px 0 rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.1)',
      display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      position:'relative', zIndex:2,
    }} aria-label={label || 'microphone'}>
      <svg width="40" height="48" viewBox="0 0 24 28" fill="none">
        <rect x="8" y="2" width="8" height="14" rx="4" fill="currentColor"/>
        <path d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    </button>
  );
}

// header used inside lesson — shows progress + close
function LessonHeader({ progress=0.4, onExit }){
  return (
    <div style={{ position:'absolute', top:60, left:18, right:18, display:'flex', alignItems:'center', gap:12, zIndex:5 }}>
      <CircleBtn size={42} onClick={onExit} ariaLabel="exit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
      </CircleBtn>
      <div style={{ flex:1, height:14, background:'rgba(0,0,0,.06)', borderRadius:8, overflow:'hidden' }}>
        <div style={{ width:`${progress*100}%`, height:'100%', background:'linear-gradient(90deg, var(--mint), var(--sky))', borderRadius:8, transition:'width .4s' }}/>
      </div>
      <div style={{
        background:'#fff', padding:'4px 12px', borderRadius:14,
        fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink-soft)',
        boxShadow:'0 2px 6px rgba(0,0,0,.06)'
      }}>⭐ 12</div>
    </div>
  );
}

// ─────────────── individual screens ───────────────

function S_LessonReady({ go, robotProps }){
  return (
    <ScreenShell>
      <TopBar
        left={<CircleBtn size={42} onClick={()=>go('exit_confirm')} ariaLabel="exit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></CircleBtn>}
        right={<CircleBtn size={42} onClick={()=>go('home')} ariaLabel="home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2z"/></svg></CircleBtn>}
      />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 28px 220px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:18, color:'var(--ink-soft)', marginBottom:6 }}>Today's lesson</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--ink)', marginBottom:24 }}>Animal Friends</div>
        <Robot emotion="happy" size={240} {...robotProps}/>
        <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center', background:'#fff', padding:'8px 16px', borderRadius:999, boxShadow:'0 2px 6px rgba(0,0,0,.05)'}}>
          <span style={{ fontSize:18 }}>🎧</span>
          <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)'}}>Wear headphones if you can</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('connecting')} icon={<span style={{fontSize:26}}>▶</span>}>I'm ready!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_Connecting({ go, robotProps }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('greeting'), 1800); return ()=>clearTimeout(t); },[]);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 100%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
        <Robot emotion="curious" size={220} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:26, color:'var(--ink)' }}>Tuning in…</div>
        <WaveBars color="var(--sky)" height={28} count={10}/>
      </div>
    </ScreenShell>
  );
}

function S_Greeting({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.05} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:20 }}>
        <Robot emotion="greet" size={240} {...robotProps}/>
        <SpeechBubble>Hi friend! 👋<br/>Ready to play with words?</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('activity_intro')} color="var(--mint)">Yes, let's go!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_ActivityIntro({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.15} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', top:120, left:0, right:0, display:'flex', justifyContent:'center' }}>
        <ProgressDots total={5} current={0}/>
      </div>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'160px 24px 200px', gap:18 }}>
        <div style={{
          background:'#fff', padding:'10px 18px', borderRadius:999,
          fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--coral)',
          letterSpacing:1, textTransform:'uppercase'
        }}>Activity 1 of 5</div>
        <Robot emotion="happy" size={200} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', textAlign:'center', color:'var(--ink)', textWrap:'pretty' }}>
          Let's name some animals!
        </div>
        <div style={{ display:'flex', gap:14, fontSize:48 }}>
          <span>🐱</span><span>🐶</span><span>🐰</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--coral)">Start</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_RobotSpeaking({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.25} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 220px', gap:18 }}>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.5 }}>Listen 👂</div>
        <Robot emotion="speak" size={220} {...robotProps}/>
        <SpeechBubble>This is a <span style={{ color:'var(--coral)' }}>cat</span>.<div style={{fontSize:48,marginTop:6}}>🐱</div></SpeechBubble>
        <div style={{ marginTop:8 }}><WaveBars color="var(--sky)" height={20} count={12}/></div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('robot_listening');}} style={{
          width:'100%', minHeight:60, borderRadius:'var(--r-button)', border:'2px dashed rgba(0,0,0,.15)',
          background:'rgba(255,255,255,.5)', color:'var(--ink-soft)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>🤖 Robot is talking…</button>
      </div>
    </ScreenShell>
  );
}

function S_RobotListening({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.3} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 240px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--coral)', marginBottom:6 }}>Your turn!</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:18, color:'var(--ink-soft)', marginBottom:24 }}>Say: <b style={{ color:'var(--ink)' }}>"cat"</b> 🐱</div>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={240} color="var(--coral)"/>
          <Robot emotion="listen" size={200} {...robotProps}/>
        </div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:60, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <MicButton on onClick={()=>go('user_speaking')} label="speak now"/>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:15, color:'var(--ink-soft)' }}>I'm listening…</div>
      </div>
    </ScreenShell>
  );
}

function S_UserSpeaking({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.32} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 240px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--mint)', marginBottom:18 }}>I hear you!</div>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={260} color="var(--mint)"/>
          <Robot emotion="listen" size={200} accent="var(--mint)" {...robotProps}/>
        </div>
        <div style={{ marginTop:24 }}><WaveBars color="var(--mint)" height={56} count={18}/></div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:60, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <MicButton on onClick={()=>go('thinking')} label="stop"/>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:15, color:'var(--ink-soft)' }}>Tap when done</div>
      </div>
    </ScreenShell>
  );
}

function S_Thinking({ go, robotProps }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('success'), 1600); return ()=>clearTimeout(t); },[]);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:24 }}>
        <Robot emotion="think" size={220} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:'var(--t-body)', color:'var(--ink-soft)' }}>Thinking…</div>
      </div>
    </ScreenShell>
  );
}

function S_Success({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.45} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="success" size={240} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble color="#fff">
          <span style={{ color:'var(--mint)' }}>Nice speaking!</span><br/>
          <span style={{ fontSize:18, fontWeight:600, color:'var(--ink-soft)' }}>You said "cat" 🐱</span>
        </SpeechBubble>
        <div style={{ display:'flex', gap:6 }}>
          {[0,1,2].map(i=><span key={i} style={{ fontSize:32, animation:`bot-spark 1.2s ease-out ${i*0.15}s infinite` }}>⭐</span>)}
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--mint)">Next →</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_Gentle({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--paper-2) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="gentle" size={220} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>Let's try that together.<br/><span style={{ color:'var(--coral)' }}>"cat"</span> 🐱</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:12 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)" icon={<span>🎤</span>}>Try again</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('robot_speaking');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)', fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Hear it again</button>
      </div>
    </ScreenShell>
  );
}

function S_Retry({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="curious" size={220} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>I heard you trying.<br/>One more time?</SpeechBubble>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:18, color:'var(--ink-soft)' }}>Say: <b style={{ color:'var(--ink)' }}>"cat"</b></div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)" icon={<span>🎤</span>}>I'll try!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_Silence({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="curious" size={220} {...robotProps}/>
        <SpeechBubble>Hmm, I didn't hear that clearly.<br/>Let's try again.</SpeechBubble>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', padding:'10px 16px', borderRadius:999, boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
          <span style={{ fontSize:20 }}>🤫</span>
          <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)' }}>Speak a little louder</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)" icon={<span>🎤</span>}>I'm here!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_Offtopic({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <Robot emotion="happy" size={220} {...robotProps}/>
        <SpeechBubble>Oh fun! 🐱<br/>Let's stay with the cat for now.</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--mint)">Back to the cat</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_Bargein({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.3} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 240px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--sky)', marginBottom:18 }}>Oh — go ahead!</div>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={260} color="var(--sky)"/>
          <Robot emotion="listen" size={200} accent="var(--sky)" {...robotProps}/>
        </div>
        <div style={{ marginTop:18, fontFamily:'var(--body)', fontWeight:700, fontSize:16, color:'var(--ink-soft)' }}>I'm listening 👂</div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:60, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <MicButton on onClick={()=>go('thinking')}/>
      </div>
    </ScreenShell>
  );
}

function S_ActivityDone({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <LessonHeader progress={0.6} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:18 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:38, color:'var(--mint)' }}>Activity done!</div>
        <Robot emotion="success" size={220} accent="var(--sun)" {...robotProps}/>
        <div style={{ display:'flex', gap:14 }}>
          {['🐱','🐶','🐰'].map((e,i)=>(
            <div key={i} style={{
              width:64, height:64, borderRadius:18, background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
              boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.06)',
              border:'3px solid var(--mint)'
            }}>{e}</div>
          ))}
        </div>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:16, color:'var(--ink-soft)' }}>3 new word friends!</div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--coral)">Keep going →</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_LessonDone({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sun) 0%, var(--cream-2) 70%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px 200px', gap:14 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-hero)', color:'var(--ink)', textAlign:'center', lineHeight:1.05 }}>You did it!</div>
        <Robot emotion="success" size={240} accent="var(--coral)" {...robotProps}/>
        <div style={{ display:'flex', gap:8 }}>
          {[0,1,2].map(i=><span key={i} style={{ fontSize:48 }}>⭐</span>)}
        </div>
        <div style={{
          background:'rgba(255,255,255,.7)', backdropFilter:'blur(8px)',
          padding:'14px 22px', borderRadius:20, fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)',
          textAlign:'center', maxWidth:300,
        }}>
          You learned 3 words today.<br/>See you tomorrow! 👋
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:12 }}>
        <PrimaryCTA onClick={()=>go('home')} color="var(--coral)">Back home</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_Reconnecting({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, #E8E5F0 0%, var(--cream) 70%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 200px', gap:20 }}>
        <Robot emotion="worry" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>One sec — finding my voice again.</SpeechBubble>
        <div style={{ display:'flex', gap:6 }}>
          {[0,1,2].map(i=><div key={i} style={{ width:10, height:10, borderRadius:5, background:'var(--plum)', animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite` }}/>)}
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('robot_listening');}} style={{
          width:'100%', minHeight:60, borderRadius:'var(--r-button)', border:'2px solid rgba(0,0,0,.1)',
          background:'transparent', color:'var(--ink-soft)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>Wait with Robot</button>
      </div>
    </ScreenShell>
  );
}

function S_AudioError({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--danger-soft) 0%, var(--cream) 70%)">
      <LessonHeader progress={0.34} onExit={()=>go('exit_confirm')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 220px', gap:18 }}>
        <Robot emotion="sad" size={220} accent="var(--coral)" {...robotProps}/>
        <SpeechBubble>I can't hear my microphone.<br/>Let's check it together.</SpeechBubble>
        <div style={{
          background:'#fff', padding:'14px 18px', borderRadius:18,
          display:'flex', alignItems:'center', gap:12, maxWidth:300, boxShadow:'0 2px 8px rgba(0,0,0,.06)'
        }}>
          <span style={{ fontSize:28 }}>🎤</span>
          <span style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:14, color:'var(--ink-soft)', textWrap:'pretty' }}>
            Ask a grown-up to turn the mic on.
          </span>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--coral)">Try again</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)', fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Go home</button>
      </div>
    </ScreenShell>
  );
}

function S_Safety({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, #E8E5F0 0%, var(--paper) 70%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 28px 220px', gap:20 }}>
        <Robot emotion="gentle" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>Let's pause for a moment.<br/>A grown-up can help if you need.</SpeechBubble>
        <div style={{
          background:'rgba(255,255,255,.85)', borderRadius:20, padding:'16px 18px',
          display:'flex', alignItems:'center', gap:12, maxWidth:320,
          boxShadow:'0 2px 6px rgba(0,0,0,.05)'
        }}>
          <div style={{ width:46, height:46, borderRadius:'50%', background:'var(--plum)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5zm-7 14a7 7 0 0014 0v-1H5v1z"/></svg>
          </div>
          <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:'var(--ink)', textWrap:'pretty' }}>
            We can take a break or ask for a grown-up.
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home')} color="var(--plum)">Take a break</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)', fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Get a grown-up</button>
      </div>
    </ScreenShell>
  );
}

function S_ExitConfirm({ go, robotProps }){
  return (
    <ScreenShell>
      <LessonHeader progress={0.34} onExit={()=>{}}/>
      <div style={{ position:'absolute', inset:0, background:'rgba(43,33,64,0.45)', backdropFilter:'blur(4px)' }}/>
      <div style={{ position:'absolute', left:20, right:20, bottom:30, background:'#fff', borderRadius:32, padding:'28px 24px', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display:'flex', justifyContent:'center', marginTop:-90 }}>
          <Robot emotion="sad" size={140} accent="var(--coral)" {...robotProps}/>
        </div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:26, color:'var(--ink)', textAlign:'center', marginTop:6 }}>
          Stop the lesson?
        </div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:16, color:'var(--ink-soft)', textAlign:'center', marginTop:6, marginBottom:22 }}>
          We can finish later.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <PrimaryCTA onClick={()=>go('robot_listening')} color="var(--mint)">Keep playing</PrimaryCTA>
          <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
            width:'100%', minHeight:56, borderRadius:'var(--r-button)', border:'2px solid rgba(0,0,0,.08)',
            background:'transparent', color:'var(--ink-soft)',
            fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
          }}>Stop for now</button>
        </div>
      </div>
    </ScreenShell>
  );
}

// ─────────────── Robot Home Hub (bonus, since prototype-link target) ───────────────
function S_Home({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <TopBar
        left={<CircleBtn size={42} ariaLabel="parent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg></CircleBtn>}
        right={<CircleBtn size={42} ariaLabel="settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 002 1.2L10 21h4l.5-2.5a7 7 0 002-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg></CircleBtn>}
      />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 280px', gap:14 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:18, color:'var(--ink-soft)' }}>Hi, Mai!</div>
        <Robot emotion="happy" size={220} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-title)', color:'var(--ink)' }}>Robot</div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:120 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Start Today's Lesson</PrimaryCTA>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:40, display:'flex', gap:12, justifyContent:'space-between' }}>
        {['Course','Review','Progress'].map(t=>(
          <button key={t} style={{
            flex:1, height:60, borderRadius:20, border:'none',
            background:'#fff', color:'var(--ink)',
            fontFamily:'var(--display)', fontWeight:700, fontSize:16, cursor:'pointer',
            boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.05)'
          }}>{t}</button>
        ))}
      </div>
    </ScreenShell>
  );
}

const SCREEN_MAP = {
  home: S_Home,
  lesson_ready: S_LessonReady,
  connecting: S_Connecting,
  greeting: S_Greeting,
  activity_intro: S_ActivityIntro,
  robot_speaking: S_RobotSpeaking,
  robot_listening: S_RobotListening,
  user_speaking: S_UserSpeaking,
  thinking: S_Thinking,
  success: S_Success,
  gentle: S_Gentle,
  retry: S_Retry,
  silence: S_Silence,
  offtopic: S_Offtopic,
  bargein: S_Bargein,
  activity_done: S_ActivityDone,
  lesson_done: S_LessonDone,
  reconnecting: S_Reconnecting,
  audio_error: S_AudioError,
  safety: S_Safety,
  exit_confirm: S_ExitConfirm,
};

Object.assign(window, { SCREEN_MAP, STATES, ScreenShell, TopBar, CircleBtn, PrimaryCTA, ProgressDots, SpeechBubble, WaveBars, PulseRing, MicButton, LessonHeader });
