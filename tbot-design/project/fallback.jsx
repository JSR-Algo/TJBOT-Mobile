// Settings / Error / Fallback states (child- and parent-facing)
// 10 frames: kid_settings, mic_missing, network_error, voice_failed, login_error,
//            safety_redirect, help_faq, reconnecting_overlay, audio_recovery, lesson_resume

// Reuse PA tokens for parent-facing rows; reuse PrimaryCTA / SpeechBubble / Robot / ScreenShell for child.

// ── 1. Settings (child-facing, simplified) ──
function S_KidSettings({ go, robotProps }){
  const [sound, setSound] = React.useState(true);
  const [mic, setMic] = React.useState(true);
  const Row = ({ icon, label, on, set }) => (
    <div style={{
      display:'flex', alignItems:'center', gap:14, background:'#fff',
      borderRadius:20, padding:'14px 18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ width:48, height:48, borderRadius:14, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{icon}</div>
      <div style={{ flex:1, fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)' }}>{label}</div>
      <div onClick={()=>set(!on)} style={{
        width:60, height:36, borderRadius:18, background: on? 'var(--mint)' : 'rgba(0,0,0,.12)',
        position:'relative', cursor:'pointer', transition:'background .15s', flexShrink:0,
      }}>
        <div style={{ position:'absolute', top:3, left: on? 27:3, width:30, height:30, borderRadius:'50%', background:'#fff', boxShadow:'0 2px 4px rgba(0,0,0,.2)', transition:'left .15s' }}/>
      </div>
    </div>
  );
  return (
    <PageScroll>
      <PageHeader onBack={()=>go('home')} title="Settings"/>
      <div style={{ padding:'4px 24px 16px', display:'flex', justifyContent:'center' }}>
        <Robot emotion="happy" size={140} {...robotProps}/>
      </div>
      <div style={{ padding:'0 18px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        <Row icon="🔊" label="Sounds" on={sound} set={setSound}/>
        <Row icon="🎤" label="Microphone" on={mic} set={setMic}/>
      </div>
      <div style={{ padding:'4px 18px 18px' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('parent_gate');}} style={{
          width:'100%', background:'#fff', border:'2px dashed rgba(0,0,0,.15)', borderRadius:20,
          padding:'16px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', textAlign:'left',
        }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🔒</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:16, color:'var(--ink)' }}>Grown-up area</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)' }}>For parents</div>
          </div>
          <span style={{ fontSize:18, color:'var(--ink-soft)' }}>›</span>
        </button>
      </div>
      <div style={{ padding:'0 18px 24px' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('help_faq');}} style={{
          width:'100%', background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer', padding:'12px',
        }}>Need help?</button>
      </div>
    </PageScroll>
  );
}

// ── 2. Microphone Permission Missing (child-facing nudge) ──
function S_MicMissing({ go, robotProps }){
  return (
    <ScreenShell persona="parent" bg="linear-gradient(180deg, var(--danger-soft) 0%, var(--cream) 70%)">
      <TopBar onBack={()=>go('home')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 24px 220px', gap:18 }}>
        <Robot emotion="sad" size={220} accent="var(--coral)" {...robotProps}/>
        <SpeechBubble>Hmm, I can't hear yet.<br/>Let's check the microphone.</SpeechBubble>
        <div style={{
          background:'#fff', padding:'14px 18px', borderRadius:20,
          fontFamily:'var(--body)', fontWeight:700, fontSize:15, color:'var(--ink-soft)',
          textAlign:'center', lineHeight:1.4, maxWidth:300,
        }}>
          A grown-up can turn on the microphone in Settings.
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('audio_recovery')} color="var(--coral)">Get a grown-up</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}

// ── 3. Network Error (child-facing) ──
function S_NetworkError({ go, robotProps }){
  return (
    <ScreenShell persona="parent" bg="linear-gradient(180deg, #E8E5F0 0%, var(--cream) 70%)">
      <TopBar onBack={()=>go('home')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 24px 220px', gap:18 }}>
        <Robot emotion="worry" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>Oops — I lost my signal.<br/>Let's try again in a sec.</SpeechBubble>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.7)', padding:'8px 14px', borderRadius:999, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12" y2="20"/></svg>
          No internet connection
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('reconnecting_overlay')} color="var(--plum)">Try again</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}

// ── 4. Voice Session Failed (child-facing) ──
function S_VoiceFailed({ go, robotProps }){
  return (
    <ScreenShell persona="parent" bg="linear-gradient(180deg, var(--paper-2) 0%, var(--cream) 70%)">
      <TopBar onBack={()=>go('home')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 24px 220px', gap:18 }}>
        <Robot emotion="gentle" size={220} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>My voice got tangled up.<br/>Let's start the lesson fresh.</SpeechBubble>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('lesson_resume')} color="var(--coral)">Pick up where we left off</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Back home</button>
      </div>
    </ScreenShell>
  );
}

// ── 5. Login Error (parent-facing) ──
function S_LoginError({ go }){
  return (
    <ParentScroll title="Sign in" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'40px 24px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'#FBE7E2', color:'#C0392B', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
        </div>
        <div style={{ fontSize:20, fontWeight:600, letterSpacing:-0.3, color:PA.ink, textAlign:'center' }}>Couldn't sign you in</div>
        <div style={{ fontSize:14, color:PA.ink2, lineHeight:1.5, textAlign:'center', maxWidth:300 }}>
          The email or password didn't match. You can try again or reset your password.
        </div>
      </div>
      <div style={{ padding:'4px 16px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        <input placeholder="Email" defaultValue="parent@example.com" style={{
          width:'100%', padding:'14px 16px', border:`1px solid ${PA.hair}`, borderRadius:10,
          background:PA.card, fontSize:15, fontFamily:'inherit', color:PA.ink,
        }}/>
        <input placeholder="Password" type="password" style={{
          width:'100%', padding:'14px 16px', border:`1.5px solid #E8B5AB`, borderRadius:10,
          background:PA.card, fontSize:15, fontFamily:'inherit', color:PA.ink,
        }}/>
        <div style={{ fontSize:12, color:'#C0392B', padding:'2px 4px' }}>Email and password don't match.</div>
      </div>
      <div style={{ padding:'8px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button style={{
          width:'100%', minHeight:48, borderRadius:10, border:'none', background:PA.accent, color:'#fff',
          fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'inherit',
        }}>Sign in</button>
        <button style={{
          width:'100%', minHeight:48, borderRadius:10, border:`1px solid ${PA.hair}`, background:PA.card, color:PA.ink,
          fontWeight:500, fontSize:15, cursor:'pointer', fontFamily:'inherit',
        }}>Reset password</button>
      </div>
      <div style={{ padding:'16px 24px 32px', textAlign:'center', fontSize:13, color:PA.ink3 }}>
        Need help? <span style={{ color:PA.accent, cursor:'pointer' }}>Contact support</span>
      </div>
    </ParentScroll>
  );
}

// ── 6. Safety Redirect (child-facing) ──
function S_SafetyRedirect({ go, robotProps }){
  return (
    <ScreenShell persona="parent" bg="linear-gradient(180deg, #E8E5F0 0%, var(--paper) 70%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 28px 220px', gap:20 }}>
        <Robot emotion="gentle" size={220} accent="var(--plum)" {...robotProps}/>
        <SpeechBubble>Let's take a tiny pause.<br/>A grown-up can help if you need.</SpeechBubble>
        <div style={{
          background:'rgba(255,255,255,.85)', borderRadius:20, padding:'14px 18px',
          fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink-soft)',
          textAlign:'center', lineHeight:1.45, maxWidth:300,
        }}>
          We'll come back to learning when you're ready.
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home')} color="var(--plum)">Take a break</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('parent_gate');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Get a grown-up</button>
      </div>
    </ScreenShell>
  );
}

// ── 7. Help / FAQ (parent-facing) ──
function S_HelpFAQ({ go }){
  const faqs = [
    { q:'Is my child\'s voice recorded?', a:'No. Voice is processed in real time and not stored. We don\'t keep audio or transcripts.' },
    { q:'Why does the app need a microphone?', a:'Speaking practice is the core of Robot English. The mic only turns on during a lesson.' },
    { q:'My child is shy — will the robot wait?', a:'Yes. The robot uses gentle prompts and never penalizes silence. Children can pause anytime.' },
    { q:'How long is a lesson?', a:'About 5–8 minutes. You can change the lesson length in Parent Settings.' },
    { q:'Can my child play offline?', a:'Voice lessons need a connection. Review games for known words work offline.' },
    { q:'How do I cancel my subscription?', a:'Open Parent Space → Settings → Subscription → Manage billing.' },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <ParentScroll title="Help & FAQ" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'14px 16px 4px' }}>
        <input placeholder="Search help…" style={{
          width:'100%', padding:'12px 14px', border:`1px solid ${PA.hair}`, borderRadius:10,
          background:PA.card, fontSize:15, fontFamily:'inherit', color:PA.ink,
        }}/>
      </div>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ background:PA.card, borderRadius:14, border:`1px solid ${PA.hair}`, overflow:'hidden' }}>
          {faqs.map((f, i)=>{
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderBottom: i===faqs.length-1? 'none' : `1px solid ${PA.hair}` }}>
                <button onClick={()=>setOpen(isOpen? -1 : i)} style={{
                  width:'100%', textAlign:'left', background:'transparent', border:'none',
                  padding:'14px 14px', display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer',
                }}>
                  <span style={{ flex:1, fontSize:15, fontWeight:500, color:PA.ink, lineHeight:1.35, fontFamily:'inherit' }}>{f.q}</span>
                  <span style={{ fontSize:14, color:PA.ink3, marginTop:1, transform: isOpen? 'rotate(180deg)':'none', transition:'transform .15s' }}>⌄</span>
                </button>
                {isOpen && (
                  <div style={{ padding:'0 14px 14px', fontSize:14, color:PA.ink2, lineHeight:1.5 }}>{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <PRowGroup header="Still need help?">
        <PRow icon="✉" label="Contact support" chevron/>
        <PRow icon="📄" label="Open user guide" chevron isLast/>
      </PRowGroup>
      <div style={{ height:24 }}/>
    </ParentScroll>
  );
}

// ── 8. Reconnecting Overlay (child-facing, modal-style) ──
function S_ReconnectingOverlay({ go, robotProps }){
  React.useEffect(()=>{
    const t = setTimeout(()=>go('robot_listening'), 2400);
    return ()=>clearTimeout(t);
  }, []);
  return (
    <ScreenShell persona="parent" bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      {/* faded background hint of lesson */}
      <div style={{ position:'absolute', inset:0, opacity:0.35, pointerEvents:'none' }}>
        <TopBar/>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Robot emotion="idle" size={180} {...robotProps}/>
        </div>
      </div>

      {/* dimmer */}
      <div style={{ position:'absolute', inset:0, background:'rgba(43,33,64,0.45)', backdropFilter:'blur(4px)' }}/>

      {/* card */}
      <div style={{
        position:'absolute', left:24, right:24, top:'50%', transform:'translateY(-50%)',
        background:'#fff', borderRadius:28, padding:'28px 22px',
        boxShadow:'0 20px 60px rgba(0,0,0,.25)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14,
      }}>
        <Robot emotion="worry" size={140} accent="var(--plum)" {...robotProps}/>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, color:'var(--ink)', textAlign:'center' }}>
          I'm trying to connect again…
        </div>
        <div style={{ display:'flex', gap:6, marginTop:2 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width:10, height:10, borderRadius:5, background:'var(--plum)',
              animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite` }}/>
          ))}
        </div>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          marginTop:6, background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>Stop and go home</button>
      </div>
    </ScreenShell>
  );
}

// ── 9. Audio Permission Recovery (parent-facing how-to) ──
function S_AudioRecovery({ go }){
  const Step = ({ n, title, body }) => (
    <div style={{ display:'flex', gap:14, padding:'12px 14px', borderBottom:`1px solid ${PA.hair}` }}>
      <div style={{
        width:28, height:28, borderRadius:'50%', background:'#EEF1F5', color:PA.ink,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums',
      }}>{n}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:500, color:PA.ink, marginBottom:2 }}>{title}</div>
        <div style={{ fontSize:13, color:PA.ink2, lineHeight:1.45 }}>{body}</div>
      </div>
    </div>
  );
  return (
    <ParentScroll title="Microphone access" onBack={()=>go('mic_missing')}>
      <div style={{ padding:'18px 20px 8px' }}>
        <div style={{ fontSize:18, fontWeight:600, letterSpacing:-0.2, color:PA.ink, marginBottom:6 }}>
          Microphone access is needed for speaking practice.
        </div>
        <div style={{ fontSize:14, color:PA.ink2, lineHeight:1.5 }}>
          The mic only turns on during a lesson. No recordings are saved. Follow these steps to enable it on this device.
        </div>
      </div>

      <div style={{ padding:'14px 16px 4px' }}>
        <div style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:14, overflow:'hidden' }}>
          <Step n="1" title="Open device Settings" body="Leave the app and open Settings on this device."/>
          <Step n="2" title="Find Robot English" body="Scroll to find the Robot English app in your installed apps."/>
          <Step n="3" title="Allow Microphone" body="Toggle Microphone on. Then return to the app."/>
          <div style={{ padding:'12px 14px' }}>
            <div style={{ display:'flex', gap:14 }}>
              <div style={{ width:28, flexShrink:0 }}/>
              <div style={{ fontSize:13, color:PA.ink2, lineHeight:1.45 }}>
                We'll detect the change automatically and your child can keep going.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button style={{
          width:'100%', minHeight:48, borderRadius:10, border:'none', background:PA.accent, color:'#fff',
          fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'inherit',
        }}>Open device Settings</button>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          width:'100%', minHeight:48, borderRadius:10, border:`1px solid ${PA.hair}`, background:PA.card, color:PA.ink,
          fontWeight:500, fontSize:15, cursor:'pointer', fontFamily:'inherit',
        }}>Back to play area</button>
      </div>

      <div style={{ padding:'16px 20px 36px', fontSize:12, color:PA.ink3, lineHeight:1.5 }}>
        No lesson transcript is shown in this version. Your child's voice is processed in real time and not stored.
      </div>
    </ParentScroll>
  );
}

// ── 10. Lesson Resume Screen (child-facing) ──
function S_LessonResume({ go, robotProps }){
  return (
    <ScreenShell persona="parent" bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <TopBar onBack={()=>go('home')}/>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'90px 24px 240px', gap:18 }}>
        <Robot emotion="happy" size={220} {...robotProps}/>
        <SpeechBubble>Welcome back!<br/>Want to keep going?</SpeechBubble>

        {/* lesson card */}
        <div style={{
          background:'#fff', borderRadius:24, padding:'16px 18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          display:'flex', alignItems:'center', gap:14, width:'min(320px, 90%)',
        }}>
          <div style={{ width:54, height:54, borderRadius:16, background:'var(--coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📖</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>Where we stopped</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>How are you?</div>
            <div style={{ marginTop:6, height:6, borderRadius:3, background:'rgba(0,0,0,.06)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:'60%', background:'var(--mint)', borderRadius:3 }}/>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', left:24, right:24, bottom:48, display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('robot_speaking')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Keep going</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Stop for now</button>
      </div>
    </ScreenShell>
  );
}

const FALLBACK_SCREEN_MAP = {
  kid_settings:          S_KidSettings,
  mic_missing:           S_MicMissing,
  network_error:         S_NetworkError,
  voice_failed:          S_VoiceFailed,
  login_error:           S_LoginError,
  safety_redirect:       S_SafetyRedirect,
  help_faq:              S_HelpFAQ,
  reconnecting_overlay:  S_ReconnectingOverlay,
  audio_recovery:        S_AudioRecovery,
  lesson_resume:         S_LessonResume,
};

const FALLBACK_STATES = [
  { id:'kid_settings',         title:'Settings',                group:'Fallback' },
  { id:'mic_missing',          title:'Mic Permission Missing',  group:'Fallback' },
  { id:'network_error',        title:'Network Error',           group:'Fallback' },
  { id:'voice_failed',         title:'Voice Session Failed',    group:'Fallback' },
  { id:'login_error',          title:'Login Error',             group:'Fallback' },
  { id:'safety_redirect',      title:'Safety Redirect',         group:'Fallback' },
  { id:'help_faq',             title:'Help & FAQ',              group:'Fallback' },
  { id:'reconnecting_overlay', title:'Reconnecting Overlay',    group:'Fallback' },
  { id:'audio_recovery',       title:'Audio Permission Recovery', group:'Fallback' },
  { id:'lesson_resume',        title:'Lesson Resume',           group:'Fallback' },
];

Object.assign(window, { FALLBACK_SCREEN_MAP, FALLBACK_STATES });
