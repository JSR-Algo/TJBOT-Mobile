// Robot device companion — mobile app screens for the physical Robot.
// Parent-focused: pair, device home, live session monitor, content sync,
// firmware, lost-and-found. Plus an LCD face library + a marketing-style
// "How they work together" overview.
// Reuses ScreenShell, TopBar, CircleBtn, PrimaryCTA, OnbShell, OB tokens.

const DV = {
  bg:'#F5F5F2', card:'#FFFFFF', ink:'#1A1A1F', ink2:'#5A5A66', ink3:'#8B8B96',
  hair:'rgba(0,0,0,0.07)', accent:'#2A6FDB', good:'#1F8A5B', warn:'#C99227',
};

function DvBigBtn({ children, onClick, secondary, danger }){
  if (secondary) return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:`1px solid ${DV.hair}`,
      background:'#fff', color:DV.ink, fontFamily:'inherit', fontWeight:500, fontSize:16, cursor:'pointer',
    }}>{children}</button>
  );
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:'none',
      background: danger? '#C0392B' : DV.accent, color:'#fff',
      fontFamily:'inherit', fontWeight:600, fontSize:16, cursor:'pointer',
      boxShadow:'0 1px 0 rgba(0,0,0,.04), 0 6px 18px rgba(42,111,219,.18)',
    }}>{children}</button>
  );
}

function DvShell({ title, onBack, children, persona='parent' }){
  return (
    <div data-persona={persona} style={{ height:'100%', overflow:'auto', background:DV.bg, color:DV.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', WebkitFontSmoothing:'antialiased' }}>
      <div style={{ position:'sticky', top:0, zIndex:5, background:DV.bg, padding:'56px 20px 12px',
        display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${DV.hair}` }}>
        {onBack && (
          <button onClick={(e)=>{e.stopPropagation(); onBack();}} style={{
            width:32, height:32, borderRadius:8, border:'none', background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:DV.ink2,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div style={{ flex:1, fontWeight:600, fontSize:17, letterSpacing:-0.2 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function DvRow({ icon, title, body, right, onClick, danger }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 14px',
      background:'transparent', border:'none', borderBottom:`1px solid ${DV.hair}`, cursor:'pointer', textAlign:'left',
    }}>
      {icon && <div style={{ width:36, height:36, borderRadius:9, background:'#EEF1F5', color: danger? '#C0392B' : DV.ink, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:500, color: danger? '#C0392B' : DV.ink, marginBottom: body? 2 : 0 }}>{title}</div>
        {body && <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.4, textWrap:'pretty' }}>{body}</div>}
      </div>
      {right ? right : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────
// LCD Face Library — full component board (20 states, grouped, with notes)
// ──────────────────────────────────────────────────
function S_LCDLibrary({ tweaks, robotProps }){
  const accent = tweaks?.accent || '#FF6F61';
  const groups = ['Conversation','Feedback','System','Safety','Lifecycle'];
  const groupColors = {
    Conversation:'#6FC1FF', Feedback:'#7BD389', System:'#E8A33C', Safety:'#9B8FB8', Lifecycle:'#FF6F61',
  };
  return (
    <div style={{ height:'100%', overflow:'auto', background:DV.bg, color:DV.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', WebkitFontSmoothing:'antialiased' }}>
      {/* Header */}
      <div style={{ padding:'56px 20px 18px', borderBottom:`1px solid ${DV.hair}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Robot · LCD face system</div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.4, lineHeight:1.15, color:DV.ink, textWrap:'pretty' }}>
          20 faces, one warm character.
        </div>
        <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.5, marginTop:6, textWrap:'pretty' }}>
          Designed for a 3.2&quot; / 320×240 LCD. Bold features, no small text, readable at 1–2 m. No anger, no red Xs, no scary warnings.
        </div>
      </div>

      {/* Design rules strip */}
      <div style={{ padding:'14px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { t:'Eyes carry feeling', b:'Shape changes do most of the work — happy arcs, soft circles, droopy curves.' },
          { t:'Cheeks = warmth', b:'Soft coral cheeks appear in friendly states, hide in serious ones.' },
          { t:'Color cues, not text', b:'Coral = listen, green = heard, yellow = wait, lavender = pause.' },
          { t:'Animation tells state', b:'Bob, blink, tilt, ring-pulse — each motion has one meaning.' },
        ].map((r,i)=>(
          <div key={i} style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:12, fontWeight:600, color:DV.ink }}>{r.t}</div>
            <div style={{ fontSize:11, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
          </div>
        ))}
      </div>

      {/* Face grid by group */}
      {groups.map(g=>{
        const items = LCD_STATES_LIST.filter(s=>s.group===g);
        if (!items.length) return null;
        return (
          <div key={g} style={{ padding:'22px 16px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 4px 10px' }}>
              <span style={{ width:10, height:10, borderRadius:5, background:groupColors[g] }}/>
              <div style={{ fontSize:11, fontWeight:700, color:DV.ink2, textTransform:'uppercase', letterSpacing:0.6 }}>{g}</div>
              <div style={{ flex:1, height:1, background:DV.hair }}/>
              <div style={{ fontSize:11, color:DV.ink3 }}>{items.length}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
              {items.map(s => (
                <div key={s.id} style={{ background:DV.card, borderRadius:14, border:`1px solid ${DV.hair}`, overflow:'hidden' }}>
                  <div style={{ background:'#0E1116' }}>
                    <LCDFace emotion={s.id} size={300} accent={accent}/>
                  </div>
                  <div style={{ padding:'12px 14px 14px' }}>
                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                      <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>{s.label}</div>
                      <div style={{ fontSize:10, fontFamily:'ui-monospace, monospace', color:DV.ink3 }}>{s.id}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:groupColors[g], background: groupColors[g]+'22', padding:'3px 7px', borderRadius:8, textTransform:'uppercase', letterSpacing:0.4 }}>{g}</span>
                    </div>
                    <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.45, textWrap:'pretty', marginBottom:6 }}>
                      <b style={{ color:DV.ink }}>Animation.</b> {s.anim}
                    </div>
                    <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.45, textWrap:'pretty' }}>
                      <b style={{ color:DV.ink }}>Use.</b> {s.use}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Anti-patterns */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink2, textTransform:'uppercase', letterSpacing:0.6, padding:'4px 4px 8px' }}>Never do this</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            { t:'No red Xs', b:'Use a soft "almost!" face with a kind smile. Wrong is part of learning.' },
            { t:'No furrowed-brow anger', b:'Robot is patient. Even off-topic redirects use a friendly tilt.' },
            { t:'No alarming warnings', b:'Safety pause uses lavender glow + shield-check, not red flashes.' },
            { t:'No tiny text on the LCD', b:'Anything text-shaped must be 24&nbsp;px+ at 1× and a known glyph (z, !, %).' },
          ].map((r,i,a)=>(
            <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none', alignItems:'flex-start' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'#F4E5DF', color:'#C0392B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700, fontSize:14 }}>×</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:DV.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }} dangerouslySetInnerHTML={{__html:r.b}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height:40 }}/>
    </div>
  );
}

