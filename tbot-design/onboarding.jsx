// First-run onboarding — 12 frames, parent-led setup → child handoff at frame 12.
// 1 Splash · 2 Welcome · 3-6 Product Intro (Listen/Speak/Try Again/Celebrate)
// · 7 Parent Trust · 8 Voice Permission · 9 Login/Signup · 10 Login Error
// · 11 Child Profile (avatar + level only) · 12 First Lesson Entry.
// Adult chrome for parent steps (OB palette), kid chrome for splash/intro/handoff.

const OB = {
  bg: '#F5F5F2',
  card: '#FFFFFF',
  ink: '#1A1A1F',
  ink2: '#5A5A66',
  ink3: '#8B8B96',
  hair: 'rgba(0,0,0,0.07)',
  accent: '#2A6FDB',
  good: '#1F8A5B',
  danger: '#C0392B',
  dangerSoft: '#FBE7E2',
};

function OnbShell({ children, step, total, onBack, title }){
  return (
    <div style={{ height:'100%', overflow:'auto', background:OB.bg, color:OB.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Text", system-ui, sans-serif', WebkitFontSmoothing:'antialiased' }}>
      <div style={{ position:'sticky', top:0, zIndex:5, background:OB.bg, padding:'56px 20px 12px',
        display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${OB.hair}` }}>
        {onBack && (
          <button onClick={(e)=>{e.stopPropagation(); onBack();}} style={{
            width:32, height:32, borderRadius:8, border:'none', background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:OB.ink2,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div style={{ flex:1, fontWeight:600, fontSize:17, letterSpacing:-0.2 }}>{title}</div>
        {step && total && <div style={{ fontSize:13, color:OB.ink3, fontWeight:500 }}>{step} of {total}</div>}
      </div>
      {children}
    </div>
  );
}

function OnbBigBtn({ children, onClick, color=OB.accent, secondary=false, danger=false }){
  if (secondary) return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:`1px solid ${OB.hair}`,
      background:'#fff', color:OB.ink, fontFamily:'inherit', fontWeight:500, fontSize:16, cursor:'pointer',
    }}>{children}</button>
  );
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:'none',
      background: danger? OB.danger : color, color:'#fff', fontFamily:'inherit', fontWeight:600, fontSize:16, cursor:'pointer',
      boxShadow: danger? '0 1px 0 rgba(0,0,0,.04), 0 6px 18px rgba(192,57,43,.18)' : '0 1px 0 rgba(0,0,0,.04), 0 6px 18px rgba(42,111,219,.18)',
    }}>{children}</button>
  );
}

// ──────────────────────────────────────────────────
// 1. SPLASH
// ──────────────────────────────────────────────────
function S_Splash({ go, robotProps }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('onb_welcome'), 1700); return ()=>clearTimeout(t); }, []);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18 }}>
        <div style={{ animation:'splash-pop .9s cubic-bezier(.2,.8,.2,1)' }}>
          <Robot emotion="happy" size={220} {...robotProps}/>
        </div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:48, color:'var(--ink)', letterSpacing:-0.5, animation:'splash-fade .6s ease .35s both' }}>Robot</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:'var(--ink-soft)', animation:'splash-fade .6s ease .55s both' }}>Voice English for kids</div>
      </div>
      <style>{`
        @keyframes splash-pop { 0% { transform:scale(.6); opacity:0 } 60% { transform:scale(1.06) } 100% { transform:scale(1); opacity:1 } }
        @keyframes splash-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
      `}</style>
    </ScreenShell>
  );
}

// ──────────────────────────────────────────────────
// 2. WELCOME (parent-facing entry)
// ──────────────────────────────────────────────────
function S_Welcome({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', padding:'120px 28px 230px' }}>
        <Robot emotion="greet" size={200} {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:34, color:'var(--ink)', textAlign:'center', marginTop:14, lineHeight:1.1, letterSpacing:-0.4 }}>
          Hi! I'm Robot.<br/>I help kids talk in English.
        </div>
        <div style={{
          marginTop:22, background:'rgba(255,255,255,.7)', backdropFilter:'blur(8px)',
          padding:'12px 16px', borderRadius:14, display:'flex', alignItems:'center', gap:10,
          fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)', maxWidth:300, textWrap:'pretty', textAlign:'left',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
          A grown-up sets things up the first time.
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('onb_intro_listen')} color="var(--coral)">Get started</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_login');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:15, cursor:'pointer',
        }}>I already have an account</button>
      </div>
    </ScreenShell>
  );
}

// ──────────────────────────────────────────────────
// 3-6. PRODUCT INTRO — 4 frames, shared shell
// ──────────────────────────────────────────────────
function IntroDots({ idx }){
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
      {[0,1,2,3].map(i=>(
        <div key={i} style={{
          width: i===idx? 24:10, height:10, borderRadius:6,
          background: i===idx? 'var(--coral)' : 'rgba(0,0,0,.12)', transition:'all .3s'
        }}/>
      ))}
    </div>
  );
}
function IntroFrame({ go, idx, prev, next, accentBg, kicker, title, body, illo }){
  return (
    <ScreenShell bg={accentBg}>
      <div style={{ position:'absolute', top:64, left:18, right:18, display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:5 }}>
        <CircleBtn size={42} onClick={()=>prev && go(prev)} ariaLabel="back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </CircleBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_trust');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>Skip</button>
      </div>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 28px 220px', gap:18 }}>
        {illo}
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.5 }}>{kicker}</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', textAlign:'center', lineHeight:1.1, letterSpacing:-0.3, maxWidth:320 }}>{title}</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:'var(--ink-soft)', textAlign:'center', textWrap:'pretty', maxWidth:300, lineHeight:1.4 }}>{body}</div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:18, alignItems:'center' }}>
        <IntroDots idx={idx}/>
        <PrimaryCTA onClick={()=>go(next)} color="var(--coral)">Next</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

function S_IntroListen({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={0} prev="onb_welcome" next="onb_intro_speak"
      accentBg="linear-gradient(180deg, var(--sky-soft) 0%, var(--cream) 60%)"
      kicker="How it works · 1"
      title="Robot listens"
      body="Kids tap the mic and speak. Robot listens patiently — no reading, no typing."
      illo={(
        <div style={{ position:'relative', width:240, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PulseRing size={200} color="var(--sky)"/>
          <Robot emotion="listen" size={170} accent="var(--sky)" {...robotProps}/>
        </div>
      )}/>
  );
}
function S_IntroSpeak({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={1} prev="onb_intro_listen" next="onb_intro_retry"
      accentBg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)"
      kicker="How it works · 2"
      title="Robot speaks back"
      body="Robot replies out loud, so kids hear how words really sound."
      illo={(
        <div style={{ position:'relative', width:240, height:200, display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
          <Robot emotion="speak" size={160} accent="var(--mint)" {...robotProps}/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ background:'#fff', padding:'8px 12px', borderRadius:14, fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>"Hello!"</div>
            <WaveBars count={8} color="var(--mint)" height={26}/>
          </div>
        </div>
      )}/>
  );
}
function S_IntroRetry({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={2} prev="onb_intro_speak" next="onb_intro_celebrate"
      accentBg="linear-gradient(180deg, #FFF1D6 0%, var(--cream) 60%)"
      kicker="How it works · 3"
      title="It's okay to try again"
      body="If a word is tricky, Robot says it once more — slowly, with no pressure."
      illo={(
        <div style={{ position:'relative', width:240, height:200, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
          <Robot emotion="gentle" size={160} accent="var(--sun)" {...robotProps}/>
          <div style={{
            background:'#fff', padding:'10px 14px', borderRadius:18,
            fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)',
            boxShadow:'0 2px 8px rgba(0,0,0,.06)', display:'flex', alignItems:'center', gap:8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sun)" strokeWidth="2.4" strokeLinecap="round"><path d="M3 12a9 9 0 1015-6.7L21 8M21 3v5h-5"/></svg>
            Once more!
          </div>
        </div>
      )}/>
  );
}
function S_IntroCelebrate({ go, robotProps }){
  return (
    <IntroFrame go={go} idx={3} prev="onb_intro_retry" next="onb_trust"
      accentBg="linear-gradient(180deg, var(--sun) 0%, var(--cream-2) 70%)"
      kicker="How it works · 4"
      title="Small wins, every day"
      body="Each lesson is short and ends with a celebration. Built for 3–5 minutes a day."
      illo={(
        <div style={{ position:'relative', width:240, height:170, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          {['🐱','🐶','🐰'].map((e,i)=>(
            <div key={i} style={{ width:60, height:60, borderRadius:18, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
              boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.06)', border:'3px solid var(--coral)',
              animation:`splash-pop .5s ease ${i*0.15}s both` }}>{e}</div>
          ))}
        </div>
      )}/>
  );
}

// ──────────────────────────────────────────────────
// 7. PARENT TRUST INTRO (calm adult chrome)
// ──────────────────────────────────────────────────
function S_Trust({ go }){
  const promises = [
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>),
      title:'Voice stays in the lesson', body:"Audio is processed during the lesson and discarded. We don't keep recordings." },
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>),
      title:'Short, focused sessions', body:'Designed for a few minutes a day. No streaks that pressure your child to keep playing.' },
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>),
      title:'No social, no chat, no ads', body:'No other kids, no messages, no advertising. Just your child and Robot.' },
    { icon:(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>),
      title:'You stay in control', body:'Settings, data, and subscription live behind a parent gate the child cannot solve.' },
  ];
  return (
    <OnbShell title="Our promise" onBack={()=>go('onb_intro_celebrate')}>
      <div style={{ padding:'18px 20px 8px' }}>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, marginBottom:6, textWrap:'pretty' }}>
          Made for kids 6–10. Designed with parents.
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5 }}>
          Before we set things up, here's how we treat your child's privacy and time.
        </div>
      </div>
      <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {promises.map((p,i)=>(
          <div key={i} style={{ background:OB.card, border:`1px solid ${OB.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'#EEF1F5', color:OB.ink, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {p.icon}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:OB.ink, marginBottom:3 }}>{p.title}</div>
              <div style={{ fontSize:13, color:OB.ink2, lineHeight:1.45, textWrap:'pretty' }}>{p.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'14px 20px 6px', fontSize:12, color:OB.ink3, lineHeight:1.5 }}>
        Full details any time in <span style={{ color:OB.accent, fontWeight:500 }}>Parent Space → Safety & Privacy</span>.
      </div>
      <div style={{ padding:'14px 20px 30px' }}>
        <OnbBigBtn onClick={()=>go('onb_mic')}>Continue</OnbBigBtn>
      </div>
    </OnbShell>
  );
}

// ──────────────────────────────────────────────────
// 8. VOICE PERMISSION INTRO
// ──────────────────────────────────────────────────
function S_MicAsk({ go }){
  const [showSheet, setShowSheet] = React.useState(false);
  return (
    <OnbShell title="Microphone" onBack={()=>go('onb_trust')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:96, height:96, borderRadius:24, background:OB.card, border:`1px solid ${OB.hair}`,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, color:OB.ink }}>
          <svg width="40" height="48" viewBox="0 0 24 28" fill="none">
            <rect x="8" y="2" width="8" height="14" rx="4" fill="currentColor"/>
            <path d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, textAlign:'center', marginBottom:8 }}>
          Robot needs the mic to listen
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5, textAlign:'center', maxWidth:320, textWrap:'pretty' }}>
          The next screen is your phone's permission prompt. Tap <b>Allow</b> so your child can speak to Robot.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          'Used only during a lesson',
          'No recording is saved',
          'You can revoke it anytime in Settings',
        ].map((t,i)=>(
          <div key={i} style={{ background:OB.card, border:`1px solid ${OB.hair}`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, fontSize:14, color:OB.ink }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
            {t}
          </div>
        ))}
      </div>
      <div style={{ padding:'22px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <OnbBigBtn onClick={()=>setShowSheet(true)}>Continue</OnbBigBtn>
        <OnbBigBtn secondary onClick={()=>go('onb_login')}>Not now</OnbBigBtn>
      </div>

      {showSheet && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:10 }}>
          <div style={{ width:280, background:'rgba(244,244,247,.96)', borderRadius:14, overflow:'hidden', backdropFilter:'blur(20px)' }}>
            <div style={{ padding:'20px 18px 16px', textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:600, color:'#000', marginBottom:6 }}>"Robot" Would Like to Access the Microphone</div>
              <div style={{ fontSize:13, color:'#3a3a3c', lineHeight:1.4 }}>So your child can speak with Robot during voice lessons.</div>
            </div>
            <div style={{ display:'flex', borderTop:'0.5px solid rgba(0,0,0,.18)' }}>
              <button onClick={(e)=>{e.stopPropagation(); setShowSheet(false); go('onb_login');}} style={{
                flex:1, padding:'12px 0', border:'none', borderRight:'0.5px solid rgba(0,0,0,.18)', background:'transparent',
                color:'#0a84ff', fontFamily:'inherit', fontSize:16, fontWeight:400, cursor:'pointer',
              }}>Don't Allow</button>
              <button onClick={(e)=>{e.stopPropagation(); setShowSheet(false); go('onb_login');}} style={{
                flex:1, padding:'12px 0', border:'none', background:'transparent',
                color:'#0a84ff', fontFamily:'inherit', fontSize:16, fontWeight:600, cursor:'pointer',
              }}>Allow</button>
            </div>
          </div>
        </div>
      )}
    </OnbShell>
  );
}

