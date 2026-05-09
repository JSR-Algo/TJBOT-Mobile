// Parent Space — adult-facing, calm, structured
// 6 frames: parent_gate, parent_summary, parent_today, parent_history, parent_safety, parent_settings

// ── parent shared bits ──
// Quiet adult palette: neutrals + slate, no kid-bright fills.
const PA = {
  bg: '#F5F5F2',
  card: '#FFFFFF',
  ink: '#1A1A1F',
  ink2: '#5A5A66',
  ink3: '#8B8B96',
  hair: 'rgba(0,0,0,0.07)',
  accent: '#2A6FDB',
  good: '#1F8A5B',
  warn: '#A06900',
};

function ParentScroll({ children, title, onBack, right }){
  return (
    <div style={{ height:'100%', overflow:'auto', background:PA.bg, position:'relative', WebkitFontSmoothing:'antialiased', fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Text", system-ui, sans-serif', color:PA.ink }}>
      {title !== undefined && (
        <div style={{
          position:'sticky', top:0, zIndex:5, background:PA.bg,
          padding:'56px 20px 12px', display:'flex', alignItems:'center', gap:12,
          borderBottom:`1px solid ${PA.hair}`,
        }}>
          {onBack && (
            <button onClick={(e)=>{e.stopPropagation(); onBack();}} style={{
              width:32, height:32, borderRadius:8, border:'none', background:'transparent',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:PA.ink2,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <div style={{ flex:1, fontWeight:600, fontSize:17, letterSpacing:-0.2 }}>{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// Generic settings row group (iOS-style inset card)
function PRowGroup({ header, footer, children }){
  return (
    <div style={{ padding:'14px 16px 0' }}>
      {header && <div style={{ fontSize:12, color:PA.ink3, padding:'0 4px 6px', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>{header}</div>}
      <div style={{ background:PA.card, borderRadius:14, overflow:'hidden', border:`1px solid ${PA.hair}` }}>{children}</div>
      {footer && <div style={{ fontSize:12, color:PA.ink3, padding:'8px 4px 0', lineHeight:1.45 }}>{footer}</div>}
    </div>
  );
}
function PRow({ icon, label, value, toggle, onToggle, chevron, danger, onClick, isLast }){
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:12, minHeight:48, padding:'10px 14px',
      borderBottom: isLast? 'none' : `1px solid ${PA.hair}`,
      cursor: onClick? 'pointer':'default',
    }}>
      {icon && <div style={{ width:28, height:28, borderRadius:7, background:'#EEF1F5', color:PA.ink2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>{icon}</div>}
      <div style={{ flex:1, fontSize:15, color: danger? '#C0392B' : PA.ink, fontWeight: danger? 500 : 400 }}>{label}</div>
      {value !== undefined && <div style={{ fontSize:14, color:PA.ink2 }}>{value}</div>}
      {toggle !== undefined && (
        <div onClick={(e)=>{e.stopPropagation(); onToggle && onToggle(!toggle);}} style={{
          width:42, height:25, borderRadius:13, background: toggle? PA.good : '#D8D8DD',
          position:'relative', transition:'background .15s', cursor:'pointer', flexShrink:0,
        }}>
          <div style={{ position:'absolute', top:2, left: toggle? 19:2, width:21, height:21, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .15s' }}/>
        </div>
      )}
      {chevron && <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink:0 }}><path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>}
    </div>
  );
}

// ── 1. Parent Gate ──
function S_ParentGate({ go, robotProps }){
  // type-the-shown-number. randomized per mount; not a real auth.
  const [target] = React.useState(() => 100 + Math.floor(Math.random()*900));
  const [val, setVal] = React.useState('');
  const ok = val === String(target);

  React.useEffect(()=>{
    if (ok) { const t = setTimeout(()=>go('parent_summary'), 280); return ()=>clearTimeout(t); }
  }, [ok]);

  return (
    <div style={{ height:'100%', background:PA.bg, color:PA.ink, fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'68px 28px 0' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:PA.ink2,
          padding:0, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to play
        </button>
      </div>
      <div style={{ flex:1, padding:'40px 28px 28px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PA.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2"/>
            <path d="M8 10V7a4 4 0 018 0v3"/>
          </svg>
        </div>
        <div style={{ fontSize:24, fontWeight:600, letterSpacing:-0.4, marginBottom:8 }}>Parent Space</div>
        <div style={{ fontSize:15, color:PA.ink2, lineHeight:1.45, marginBottom:32 }}>
          To continue, please type the number below. This keeps the parent area separate from the play area.
        </div>

        <div style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:14, padding:'22px 20px', marginBottom:18 }}>
          <div style={{ fontSize:12, color:PA.ink3, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Type this number</div>
          <div style={{ fontSize:38, fontWeight:600, letterSpacing:8, fontVariantNumeric:'tabular-nums', marginBottom:18, color:PA.ink }}>{target}</div>
          <input
            inputMode="numeric"
            value={val}
            onChange={e=>setVal(e.target.value.replace(/\D/g,'').slice(0,3))}
            placeholder="—"
            style={{
              width:'100%', border:'none', borderBottom:`2px solid ${ok? PA.good : PA.hair}`,
              background:'transparent', outline:'none',
              fontSize:24, padding:'8px 0', fontVariantNumeric:'tabular-nums', letterSpacing:6, color:PA.ink,
              fontFamily:'inherit',
            }}
          />
        </div>
        <div style={{ fontSize:13, color:PA.ink3, lineHeight:1.5 }}>
          This is a speed bump, not a password. Children using the device on their own will see the play area only.
        </div>
      </div>
    </div>
  );
}

// ── 2. Parent Summary ──
function S_ParentSummary({ go }){
  return (
    <ParentScroll
      title="Parent Space"
      right={<button onClick={(e)=>{e.stopPropagation(); go('parent_settings');}} style={{ background:'transparent', border:'none', color:PA.accent, fontSize:15, fontWeight:500, cursor:'pointer' }}>Settings</button>}
    >
      {/* Today summary card */}
      <div style={{ padding:'18px 16px 8px' }}>
        <div style={{ fontSize:13, color:PA.ink3, marginBottom:6 }}>Today · Tuesday, Mar 12</div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, lineHeight:1.25, marginBottom:18 }}>
          Mira practiced greetings and feelings for about 8 minutes.
        </div>

        {/* simple stat row, no charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { v:'8', l:'minutes' },
            { v:'1', l:'lesson' },
            { v:'8', l:'speaking turns' },
          ].map(s=>(
            <div key={s.l} style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:12, padding:'12px 12px' }}>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:PA.ink, fontVariantNumeric:'tabular-nums' }}>{s.v}</div>
              <div style={{ fontSize:12, color:PA.ink2, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <button onClick={(e)=>{e.stopPropagation(); go('parent_today');}} style={{
          width:'100%', background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:12,
          padding:'14px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', textAlign:'left',
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:500, color:PA.ink }}>What Mira practiced today</div>
            <div style={{ fontSize:13, color:PA.ink2, marginTop:2 }}>Greetings · feelings · 3 new words</div>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
        </button>
      </div>

      <PRowGroup header="History">
        <PRow icon="🗓" label="Past 30 days" value="22 days active" chevron onClick={()=>go('parent_history')}/>
        <PRow icon="📚" label="Course progress" value="Unit 3 of 8" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Account">
        <PRow icon="🛡" label="Safety & Privacy" chevron onClick={()=>go('parent_safety')}/>
        <PRow icon="⚙" label="Settings" chevron onClick={()=>go('parent_settings')} isLast/>
      </PRowGroup>

      <div style={{ padding:'18px 24px 36px', textAlign:'center' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:PA.accent, fontSize:15, fontWeight:500, cursor:'pointer',
        }}>Return to child play area</button>
      </div>
    </ParentScroll>
  );
}

// ── 3. What Child Practiced Today ──
function S_ParentToday({ go }){
  return (
    <ParentScroll title="Today" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'18px 16px 8px' }}>
        <div style={{ fontSize:13, color:PA.ink3, marginBottom:6 }}>Tuesday, Mar 12 · 4:12 PM</div>
        <div style={{ fontSize:20, fontWeight:600, letterSpacing:-0.3, lineHeight:1.3, marginBottom:18 }}>
          Mira practiced greetings, feelings, and three new words.
        </div>
      </div>

      <PRowGroup header="Lesson">
        <PRow icon="📖" label="How are you?" value="Unit 3 · Lesson 3"/>
        <PRow icon="⏱" label="Time on task" value="8 min"/>
        <PRow icon="🎤" label="Speaking turns" value="8" isLast/>
      </PRowGroup>

      <PRowGroup header="Words practiced" footer="We don't store voice recordings or transcripts. These summaries are generated from lesson activity.">
        {[
          { w:'Hello', s:'getting stronger' },
          { w:'Cat', s:'getting stronger' },
          { w:'Happy', s:'new this week' },
          { w:'Friend', s:'visit again soon' },
          { w:'Dog', s:'visit again soon' },
        ].map((r,i,a)=>(
          <PRow key={r.w} label={r.w} value={r.s} isLast={i===a.length-1}/>
        ))}
      </PRowGroup>

      <PRowGroup header="What's next">
        <PRow icon="→" label="Continue Unit 3" value="Lesson 4" chevron/>
        <PRow icon="↻" label="Review 2 words" chevron isLast/>
      </PRowGroup>

      <div style={{ height:24 }}/>
    </ParentScroll>
  );
}

// ── 4. Past Daily Summaries — last 30 days ──
function S_ParentHistory({ go }){
  // 30 days of synthetic summaries
  const days = React.useMemo(()=>{
    const out = [];
    const verbs = ['Greetings & feelings','Family words','Numbers 1–10','Animals','Daily routines','Color words','Food vocabulary','Polite phrases'];
    for (let i=0; i<30; i++){
      const active = i % 7 !== 5; // weekend skip pattern
      const min = 4 + ((i*3)%9);
      const turns = 5 + ((i*7)%10);
      const date = new Date(); date.setDate(date.getDate()-i);
      out.push({
        i,
        date,
        active,
        min,
        turns,
        topic: verbs[i % verbs.length],
      });
    }
    return out;
  }, []);

  // group by week
  const fmtDay = d => d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });

  return (
    <ParentScroll title="Past 30 days" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'14px 16px 4px' }}>
        <div style={{ display:'flex', gap:14, fontSize:13, color:PA.ink2 }}>
          <div><b style={{ color:PA.ink, fontWeight:600 }}>22</b> active days</div>
          <div style={{ width:1, background:PA.hair }}/>
          <div><b style={{ color:PA.ink, fontWeight:600 }}>2h 48m</b> total</div>
          <div style={{ width:1, background:PA.hair }}/>
          <div><b style={{ color:PA.ink, fontWeight:600 }}>14</b> lessons</div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 28px' }}>
        <div style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:14, overflow:'hidden' }}>
          {days.map((d, i)=>(
            <div key={d.i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              borderBottom: i===days.length-1? 'none' : `1px solid ${PA.hair}`,
              opacity: d.active? 1 : 0.55,
            }}>
              {/* day chip */}
              <div style={{
                width:42, flexShrink:0, textAlign:'center', padding:'6px 0',
                background: d.active? '#EEF1F5':'transparent',
                borderRadius:8,
              }}>
                <div style={{ fontSize:10, color:PA.ink3, textTransform:'uppercase', letterSpacing:0.5, fontWeight:600 }}>
                  {d.date.toLocaleDateString(undefined,{ month:'short' })}
                </div>
                <div style={{ fontSize:16, fontWeight:600, color:PA.ink, fontVariantNumeric:'tabular-nums', lineHeight:1.1 }}>
                  {d.date.getDate()}
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, color: d.active? PA.ink : PA.ink3, fontWeight: d.active? 500: 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {d.active? d.topic : 'No practice'}
                </div>
                {d.active && (
                  <div style={{ fontSize:12, color:PA.ink2, marginTop:2 }}>
                    {d.min} min · {d.turns} speaking turns
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:PA.ink3, padding:'10px 4px 0', lineHeight:1.5 }}>
          Daily summaries are kept for 30 days, then deleted automatically.
        </div>
      </div>
    </ParentScroll>
  );
}

// ── 5. Safety and Privacy ──
function S_ParentSafety({ go }){
  const Section = ({ title, body, items }) => (
    <div style={{ padding:'18px 20px 4px' }}>
      <div style={{ fontSize:16, fontWeight:600, color:PA.ink, marginBottom:6, letterSpacing:-0.2 }}>{title}</div>
      {body && <div style={{ fontSize:14, color:PA.ink2, lineHeight:1.5, marginBottom: items? 10:0 }}>{body}</div>}
      {items && (
        <ul style={{ margin:0, padding:'0 0 0 18px', color:PA.ink2, fontSize:14, lineHeight:1.6 }}>
          {items.map((x,i)=> <li key={i} style={{ marginBottom:4 }}>{x}</li>)}
        </ul>
      )}
    </div>
  );
  return (
    <ParentScroll title="Safety & Privacy" onBack={()=>go('parent_summary')}>
      <Section
        title="Microphone"
        body="The microphone turns on only during a lesson, while your child is speaking with the robot. It turns off automatically when the lesson ends or the app goes to the background."
      />
      <Section
        title="Voice data"
        items={[
          'Your child\'s voice is processed in real time and is not saved.',
          'We do not store audio recordings.',
          'We do not store word-by-word transcripts.',
          'Lesson summaries (which words were practiced, how long) are saved for 30 days.',
        ]}
      />
      <Section
        title="Child safety"
        items={[
          'No chat, friends, or social features.',
          'No advertising. No third-party trackers.',
          'No links out of the app from the play area.',
          'Purchases and account changes live in Parent Space only.',
        ]}
      />
      <Section
        title="What we collect"
        body="A pseudonymous learner ID, lesson summaries (last 30 days), app version, and crash diagnostics. We do not collect contact info or location."
      />

      <PRowGroup>
        <PRow icon="📄" label="Privacy Policy" chevron/>
        <PRow icon="📄" label="Terms of Service" chevron/>
        <PRow icon="✉" label="Contact privacy team" chevron isLast/>
      </PRowGroup>

      <div style={{ padding:'10px 20px 36px', fontSize:12, color:PA.ink3, lineHeight:1.5 }}>
        Robot English is designed for children ages 5–9 and complies with children's privacy regulations including COPPA and GDPR-K.
      </div>
    </ParentScroll>
  );
}

// ── 6. Parent Settings ──
function S_ParentSettings({ go }){
  const [mic, setMic] = React.useState(true);
  const [sound, setSound] = React.useState(true);
  const [haptics, setHaptics] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(false);
  const [lessonLen, setLessonLen] = React.useState('Standard');
  const [lang, setLang] = React.useState(() => (window.__tbot && window.__tbot.getLang && window.__tbot.getLang()) || 'vi');
  const pickLang = (v) => { setLang(v); if (window.__tbot && window.__tbot.setLang) window.__tbot.setLang(v); };
  const langLabel = lang==='vi' ? 'Tiếng Việt' : lang==='en' ? 'English' : 'Tiếng Việt + English';

  return (
    <ParentScroll title="Settings" onBack={()=>go('parent_summary')}>
      <PRowGroup header="Language" footer="Changes apply to the whole app — for both child and parent surfaces.">
        <PRow icon="🌐" label="App language" value={langLabel} isLast/>
        <div style={{ padding:'0 16px 14px', display:'flex', gap:8, background:'#fff', borderTop:`1px solid ${PA.hair}` }}>
          {[
            {v:'vi',  label:'Tiếng Việt'},
            {v:'both',label:'VI + EN'},
            {v:'en',  label:'English'},
          ].map(o => (
            <button
              key={o.v}
              data-no-i18n
              onClick={(e)=>{ e.stopPropagation(); pickLang(o.v); }}
              style={{
                flex:1, padding:'10px 8px', marginTop:12, borderRadius:10,
                border:`1px solid ${lang===o.v ? PA.accent : PA.hair}`,
                background: lang===o.v ? PA.accent : '#fff',
                color: lang===o.v ? '#fff' : PA.ink,
                fontSize:14, fontWeight:600, cursor:'pointer',
              }}>{o.label}</button>
          ))}
        </div>
      </PRowGroup>

      <PRowGroup header="Child profile">
        <PRow icon="👤" label="Name" value="Mira" chevron/>
        <PRow icon="🎂" label="Age" value="7" chevron/>
        <PRow icon="🎯" label="Learning level" value="Beginner" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Lesson">
        <PRow icon="⏱" label="Lesson length" value={lessonLen} chevron onClick={()=>setLessonLen(lessonLen==='Short'?'Standard': lessonLen==='Standard'?'Long':'Short')}/>
        <PRow icon="🔔" label="Daily reminder" value="4:00 PM" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Audio & feedback" footer="Microphone is required for speaking practice. Turning it off pauses voice lessons.">
        <PRow icon="🎤" label="Microphone" toggle={mic} onToggle={setMic}/>
        <PRow icon="🔊" label="Sound effects" toggle={sound} onToggle={setSound}/>
        <PRow icon="📳" label="Haptics" toggle={haptics} onToggle={setHaptics} isLast/>
      </PRowGroup>

      <PRowGroup header="Privacy">
        <PRow icon="📊" label="Anonymous usage analytics" toggle={analytics} onToggle={setAnalytics}/>
        <PRow icon="🛡" label="Safety & Privacy details" chevron onClick={()=>go('parent_safety')}/>
        <PRow icon="🗑" label="Delete child's data" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Subscription">
        <PRow icon="✦" label="Robot English Plus" value="Active" chevron/>
        <PRow icon="💳" label="Manage billing" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Support">
        <PRow icon="?" label="Help center" chevron/>
        <PRow icon="✉" label="Contact support" chevron/>
        <PRow icon="ⓘ" label="About Robot English" value="v1.0.2" chevron isLast/>
      </PRowGroup>

      <PRowGroup>
        <PRow label="Sign out" danger onClick={()=>{}} isLast/>
      </PRowGroup>

      <div style={{ height:36 }}/>
    </ParentScroll>
  );
}

const PARENT_SCREEN_MAP = {
  parent_gate:     S_ParentGate,
  parent_summary:  S_ParentSummary,
  parent_today:    S_ParentToday,
  parent_history:  S_ParentHistory,
  parent_safety:   S_ParentSafety,
  parent_settings: S_ParentSettings,
};

const PARENT_STATES = [
  { id:'parent_gate',     title:'Parent Gate',      group:'Parent' },
  { id:'parent_summary',  title:'Parent Summary',   group:'Parent' },
  { id:'parent_today',    title:'Practiced Today',  group:'Parent' },
  { id:'parent_history',  title:'Past 30 Days',     group:'Parent' },
  { id:'parent_safety',   title:'Safety & Privacy', group:'Parent' },
  { id:'parent_settings', title:'Parent Settings',  group:'Parent' },
];

Object.assign(window, { PARENT_SCREEN_MAP, PARENT_STATES });
