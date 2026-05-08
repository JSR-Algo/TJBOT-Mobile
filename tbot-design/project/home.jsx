// Child-facing Robot Home Hub — main return point before/after lessons.
// 6 visual states selected via tweaks.homeState:
//   idle, greeting, daily_available, completed_today, mic_needed, offline
// No bottom tab bar. Robot center, parent gate top-left, settings top-right.
// Tapping Robot triggers a greet animation (does NOT start the lesson).
// Starting a lesson is always the explicit primary CTA.

function HomeStateChip({ children, color='var(--coral)', icon }){
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:8,
      background:'rgba(255,255,255,.85)', backdropFilter:'blur(8px)',
      padding:'8px 14px', borderRadius:999,
      fontFamily:'var(--display)', fontWeight:700, fontSize:13,
      color:'var(--ink-soft)', boxShadow:'0 2px 8px rgba(0,0,0,.06)',
    }}>
      {icon && <span style={{ display:'inline-flex', color }}>{icon}</span>}
      {children}
    </div>
  );
}

function HomeSecondaryBtn({ label, icon, onClick, badge, dim }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      flex:1, height:84, borderRadius:22, border:'none', position:'relative',
      background:'#fff', color:'var(--ink)',
      fontFamily:'var(--display)', fontWeight:700, fontSize:14, cursor:'pointer',
      boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.05)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
      opacity: dim ? 0.55 : 1,
    }}>
      <div style={{ fontSize:26, lineHeight:1 }}>{icon}</div>
      <div>{label}</div>
      {badge != null && (
        <div style={{
          position:'absolute', top:8, right:10, minWidth:22, height:22, padding:'0 6px',
          borderRadius:11, background:'var(--coral)', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:800, fontFamily:'var(--display)',
        }}>{badge}</div>
      )}
    </button>
  );
}