// ──────────────────────────────────────────────────
// 9. LOGIN / SIGN UP
// ──────────────────────────────────────────────────
function S_Login({ go }){
  const [mode, setMode] = React.useState('signup');
  return (
    <OnbShell title="Parent account" onBack={()=>go('onb_mic')}>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, marginBottom:6 }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5 }}>
          We use your account to save progress and manage privacy.
        </div>
      </div>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ display:'flex', background:'rgba(0,0,0,.06)', borderRadius:10, padding:3 }}>
          {[{id:'signup',label:'Sign up'},{id:'login',label:'Log in'}].map(t=>(
            <button key={t.id} onClick={(e)=>{e.stopPropagation(); setMode(t.id);}} style={{
              flex:1, padding:'9px 0', border:'none', borderRadius:8, fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer',
              background: mode===t.id? '#fff':'transparent', color: mode===t.id? OB.ink : OB.ink2,
              boxShadow: mode===t.id? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'20px 20px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_child');}} style={{
          width:'100%', minHeight:48, borderRadius:10, border:`1px solid ${OB.hair}`, background:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
          fontFamily:'inherit', fontSize:15, fontWeight:500, color:OB.ink,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.7 3-4.3 3-7.5z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.5-4H3.2v2.6C4.8 19.8 8.1 22 12 22z"/><path fill="#FBBC05" d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.2C2.4 8.8 2 10.4 2 12s.4 3.2 1.2 4.6L6.5 14z"/><path fill="#EA4335" d="M12 5.8c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.2 3.2 7.4L6.5 10c.8-2.3 3-4 5.5-4z"/></svg>
          Continue with Google
        </button>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_child');}} style={{
          width:'100%', minHeight:48, borderRadius:10, border:'none', background:'#000',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
          fontFamily:'inherit', fontSize:15, fontWeight:500, color:'#fff',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M16.4 1.5c-1 .1-2.2.7-2.9 1.6-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.4.7-.8 1.1-1.9 1-3.1zm3.3 6.7c-.1.1-1.7 1-1.7 3 0 2.3 2 3.1 2.1 3.1 0 .1-.3 1.2-1.1 2.4-.6 1-1.3 2-2.4 2-1 0-1.4-.7-2.6-.7-1.3 0-1.7.7-2.6.7-1.1 0-1.9-1-2.6-2C7.5 14.7 6.4 11 7.7 8.5c.6-1.2 1.8-2 3.1-2 1 0 2 .7 2.6.7.6 0 1.7-.8 2.9-.7.5 0 2 .2 2.9 1.7z"/></svg>
          Continue with Apple
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', color:OB.ink3, fontSize:12 }}>
          <div style={{ flex:1, height:1, background:OB.hair }}/>or<div style={{ flex:1, height:1, background:OB.hair }}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <input placeholder="Email" style={{ width:'100%', padding:'14px 14px', border:`1px solid ${OB.hair}`, borderRadius:10, fontFamily:'inherit', fontSize:15, background:'#fff' }}/>
          <input placeholder="Password" type="password" style={{ width:'100%', padding:'14px 14px', border:`1px solid ${OB.hair}`, borderRadius:10, fontFamily:'inherit', fontSize:15, background:'#fff' }}/>
        </div>
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <OnbBigBtn onClick={()=>go(mode==='login' ? 'onb_login_error' : 'onb_child')}>{mode === 'signup' ? 'Create account' : 'Log in'}</OnbBigBtn>
        <div style={{ textAlign:'center', fontSize:11, color:OB.ink3, lineHeight:1.5 }}>
          By continuing you agree to our <span style={{ color:OB.accent }}>Terms</span> and <span style={{ color:OB.accent }}>Privacy Policy</span>.
        </div>
      </div>
    </OnbShell>
  );
}

// ──────────────────────────────────────────────────
// 10. LOGIN ERROR
// ──────────────────────────────────────────────────
function S_LoginError({ go }){
  return (
    <OnbShell title="Sign in" onBack={()=>go('onb_login')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:OB.dangerSoft, color:OB.danger,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div style={{ fontSize:20, fontWeight:600, letterSpacing:-0.3, color:OB.ink, textAlign:'center', marginBottom:6 }}>
          We couldn't sign you in
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5, textAlign:'center', maxWidth:300, textWrap:'pretty' }}>
          Email or password didn't match. Try again, or reset your password.
        </div>
      </div>

      <div style={{ padding:'24px 20px 0', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ background:OB.card, border:`1px solid ${OB.danger}`, borderRadius:10, padding:'14px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={OB.danger} strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
          <input defaultValue="parent@example.com" style={{ flex:1, border:'none', outline:'none', fontFamily:'inherit', fontSize:15, background:'transparent', color:OB.ink }}/>
        </div>
        <div style={{ background:OB.card, border:`1px solid ${OB.danger}`, borderRadius:10, padding:'14px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={OB.danger} strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
          <input defaultValue="••••••••" type="password" style={{ flex:1, border:'none', outline:'none', fontFamily:'inherit', fontSize:15, background:'transparent', color:OB.ink }}/>
        </div>
        <div style={{ fontSize:13, color:OB.danger, padding:'4px 4px 0', display:'flex', alignItems:'center', gap:6 }}>
          Email or password is incorrect.
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <OnbBigBtn onClick={()=>go('onb_child')}>Try again</OnbBigBtn>
        <OnbBigBtn secondary onClick={()=>go('onb_login')}>Reset password</OnbBigBtn>
      </div>
    </OnbShell>
  );
}

// ──────────────────────────────────────────────────
// 11. CHILD PROFILE — avatar + level only (no name, no birthday, no photo)
// ──────────────────────────────────────────────────
function S_ChildProfile({ go }){
  const [buddy, setBuddy] = React.useState('panda');
  const [level, setLevel] = React.useState('starter');
  const buddies = [
    { id:'panda',  emoji:'🐼', label:'Panda' },
    { id:'cat',    emoji:'🐱', label:'Cat'   },
    { id:'fox',    emoji:'🦊', label:'Fox'   },
    { id:'rabbit', emoji:'🐰', label:'Rabbit'},
    { id:'frog',   emoji:'🐸', label:'Frog'  },
    { id:'lion',   emoji:'🦁', label:'Lion'  },
    { id:'unicorn',emoji:'🦄', label:'Unicorn'},
    { id:'dog',    emoji:'🐶', label:'Dog'   },
  ];
  const levels = [
    { id:'starter',  label:'Just starting',   body:'New to English. Lots of Robot voice and pictures.' },
    { id:'building', label:'Knows some words', body:'Can say a few English words. Ready for short phrases.' },
    { id:'flowing',  label:'Speaks a bit',    body:'Can answer simple questions. Ready to talk in sentences.' },
  ];
  const sel = buddies.find(b=>b.id===buddy);

  return (
    <OnbShell title="Your child's buddy" onBack={()=>go('onb_login')}>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, marginBottom:6 }}>
          Pick a buddy and a starting level
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We don't ask for your child's name or photo. The buddy is how Robot greets them.
        </div>
      </div>

      {/* Buddy picker */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:12, color:OB.ink3, padding:'0 4px 8px', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>Buddy</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {buddies.map(b=>(
            <button key={b.id} onClick={(e)=>{e.stopPropagation(); setBuddy(b.id);}} style={{
              aspectRatio:'1', border:`2px solid ${buddy===b.id? OB.accent : OB.hair}`,
              borderRadius:14, background: buddy===b.id? '#E8F0FE' : OB.card,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, cursor:'pointer',
            }}>{b.emoji}</button>
          ))}
        </div>
        <div style={{ fontSize:13, color:OB.ink2, padding:'10px 4px 0' }}>Robot will say: <b>"Hi, {sel.label} friend!"</b></div>
      </div>

      {/* Level picker */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:12, color:OB.ink3, padding:'0 4px 8px', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>Starting level</div>
        <div style={{ background:OB.card, borderRadius:14, border:`1px solid ${OB.hair}`, overflow:'hidden' }}>
          {levels.map((l,i)=>{
            const active = level===l.id;
            return (
              <button key={l.id} onClick={(e)=>{e.stopPropagation(); setLevel(l.id);}} style={{
                display:'flex', alignItems:'flex-start', gap:12, width:'100%', padding:'14px 14px',
                border:'none', background: active? '#E8F0FE' : 'transparent',
                borderBottom: i<levels.length-1? `1px solid ${OB.hair}`:'none',
                cursor:'pointer', textAlign:'left',
              }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0, marginTop:2,
                  border:`2px solid ${active? OB.accent : 'rgba(0,0,0,.2)'}`,
                  background: active? OB.accent : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:OB.ink, marginBottom:2 }}>{l.label}</div>
                  <div style={{ fontSize:13, color:OB.ink2, lineHeight:1.45, textWrap:'pretty' }}>{l.body}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize:12, color:OB.ink3, padding:'8px 4px 0', lineHeight:1.5 }}>Robot adapts as you go — you can change this any time.</div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <OnbBigBtn onClick={()=>go('onb_first_lesson')}>Save and meet Robot</OnbBigBtn>
      </div>
    </OnbShell>
  );
}

// ──────────────────────────────────────────────────
// 12. FIRST LESSON ENTRY — parent → child handoff
// ──────────────────────────────────────────────────
function S_FirstLessonEntry({ go, robotProps }){
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--sun) 0%, var(--cream-2) 60%)">
      <div style={{ position:'absolute', top:64, left:'50%', transform:'translateX(-50%)', zIndex:5,
        background:'rgba(255,255,255,.85)', backdropFilter:'blur(8px)', padding:'8px 14px', borderRadius:999,
        display:'flex', alignItems:'center', gap:8, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)',
        boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 11V8a4 4 0 118 0v3M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z"/></svg>
        Hand the phone to your child
      </div>

      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'140px 28px 230px' }}>
        <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{
            position:'absolute', inset:30, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 70%)',
            animation:'splash-pop 1s ease both',
          }}/>
          <Robot emotion="greet" size={220} accent="var(--coral)" {...robotProps}/>
        </div>
        <SpeechBubble>Hi there!<br/>Want to play?</SpeechBubble>
        <div style={{
          marginTop:12, background:'rgba(255,255,255,.7)', backdropFilter:'blur(6px)',
          padding:'8px 14px', borderRadius:999, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)',
        }}>About 3 minutes · headphones if you have them</div>
      </div>

      <div style={{ position:'absolute', left:24, right:24, bottom:48 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Yes!</PrimaryCTA>
      </div>
    </ScreenShell>
  );
}

const ONBOARDING_STATES = [
  { id:'onb_splash',          title:'1 · Splash',                 group:'Onboarding' },
  { id:'onb_welcome',         title:'2 · Welcome',                group:'Onboarding' },
  { id:'onb_intro_listen',    title:'3 · Intro · Listen',         group:'Onboarding' },
  { id:'onb_intro_speak',     title:'4 · Intro · Speak',          group:'Onboarding' },
  { id:'onb_intro_retry',     title:'5 · Intro · Try Again',      group:'Onboarding' },
  { id:'onb_intro_celebrate', title:'6 · Intro · Celebrate',      group:'Onboarding' },
  { id:'onb_trust',           title:'7 · Parent Trust Intro',     group:'Onboarding' },
  { id:'onb_mic',             title:'8 · Voice Permission',       group:'Onboarding' },
  { id:'onb_login',           title:'9 · Login / Sign Up',        group:'Onboarding' },
  { id:'onb_login_error',     title:'10 · Login Error',           group:'Onboarding' },
  { id:'onb_child',           title:'11 · Child Profile',         group:'Onboarding' },
  { id:'onb_first_lesson',    title:'12 · First Lesson Entry',    group:'Onboarding' },
];

const ONBOARDING_SCREEN_MAP = {
  onb_splash:          S_Splash,
  onb_welcome:         S_Welcome,
  onb_intro_listen:    S_IntroListen,
  onb_intro_speak:     S_IntroSpeak,
  onb_intro_retry:     S_IntroRetry,
  onb_intro_celebrate: S_IntroCelebrate,
  onb_trust:           S_Trust,
  onb_mic:             S_MicAsk,
  onb_login:           S_Login,
  onb_login_error:     S_LoginError,
  onb_child:           S_ChildProfile,
  onb_first_lesson:    S_FirstLessonEntry,
};

Object.assign(window, { ONBOARDING_STATES, ONBOARDING_SCREEN_MAP });