// ──────────────────────────────────────────────────
// One Lesson Turn — filmstrip preview of state changes
// ──────────────────────────────────────────────────
function S_LCDLessonTurn({ tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const turn = [
    { id:'speak',       label:'1 · Robot speaks',       caption:'Mouth opens, gentle bob.',          words:'"Say… apple."',        ms:'~1.4 s' },
    { id:'listen',      label:'2 · Robot listens',      caption:'Coral ring breathes, mic open.',     words:'(silence — ear up)',    ms:'~3.0 s' },
    { id:'child_speak', label:'3 · Child speaks',       caption:'Green ring + ear bars bounce.',      words:'"Apple!"',              ms:'~1.2 s' },
    { id:'think',       label:'4 · Robot thinks',       caption:'Eyes look up, three dots pop.',      words:'(processing)',          ms:'~0.4 s' },
    { id:'success',     label:'5 · Robot celebrates',   caption:'Sparkles + green glow + big smile.', words:'"Yes! Apple!"',         ms:'~1.6 s' },
  ];
  return (
    <div style={{ height:'100%', overflow:'auto', background:DV.bg, color:DV.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif' }}>
      <div style={{ padding:'56px 20px 16px', borderBottom:`1px solid ${DV.hair}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>One lesson turn</div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.4, lineHeight:1.15 }}>
          Robot speaks → listens → child speaks → thinks → celebrates.
        </div>
        <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.5, marginTop:6, textWrap:'pretty' }}>
          The whole loop is about 8 seconds. Each face is unmistakable from across a room.
        </div>
      </div>

      {/* Timeline header */}
      <div style={{ padding:'18px 16px 8px' }}>
        <div style={{ position:'relative', height:24, marginBottom:14 }}>
          <div style={{ position:'absolute', top:11, left:0, right:0, height:2, background:DV.hair }}/>
          <div style={{ position:'absolute', top:11, left:0, width:'100%', height:2,
            background:`linear-gradient(90deg, #FFD66E 0%, ${accent} 25%, #7BD389 50%, #6FC1FF 70%, #7BD389 100%)`, borderRadius:2 }}/>
          {turn.map((t,i)=>(
            <div key={t.id} style={{ position:'absolute', top:0, left:`${(i/(turn.length-1))*100}%`, transform:'translateX(-50%)' }}>
              <div style={{ width:14, height:14, borderRadius:7, background:'#fff', border:`2px solid ${DV.ink}`, boxShadow:'0 1px 0 rgba(0,0,0,.04)' }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Filmstrip */}
      <div style={{ padding:'4px 16px 0', display:'flex', flexDirection:'column', gap:14 }}>
        {turn.map((t,i)=>(
          <div key={t.id} style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ background:'#0E1116', position:'relative' }}>
              <LCDFace emotion={t.id} size={300} accent={accent}/>
              <div style={{ position:'absolute', top:8, left:10, fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:0.6, fontFamily:'ui-monospace, monospace' }}>frame · {i+1}/{turn.length}</div>
              <div style={{ position:'absolute', top:8, right:10, fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', fontFamily:'ui-monospace, monospace' }}>{t.ms}</div>
            </div>
            <div style={{ padding:'12px 14px 14px' }}>
              <div style={{ fontSize:14, fontWeight:600, color:DV.ink }}>{t.label}</div>
              <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.4, marginTop:3, textWrap:'pretty' }}>{t.caption}</div>
              <div style={{ marginTop:8, padding:'8px 10px', background:'#F5F5F2', borderRadius:8, fontSize:13, color:DV.ink, fontStyle:'italic', lineHeight:1.3 }}>{t.words}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Transitions notes */}
      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink2, textTransform:'uppercase', letterSpacing:0.6, padding:'4px 4px 8px' }}>Transitions</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            { t:'speak → listen', b:'Mouth shrinks O → o; ring fades from yellow to coral over 200 ms.' },
            { t:'listen → child_speak', b:'Eyes pop wider; ring color + ear bars come in together within 100 ms of voice activity.' },
            { t:'child_speak → think', b:'Ear bars stop, eyes flick up, three dots pop in over 250 ms.' },
            { t:'think → success', b:'Eyes blend think→happy arcs; sparkles & green ring rise; mouth opens to big.' },
            { t:'didn\'t_hear / try_again', b:'Branch from listen if no audio after ~3 s — never punitive.' },
          ].map((r,i,a)=>(
            <div key={i} style={{ padding:'10px 12px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none' }}>
              <div style={{ fontSize:13, fontWeight:600, color:DV.ink, fontFamily:'ui-monospace, monospace' }}>{r.t}</div>
              <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height:40 }}/>
    </div>
  );
}

// ──────────────────────────────────────────────────
// How they work together — overview / system map
// ──────────────────────────────────────────────────
function S_DeviceOverview({ tweaks, go }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <div style={{ height:'100%', overflow:'auto', background:'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)',
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif' }}>
      <div style={{ padding:'72px 24px 24px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', letterSpacing:-0.4, lineHeight:1.1, marginBottom:8 }}>
          One product.<br/>Two devices.
        </div>
        <div style={{ fontSize:14, color:'var(--ink-soft)', lineHeight:1.5, textWrap:'pretty' }}>
          Robot is the child's speaking buddy. The phone is for the grown-up.
        </div>
      </div>

      {/* The pair */}
      <div style={{ padding:'8px 24px 24px', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:24,
        position:'relative' }}>
        {/* phone illustration */}
        <div style={{ width:124, height:240, borderRadius:22, background:'#1A1A1F', padding:6, position:'relative', boxShadow:'0 8px 24px rgba(0,0,0,.15)' }}>
          <div style={{ width:'100%', height:'100%', borderRadius:18, background:'#F5F5F2', overflow:'hidden', position:'relative' }}>
            <div style={{ padding:'14px 8px 8px', fontSize:9, fontWeight:700, color:DV.ink2, textAlign:'center' }}>Parent app</div>
            <div style={{ padding:'4px 6px', display:'flex', flexDirection:'column', gap:5 }}>
              <div style={{ background:'#fff', borderRadius:6, padding:6, fontSize:8, fontWeight:600, color:DV.ink, border:`1px solid ${DV.hair}` }}>Today: 1 lesson · 4 min</div>
              <div style={{ background:'#fff', borderRadius:6, padding:6, fontSize:7, color:DV.ink2, border:`1px solid ${DV.hair}` }}>Robot is online ●</div>
              <div style={{ background:'#fff', borderRadius:6, padding:6, fontSize:7, color:DV.ink2, border:`1px solid ${DV.hair}` }}>Unit 2 unlocked</div>
            </div>
          </div>
        </div>
        {/* link arrows */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'center', paddingBottom:60 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M0 7h16m0 0l-5-5m5 5l-5 5" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:0.5 }}>Wi-Fi</div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M20 7H4m0 0l5-5m-5 5l5 5" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        </div>
        {/* robot */}
        <RobotDevice emotion="happy" size={180} accent={accent} name="Robot · the buddy"/>
      </div>

      {/* Roles split */}
      <div style={{ padding:'30px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          { t:'Robot does', items:['Listens to your child','Speaks back warmly','Shows the face & feedback','Plays the lesson out loud'], color:accent },
          { t:'Phone does', items:['Sets up & pairs','Picks the course','Shows progress to parents','Manages safety & billing'], color:DV.accent },
        ].map((c,i)=>(
          <div key={i} style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(8px)', borderRadius:14, padding:'14px 14px',
            border:'1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.color, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>{c.t}</div>
            <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
              {c.items.map((it,j)=>(
                <li key={j} style={{ fontSize:13, color:'var(--ink)', display:'flex', gap:6, alignItems:'flex-start', textWrap:'pretty', lineHeight:1.35 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="3" strokeLinecap="round" style={{ marginTop:4, flexShrink:0 }}><path d="M5 12l5 5 9-10"/></svg>
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Why a device */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Why a device, not a screen</div>
        <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(8px)', borderRadius:14, padding:'4px 4px',
          border:'1px solid rgba(0,0,0,0.05)' }}>
          {[
            { ic:'🎙️', t:'No phone in tiny hands', b:"Practice doesn't replace screen time — it sits on the desk like a toy." },
            { ic:'👀', t:'Eyes up, not down', b:'A face to look at, not a feed to scroll.' },
            { ic:'🔒', t:'Bounded experience', b:'No browsers, no apps, no surprises.' },
          ].map((row,i,a)=>(
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px', borderBottom: i<a.length-1? '1px solid rgba(0,0,0,0.05)':'none', alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{row.ic}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{row.t}</div>
                <div style={{ fontSize:12, color:'var(--ink-soft)', lineHeight:1.4, textWrap:'pretty' }}>{row.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 60px' }}>
        <PrimaryCTA onClick={()=>go && go('dv_pair_intro')} color="var(--coral)">Set up your Robot</PrimaryCTA>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Pairing flow — 12 frames, parent-facing
// ──────────────────────────────────────────────────

// 1 · Add Robot Device (entry from device home or empty state)
function S_PairAdd({ go, tweaks }){
  return (
    <DvShell title="Add a Robot" onBack={()=>go('dv_overview')}>
      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          Lessons happen <b style={{ color:DV.ink }}>on the Robot itself</b>, not your phone. The phone is just for setup and progress.
        </div>
      </div>
      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_intro');}} style={{
          background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px',
          display:'flex', gap:14, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <RobotDevice emotion="charging" size={64} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>I have a new Robot</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:2 }}>About 3 minutes — needs Wi-Fi</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_offline');}} style={{
          background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px',
          display:'flex', gap:14, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <div style={{ width:64, height:64, borderRadius:14, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={DV.ink2} strokeWidth="1.6"><path d="M3 12a9 9 0 109-9"/><path d="M12 7v5l3 2"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>My Robot is offline</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:2 }}>Reconnect or move to new Wi-Fi</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
      <div style={{ padding:'20px 20px 0', fontSize:12, color:DV.ink3, lineHeight:1.5, textWrap:'pretty' }}>
        You'll need: Robot, your home Wi-Fi password, and about 3 minutes.
      </div>
    </DvShell>
  );
}

// 2 · Turn on Robot
function S_PairIntro({ go }){
  return (
    <DvShell title="Turn on Robot" onBack={()=>go('dv_pair_add')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="charging" size={180} accent={DV.accent}/>
        <div style={{ marginTop:24, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center' }}>
          Power on your Robot
        </div>
        <div style={{ marginTop:8, fontSize:14, color:DV.ink2, textAlign:'center', maxWidth:320, lineHeight:1.5, textWrap:'pretty' }}>
          Hold the button on top for 2 seconds. You'll hear a chime and see a friendly face when it's ready.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { n:'1', t:'Plug in or use a charged Robot' },
          { n:'2', t:'Hold the top button until it chimes' },
          { n:'3', t:'Place Robot within 1–2 m of your phone' },
        ].map(s=>(
          <div key={s.n} style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'12px 14px', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:DV.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>{s.n}</div>
            <div style={{ fontSize:14, color:DV.ink }}>{s.t}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>go('dv_pair_search')}>My Robot is on</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 3 · Robot Searching
function S_PairSearch({ go }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('dv_pair_found'), 2400); return ()=>clearTimeout(t); }, []);
  return (
    <DvShell title="Looking for Robot…" onBack={()=>go('dv_pair_intro')}>
      <div style={{ padding:'40px 24px 30px', display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
        <div style={{ position:'relative', width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {[0,0.5,1].map(d=>(
            <div key={d} style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:`2px solid ${DV.accent}`, opacity:0.5, animation:`pair-pulse 1.6s ease-out ${d}s infinite` }}/>
          ))}
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="1.6" strokeLinecap="round"><path d="M5 12.55a11 11 0 0114 0M8.5 16.5a7 7 0 017 0M12 20l.01 0M2 8.82a15 15 0 0120 0"/></svg>
        </div>
        <div style={{ fontSize:18, fontWeight:600, textAlign:'center' }}>Looking nearby…</div>
        <div style={{ fontSize:13, color:DV.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>Make sure Robot is within 3 meters and showing a face.</div>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_failed');}} style={{ marginTop:20, background:'transparent', border:'none', fontSize:14, color:DV.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500 }}>I don't see my Robot</button>
        <style>{`@keyframes pair-pulse { 0% { transform:scale(.4); opacity:.6 } 100% { transform:scale(1.1); opacity:0 } }`}</style>
      </div>
    </DvShell>
  );
}

// 4 · Robot Found
function S_PairFound({ go, tweaks }){
  return (
    <DvShell title="We found your Robot" onBack={()=>go('dv_pair_intro')}>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px', display:'flex', gap:14, alignItems:'center' }}>
          <RobotDevice emotion="paired" size={84} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:DV.ink, marginBottom:2 }}>Robot · ROB-2A8F</div>
            <div style={{ fontSize:13, color:DV.ink2, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:4, background:DV.good }}/>
              Ready to pair
            </div>
            <div style={{ fontSize:12, color:DV.ink3, marginTop:2 }}>Signal: strong · Battery: 78%</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'18px 20px 0', fontSize:13, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Make sure this is <b style={{ color:DV.ink }}>your</b> Robot before pairing.
      </div>
      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_code')}>This is my Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_pair_search')}>Search again</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 5 · Pairing Code / QR Confirmation
function S_PairCode({ go, tweaks }){
  return (
    <DvShell title="Confirm it's yours" onBack={()=>go('dv_pair_found')}>
      <div style={{ padding:'18px 20px 0', fontSize:14, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Robot is showing a 4-digit code on its face. Type it here so we know we're pairing the right one.
      </div>
      <div style={{ padding:'18px 16px 0', display:'flex', justifyContent:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:'16px 24px' }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {['4','7','2','1'].map((d,i)=>(
              <div key={i} style={{ fontSize:48, fontWeight:800, color:'#E8F4FF', fontFamily:'ui-monospace, monospace', letterSpacing:-1 }}>{d}</div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textAlign:'center', textTransform:'uppercase', letterSpacing:0.6, marginTop:6 }}>On Robot's face</div>
        </div>
      </div>
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Type the code</div>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          {['4','7','2','1'].map((d,i)=>(
            <div key={i} style={{ width:56, height:64, borderRadius:10, background:DV.card, border:`2px solid ${DV.accent}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:DV.ink, fontFamily:'ui-monospace, monospace' }}>{d}</div>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_wifi')}>Confirm & continue</DvBigBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_search');}} style={{ background:'transparent', border:'none', fontSize:14, color:DV.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:8 }}>Codes don't match</button>
      </div>
    </DvShell>
  );
}

// 6 · Wi-Fi Setup (pick network + explain why)
function S_PairWifi({ go }){
  return (
    <DvShell title="Connect to Wi-Fi" onBack={()=>go('dv_pair_code')}>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ background:'#EEF1F5', borderRadius:12, padding:'12px 14px', fontSize:13, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          <b style={{ color:DV.ink }}>Why Wi-Fi?</b> Robot uses your home Wi-Fi to fetch lessons and run voice. Without it, lessons can't play.
        </div>
      </div>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Networks nearby</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, overflow:'hidden' }}>
          {[
            { name:'Casa-Familia', strength:3, sel:true, lock:true },
            { name:'Casa-Familia-5G', strength:3, lock:true },
            { name:'Vecino', strength:2, lock:true },
            { name:'BT-Hub-7', strength:1, lock:true },
          ].map((n,i,a)=>(
            <button key={n.name} onClick={(e)=>{e.stopPropagation(); go('dv_pair_wifi_pw');}} style={{
              width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              background: n.sel? '#E8F0FE':'transparent', border:'none',
              borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none', cursor:'pointer', textAlign:'left',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DV.ink} strokeWidth="1.6" strokeLinecap="round">
                <path d="M5 12.55a11 11 0 0114 0" opacity={n.strength>=2?1:0.25}/>
                <path d="M8.5 16.5a7 7 0 017 0" opacity={n.strength>=1?1:0.25}/>
                <path d="M12 20l.01 0"/>
                <path d="M2 8.82a15 15 0 0120 0" opacity={n.strength>=3?1:0.25}/>
              </svg>
              <div style={{ flex:1, fontSize:15, color:DV.ink }}>{n.name}</div>
              {n.lock && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:'12px 20px 0' }}>
        <button style={{ background:'transparent', border:'none', fontSize:14, color:DV.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:6 }}>Other network…</button>
      </div>
      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// 6b · Wi-Fi Password
function S_PairWifiPw({ go }){
  return (
    <DvShell title="Casa-Familia" onBack={()=>go('dv_pair_wifi')}>
      <div style={{ padding:'18px 20px 0', fontSize:14, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Enter the Wi-Fi password. Robot will remember it — your child won't need to.
      </div>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Password</div>
          <div style={{ fontSize:18, fontFamily:'ui-monospace, monospace', color:DV.ink, letterSpacing:2 }}>•••••••••</div>
        </div>
      </div>
      <div style={{ padding:'12px 20px 0', display:'flex', alignItems:'center', gap:10, fontSize:13, color:DV.ink2 }}>
        <div style={{ width:18, height:18, borderRadius:4, background:DV.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
        </div>
        Show password
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_connecting')}>Connect Robot</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 7 · Connecting Robot
function S_PairConnecting({ go, tweaks }){
  const steps = ['Sending Wi-Fi to Robot', 'Connecting to Casa-Familia', 'Logging in to your account', 'Loading starter lesson'];
  const [i, setI] = React.useState(0);
  React.useEffect(()=>{
    if (i < steps.length-1){ const t = setTimeout(()=>setI(i+1), 900); return ()=>clearTimeout(t); }
    const t = setTimeout(()=>go('dv_pair_success'), 1100);
    return ()=>clearTimeout(t);
  }, [i]);
  return (
    <DvShell title="Connecting Robot…">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={180} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:24, fontSize:18, fontWeight:600, textAlign:'center' }}>
          Hang tight — about 30 seconds
        </div>
      </div>
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {steps.map((s, idx)=>(
          <div key={s} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12 }}>
            <div style={{ width:22, height:22, borderRadius:11, background: idx<i? DV.good : idx===i? DV.accent : '#EEF1F5',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {idx<i ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
                : idx===i ? <div style={{ width:8, height:8, borderRadius:4, background:'#fff', animation:'pair-blink 0.9s ease-in-out infinite' }}/>
                : <div style={{ width:6, height:6, borderRadius:3, background:DV.ink3 }}/> }
            </div>
            <div style={{ fontSize:14, color: idx<=i ? DV.ink : DV.ink3 }}>{s}</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pair-blink { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </DvShell>
  );
}

// 8 · Robot Connected Success
function S_PairSuccess({ go, tweaks }){
  return (
    <DvShell title="Robot is ready">
      <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="celebrate" size={200} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:30, fontSize:24, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:DV.ink }}>
          Your Robot is paired
        </div>
        <div style={{ marginTop:8, fontSize:14, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Lessons will play <b style={{ color:DV.ink }}>on the Robot</b>. Your phone is just for setup, progress, and safety.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          {[
            { ic:'🤖', t:'Robot listens & speaks', b:'Mic and speaker on the Robot, not your phone.' },
            { ic:'📚', t:'Starter course is loaded', b:'Unit 1 is on the device, ready to go.' },
            { ic:'🛡️', t:'Audio is not saved', b:'Conversations stay between Robot and your child.' },
          ].map((r,i,a)=>(
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none', alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:DV.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_rename')}>Choose a Buddy & name</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 9 · Pairing Failed (recovery branches)
function S_PairFailed({ go, tweaks }){
  return (
    <DvShell title="Pairing didn't work" onBack={()=>go('dv_pair_intro')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="gentle" size={160} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:20, fontSize:20, fontWeight:600, letterSpacing:-0.3, textAlign:'center' }}>
          We couldn't reach your Robot
        </div>
        <div style={{ marginTop:6, fontSize:13, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          No worries — pairing usually works on the second try. Pick what likely happened:
        </div>
      </div>
      <div style={{ padding:'20px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { ic:'🔋', t:'Robot looks asleep', b:'Hold the top button until you hear a chime.', go:'dv_pair_intro' },
          { ic:'📶', t:'Wrong Wi-Fi password', b:'Try entering it again — common typos: O vs 0.', go:'dv_pair_wifi_pw' },
          { ic:'📡', t:'Robot is too far', b:'Bring Robot within 1–2 m of your phone.', go:'dv_pair_search' },
          { ic:'🔌', t:'Battery is low', b:'Plug Robot in for 5 minutes, then try again.', go:'dv_pair_intro' },
        ].map((r,i)=>(
          <button key={i} onClick={(e)=>{e.stopPropagation(); go(r.go);}} style={{
            background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'12px 14px',
            display:'flex', gap:12, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:DV.ink }}>{r.t}</div>
              <div style={{ fontSize:12, color:DV.ink2, marginTop:2, lineHeight:1.4, textWrap:'pretty' }}>{r.b}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        ))}
      </div>
      <div style={{ padding:'20px 20px 30px' }}>
        <DvBigBtn secondary onClick={()=>go('dv_pair_search')}>Try again</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 10 · Robot Offline (after pairing, on later return)
function S_PairOffline({ go, tweaks }){
  return (
    <DvShell title="Robot is offline" onBack={()=>go('dv_pair_add')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={170} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:24, fontSize:20, fontWeight:600, letterSpacing:-0.3, textAlign:'center' }}>
          Robot · ROB-2A8F is offline
        </div>
        <div style={{ marginTop:6, fontSize:13, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Last seen <b style={{ color:DV.ink }}>2 hours ago</b> on Casa-Familia.
        </div>
      </div>
      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Try this</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔌" title="Check Robot is plugged in" body="Or has at least 20% battery"/>
          <DvRow icon="📶" title="Update Wi-Fi" body="If your network changed or password rotated" onClick={()=>go('dv_pair_wifi')}/>
          <DvRow icon="🔄" title="Restart Robot" body="Hold the top button for 5 seconds"/>
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_search')}>Reconnect now</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 11 · Rename Robot / Choose Buddy
function S_PairRename({ go, tweaks }){
  const [buddy, setBuddy] = React.useState(2);
  const buddies = [
    { ic:'🐼', n:'Panda' }, { ic:'🦊', n:'Fox' }, { ic:'🐰', n:'Bunny' },
    { ic:'🐻', n:'Bear' }, { ic:'🐸', n:'Frog' }, { ic:'🦉', n:'Owl' },
    { ic:'🐢', n:'Turtle' }, { ic:'🐱', n:'Cat' },
  ];
  return (
    <DvShell title="Choose a Buddy">
      <div style={{ padding:'18px 20px 0', fontSize:14, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Pick the avatar your child will see on Robot's face. <b style={{ color:DV.ink }}>We don't ask for your child's name or photo.</b>
      </div>
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Buddy</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {buddies.map((b,i)=>(
            <button key={i} onClick={(e)=>{e.stopPropagation(); setBuddy(i);}} style={{
              aspectRatio:'1', borderRadius:14, background: i===buddy? '#FFF1C2' : DV.card,
              border: i===buddy? `2px solid ${tweaks?.accent || '#FF6F61'}` : `1px solid ${DV.hair}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, fontSize:28, cursor:'pointer' }}>
              <div>{b.ic}</div>
              <div style={{ fontSize:10, fontWeight:600, color:DV.ink }}>{b.n}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Robot's name (optional)</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:18 }}>🤖</div>
          <div style={{ fontSize:16, fontFamily:'inherit', color:DV.ink, flex:1 }}>Living-room Robot</div>
        </div>
        <div style={{ fontSize:12, color:DV.ink3, padding:'8px 6px', lineHeight:1.5 }}>Helpful if you have more than one Robot in the house.</div>
      </div>
      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>go('dv_pair_first_lesson')}>Save & continue</DvBigBtn>
      </div>
    </DvShell>
  );
}

// 12 · First Lesson with Robot Ready (parent hands off)
function S_PairFirstLesson({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <div style={{ height:'100%', overflow:'auto', background:'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)',
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif' }}>
      {/* Parent header strip */}
      <div style={{ padding:'56px 20px 12px', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(8px)',
        borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.accent, textTransform:'uppercase', letterSpacing:0.6, marginBottom:4 }}>For grown-ups</div>
        <div style={{ fontSize:14, fontWeight:600, color:DV.ink, lineHeight:1.3 }}>Place Robot on the table. Hand it over when you're ready.</div>
      </div>

      {/* Hero */}
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="happy" size={220} accent={accent}/>
        <div style={{ marginTop:24, fontFamily:'var(--display)', fontWeight:800, fontSize:28, color:'var(--ink)', letterSpacing:-0.4, textAlign:'center', lineHeight:1.15 }}>
          Robot is waiting!
        </div>
        <div style={{ marginTop:8, fontSize:14, color:'var(--ink-soft)', textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Your child will tap "yes" on the Robot to start their very first lesson.
        </div>
      </div>

      {/* What happens next */}
      <div style={{ padding:'30px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:0.6, padding:'4px 4px 8px' }}>What happens next</div>
        <div style={{ background:'rgba(255,255,255,0.85)', borderRadius:14, padding:'4px 4px', border:'1px solid rgba(0,0,0,0.05)' }}>
          {[
            { n:'1', t:'Robot greets your child by Buddy', b:'"Hi! I\'m Panda. Want to play?"' },
            { n:'2', t:'A 4-minute starter lesson plays', b:'On the Robot — your phone can stay in your pocket.' },
            { n:'3', t:'You\'ll see today\'s summary here', b:'Words practiced, time, and what to revisit tomorrow.' },
          ].map((r,i,a)=>(
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px', borderBottom: i<a.length-1? '1px solid rgba(0,0,0,0.05)':'none', alignItems:'flex-start' }}>
              <div style={{ width:24, height:24, borderRadius:12, background:accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0, marginTop:2 }}>{r.n}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{r.t}</div>
                <div style={{ fontSize:12, color:'var(--ink-soft)', lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <PrimaryCTA onClick={()=>go && go('dv_home')} color={accent}>Hand it to your child</PrimaryCTA>
        <div style={{ fontSize:12, color:'var(--ink-soft)', textAlign:'center', marginTop:12, lineHeight:1.5, textWrap:'pretty' }}>
          You'll get a calm summary in this app after each lesson.
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Device home — daily summary in the parent app
// ──────────────────────────────────────────────────
function S_DeviceHome({ go, tweaks }){
  return (
    <DvShell title="Robot · ROB-2A8F">
      {/* Hero card */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:DV.card, borderRadius:18, padding:'18px 18px', border:`1px solid ${DV.hair}`,
          display:'flex', gap:16, alignItems:'center' }}>
          <RobotDevice emotion="idle" size={108} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:DV.good, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:4, background:DV.good }}/> Online · idle
            </div>
            <div style={{ fontSize:18, fontWeight:600, color:DV.ink, marginTop:2 }}>Ready for today</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:4, display:'flex', alignItems:'center', gap:8 }}>
              <span>🔋 78%</span><span>•</span><span>Wi-Fi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today summary */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Today</div>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          <DvRow icon="📚" title="Unit 2 · Animals" body="Lesson 4 of 6 · about 4 minutes" onClick={()=>go('dv_session')} right={<div style={{ fontSize:13, color:DV.accent, fontWeight:600 }}>Start</div>}/>
          <DvRow icon="🔁" title="3 words to revisit" body="Robot will sneak these in tomorrow" onClick={()=>{}}/>
          <DvRow icon="⭐" title="Yesterday: 1 lesson · 4 min" body="Tap to see what your child practiced" onClick={()=>go('progress_today')}/>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Robot</div>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          <DvRow icon="🎵" title="Make Robot chime" body="Find Robot if it's misplaced" onClick={()=>go('dv_lost')}/>
          <DvRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM"/>
          <DvRow icon="🔄" title="Sync content" body="Up to date · 2 minutes ago"/>
          <DvRow icon="⬆️" title="Firmware" body="v1.4.2 · update available" right={<div style={{ background:'#FFF1C2', color:DV.warn, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:9 }}>UPDATE</div>} onClick={()=>go('dv_firmware')}/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>This Robot</div>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          <DvRow icon="👤" title="Buddy: Panda · Just starting" body="Tap to change avatar or level"/>
          <DvRow icon="🛡️" title="Safety & privacy"/>
          <DvRow danger title="Unpair this Robot" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg>}/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// Live session monitor — what Robot is doing right now
// ──────────────────────────────────────────────────
function S_DeviceSession({ go, tweaks }){
  const [lcdState, setLcd] = React.useState('listen');
  React.useEffect(()=>{
    // simple loop demo: listen → think → speak → listen
    const seq = ['listen','think','speak','success','listen'];
    let i = 0;
    const t = setInterval(()=>{ i = (i+1) % seq.length; setLcd(seq[i]); }, 2200);
    return ()=>clearInterval(t);
  }, []);
  const stateLabel = { listen:'Listening to your child', think:'Thinking', speak:'Robot is speaking', success:'Got the word!' }[lcdState] || 'Active';

  return (
    <DvShell title="Lesson in progress" onBack={()=>go('dv_home')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:'#1A1A1F', borderRadius:18, padding:'18px 18px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>Live · what Robot sees</div>
          <RobotDevice emotion={lcdState} size={200} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ fontSize:16, fontWeight:600, color:'#fff', marginTop:6 }}>{stateLabel}</div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Now playing</div>
          <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>Unit 2 · Animals</div>
          <div style={{ fontSize:13, color:DV.ink2, marginTop:2 }}>Lesson 4 · about 2 minutes left</div>
          <div style={{ marginTop:10, height:6, background:'#EEF1F5', borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:'62%', height:'100%', background:DV.accent }}/>
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔉" title="Lower volume" body="Currently: 6 of 10"/>
          <DvRow icon="⏸️" title="Pause Robot" body="Robot will wait until you resume"/>
          <DvRow danger icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>} title="End lesson" body="Robot will say goodbye"/>
        </div>
      </div>

      <div style={{ padding:'14px 20px 30px', fontSize:12, color:DV.ink3, textAlign:'center', lineHeight:1.5 }}>
        Audio stays between Robot and your child. Recordings are not saved.
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// Lost & found — make Robot chime
// ──────────────────────────────────────────────────
function S_DeviceLost({ go, tweaks }){
  const [chiming, setChiming] = React.useState(false);
  return (
    <DvShell title="Find Robot" onBack={()=>go('dv_home')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:220, height:220 }}>
          {chiming && [0,1,2].map(i=>(
            <div key={i} style={{ position:'absolute', width:200, height:200, borderRadius:'50%',
              border:`2px solid ${tweaks?.accent || '#FF6F61'}`, opacity:0.5,
              animation:`pair-pulse 1.6s ease-out ${i*0.5}s infinite` }}/>
          ))}
          <RobotDevice emotion={chiming?'happy':'sleep'} size={180} accent={tweaks?.accent || '#FF6F61'}/>
        </div>
        <div style={{ marginTop:24, fontSize:20, fontWeight:600, textAlign:'center', textWrap:'pretty', maxWidth:280 }}>
          {chiming? 'Robot is chiming!' : "Can't find Robot?"}
        </div>
        <div style={{ marginTop:8, fontSize:14, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          {chiming? 'Listen for a soft melody. Robot will keep playing for 30 seconds.' : 'Robot will play a gentle melody so you can find it.'}
        </div>
      </div>
      <div style={{ padding:'30px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px', display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
          <span style={{ width:8, height:8, borderRadius:4, background:DV.good }}/> Last seen: 2 min ago · Wi-Fi · 78%
        </div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px', display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
          📍 Probably in: <b style={{ color:DV.ink }}>the living room</b>
        </div>
      </div>
      <div style={{ padding:'30px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>setChiming(c=>!c)}>{chiming? 'Stop chime' : 'Make Robot chime'}</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// Firmware update
// ──────────────────────────────────────────────────
function S_DeviceFirmware({ go, tweaks }){
  return (
    <DvShell title="Software update" onBack={()=>go('dv_home')}>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px', display:'flex', gap:14, alignItems:'center' }}>
          <RobotDevice emotion="charging" size={84} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:DV.warn, textTransform:'uppercase', letterSpacing:0.6 }}>Update available</div>
            <div style={{ fontSize:16, fontWeight:600, color:DV.ink, marginTop:2 }}>v1.5.0 · 24 MB</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:2 }}>About 4 minutes · Robot will be unavailable</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>What's new</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            'Smoother face animations',
            'Better understanding of small voices',
            'Two new lesson celebrations',
            'Bug fixes',
          ].map((t,i,a)=>(
            <div key={i} style={{ padding:'12px 14px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none',
              display:'flex', alignItems:'flex-start', gap:10, fontSize:14, color:DV.ink, textWrap:'pretty', lineHeight:1.4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="2.4" strokeLinecap="round" style={{ marginTop:4, flexShrink:0 }}><path d="M5 12l5 5 9-10"/></svg>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_home')}>Update tonight (recommended)</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Update now</DvBigBtn>
        <div style={{ fontSize:12, color:DV.ink3, textAlign:'center', lineHeight:1.5 }}>
          Tonight's update happens during quiet hours so Robot is ready in the morning.
        </div>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// State + map exports
// ──────────────────────────────────────────────────
const DEVICE_STATES = [
  { id:'dv_overview',       title:'Robot · How it works together',  group:'Robot Device' },
  { id:'dv_pair_add',       title:'Robot · Pair · add',             group:'Robot Device' },
  { id:'dv_pair_intro',     title:'Robot · Pair · turn on',         group:'Robot Device' },
  { id:'dv_pair_search',    title:'Robot · Pair · searching',       group:'Robot Device' },
  { id:'dv_pair_found',     title:'Robot · Pair · found',           group:'Robot Device' },
  { id:'dv_pair_code',      title:'Robot · Pair · confirm code',    group:'Robot Device' },
  { id:'dv_pair_wifi',      title:'Robot · Pair · Wi-Fi pick',      group:'Robot Device' },
  { id:'dv_pair_wifi_pw',   title:'Robot · Pair · Wi-Fi password',  group:'Robot Device' },
  { id:'dv_pair_connecting',title:'Robot · Pair · connecting',      group:'Robot Device' },
  { id:'dv_pair_success',   title:'Robot · Pair · success',         group:'Robot Device' },
  { id:'dv_pair_failed',    title:'Robot · Pair · failed',          group:'Robot Device' },
  { id:'dv_pair_offline',   title:'Robot · Pair · offline',         group:'Robot Device' },
  { id:'dv_pair_rename',    title:'Robot · Pair · rename & buddy',  group:'Robot Device' },
  { id:'dv_pair_first_lesson', title:'Robot · Pair · first lesson', group:'Robot Device' },
  { id:'dv_home',        title:'Robot · Device home',            group:'Robot Device' },
  { id:'dv_session',     title:'Robot · Live session monitor',   group:'Robot Device' },
  { id:'dv_lost',        title:'Robot · Find my Robot',          group:'Robot Device' },
  { id:'dv_firmware',    title:'Robot · Firmware update',        group:'Robot Device' },
  { id:'dv_lcd',         title:'Robot · LCD face library',       group:'Robot Device' },
  { id:'dv_lcd_turn',    title:'Robot · One lesson turn',        group:'Robot Device' },
];

const DEVICE_SCREEN_MAP = {
  dv_overview:        S_DeviceOverview,
  dv_pair_add:        S_PairAdd,
  dv_pair_intro:      S_PairIntro,
  dv_pair_search:     S_PairSearch,
  dv_pair_found:      S_PairFound,
  dv_pair_code:       S_PairCode,
  dv_pair_wifi:       S_PairWifi,
  dv_pair_wifi_pw:    S_PairWifiPw,
  dv_pair_connecting: S_PairConnecting,
  dv_pair_success:    S_PairSuccess,
  dv_pair_failed:     S_PairFailed,
  dv_pair_offline:    S_PairOffline,
  dv_pair_rename:     S_PairRename,
  dv_pair_first_lesson: S_PairFirstLesson,
  dv_home:        S_DeviceHome,
  dv_session:     S_DeviceSession,
  dv_lost:        S_DeviceLost,
  dv_firmware:    S_DeviceFirmware,
  dv_lcd:         S_LCDLibrary,
  dv_lcd_turn:    S_LCDLessonTurn,
};

Object.assign(window, { DEVICE_STATES, DEVICE_SCREEN_MAP });