function S_HomeHub({ go, robotProps, tweaks={} }){
  const state = tweaks.homeState || 'daily_available';
  const [greet, setGreet] = React.useState(false);
  const greetTimer = React.useRef();

  // State-driven config — emotion, header chip, CTA copy, accent.
  const cfg = {
    idle: {
      emotion:'happy', accent:'var(--sun)',
      chip:null,
      ctaLabel:"Start Today's Lesson", ctaIcon:'▶', ctaColor:'var(--coral)',
      ctaTarget:'lesson_ready', ctaEnabled:true,
      reviewBadge:null, courseBadge:null,
    },
    greeting: {
      emotion:'greet', accent:'var(--coral)',
      chip:null,
      ctaLabel:"Start Today's Lesson", ctaIcon:'▶', ctaColor:'var(--coral)',
      ctaTarget:'lesson_ready', ctaEnabled:true,
      reviewBadge:null, courseBadge:null,
      forceGreet:true,
    },
    daily_available: {
      emotion:'curious', accent:'var(--coral)',
      chip:{ text:"Today's lesson is ready!", color:'var(--coral)',
        icon:(<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>) },
      ctaLabel:"Start Today's Lesson", ctaIcon:'▶', ctaColor:'var(--coral)',
      ctaTarget:'lesson_ready', ctaEnabled:true,
      reviewBadge:3, courseBadge:null,
    },
    completed_today: {
      emotion:'success', accent:'var(--mint)',
      chip:{ text:"Done for today — great job!", color:'var(--mint)',
        icon:(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>) },
      ctaLabel:"See what you did today", ctaIcon:'★', ctaColor:'var(--mint)',
      ctaTarget:'progress_today', ctaEnabled:true,
      reviewBadge:null, courseBadge:null,
    },
    mic_needed: {
      emotion:'gentle', accent:'var(--sun)',
      chip:{ text:"Robot needs the mic to play", color:'var(--sun)',
        icon:(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>) },
      ctaLabel:"Turn on the microphone", ctaIcon:'🎤', ctaColor:'var(--coral)',
      ctaTarget:'audio_recovery', ctaEnabled:true,
      reviewBadge:null, courseBadge:null, dimSecondary:true,
    },
    offline: {
      emotion:'sleep', accent:'#9AA9B5',
      chip:{ text:"Reconnecting…", color:'#9AA9B5',
        icon:(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 12a9 9 0 1015-6.7L21 8M21 3v5h-5"/></svg>) },
      ctaLabel:"Try again", ctaIcon:'↻', ctaColor:'#7B8896',
      ctaTarget:'reconnecting', ctaEnabled:true,
      reviewBadge:null, courseBadge:null, dimSecondary:true,
    },
  }[state] || {};

  // Tap-the-robot greet (does NOT start lesson)
  const onRobotTap = (e) => {
    e.stopPropagation();
    setGreet(true);
    clearTimeout(greetTimer.current);
    greetTimer.current = setTimeout(()=>setGreet(false), 1800);
  };
  React.useEffect(()=>()=>clearTimeout(greetTimer.current), []);

  const showingGreet = greet || cfg.forceGreet;
  const emotion = showingGreet ? 'greet' : cfg.emotion;

  const bg = state === 'offline'
    ? 'linear-gradient(180deg, #E8EEF3 0%, #F4F1EA 100%)'
    : state === 'completed_today'
    ? 'linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 100%)'
    : 'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)';

  return (
    <ScreenShell bg={bg} persona="parent">
      <TopBar
        left={(
          <CircleBtn size={44} ariaLabel="Parent area" onClick={()=>go('parent_gate')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
            </svg>
          </CircleBtn>
        )}
        right={(
          <CircleBtn size={44} ariaLabel="Settings" onClick={()=>go('settings')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>
            </svg>
          </CircleBtn>
        )}
      />

      {/* Centered Robot stage */}
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'flex-start', padding:'128px 24px 280px', gap:14 }}>

        {/* Greeting from kid */}
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink-soft)' }}>
          {state === 'completed_today' ? 'Hi again!' : state === 'offline' ? 'Hold on…' : 'Hi, friend!'}
        </div>

        {/* Status chip */}
        <div style={{ minHeight:32, display:'flex', alignItems:'center' }}>
          {cfg.chip && (
            <HomeStateChip color={cfg.chip.color} icon={cfg.chip.icon}>{cfg.chip.text}</HomeStateChip>
          )}
        </div>

        {/* Robot — tappable to greet */}
        <div onClick={onRobotTap} style={{
          position:'relative', width:240, height:240, marginTop:6,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          animation: showingGreet ? 'home-bounce .6s cubic-bezier(.2,.8,.2,1)' : 'home-breathe 4s ease-in-out infinite',
        }}>
          {state === 'daily_available' && !showingGreet && (
            <div style={{ position:'absolute', inset:-10 }}>
              <PulseRing size={260} color="var(--coral)"/>
            </div>
          )}
          {state === 'offline' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%',
                border:'3px dashed rgba(155,169,181,.5)', animation:'home-spin 6s linear infinite' }}/>
            </div>
          )}
          <Robot emotion={emotion} size={220} accent={cfg.accent} {...robotProps}/>
          {showingGreet && (
            <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)' }}>
              <SpeechBubble color="#fff">Hi!</SpeechBubble>
            </div>
          )}
        </div>

        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:32, color:'var(--ink)', letterSpacing:-0.4, marginTop:4 }}>
          Robot
        </div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)', marginTop:-6 }}>
          Tap me to say hi
        </div>
      </div>

      {/* Primary CTA */}
      <div style={{ position:'absolute', left:24, right:24, bottom:128 }}>
        <PrimaryCTA onClick={()=>go(cfg.ctaTarget)} color={cfg.ctaColor}
          icon={<span style={{fontSize:24}}>{cfg.ctaIcon}</span>}>{cfg.ctaLabel}</PrimaryCTA>
      </div>

      {/* Secondary trio — Course / Review / Progress */}
      <div style={{ position:'absolute', left:24, right:24, bottom:36, display:'flex', gap:10 }}>
        <HomeSecondaryBtn label="Course"   icon="🗺️" onClick={()=>go('course_home')}      dim={cfg.dimSecondary}/>
        <HomeSecondaryBtn label="Review"   icon="🔁" onClick={()=>go('review_entry')}    dim={cfg.dimSecondary} badge={cfg.reviewBadge}/>
        <HomeSecondaryBtn label="Progress" icon="⭐" onClick={()=>go('progress_today')}  dim={cfg.dimSecondary}/>
      </div>

      <style>{`
        @keyframes home-breathe { 0%,100% { transform:scale(1) } 50% { transform:scale(1.02) } }
        @keyframes home-bounce  { 0% { transform:scale(.94) } 50% { transform:scale(1.06) } 100% { transform:scale(1) } }
        @keyframes home-spin    { to { transform:rotate(360deg) } }
      `}</style>
    </ScreenShell>
  );
}

const HOME_STATES = [
  { id:'home_hub_idle',         title:'Home · Idle happy',          group:'Home', state:'idle' },
  { id:'home_hub_greet',        title:'Home · Robot greeting',      group:'Home', state:'greeting' },
  { id:'home_hub_daily',        title:"Home · Today's lesson",       group:'Home', state:'daily_available' },
  { id:'home_hub_done',         title:'Home · Lesson done today',   group:'Home', state:'completed_today' },
  { id:'home_hub_mic',          title:'Home · Needs microphone',    group:'Home', state:'mic_needed' },
  { id:'home_hub_offline',      title:'Home · Reconnecting',        group:'Home', state:'offline' },
];

const HOME_SCREEN_MAP = Object.fromEntries(HOME_STATES.map(s => [
  s.id,
  (props) => <S_HomeHub {...props} tweaks={{ ...(props.tweaks||{}), homeState: s.state }} />
]));

Object.assign(window, { S_HomeHub, HOME_STATES, HOME_SCREEN_MAP });
