// Design System page for Robot English
// All components shown on a single scrollable page with sections and tokens.

const DS = {
  pageBg: '#FAF7F1',
  ink: '#2B2140',
  ink2: '#5C4F77',
  ink3: '#8B8B96',
  card: '#FFFFFF',
  hair: 'rgba(0,0,0,0.08)',
};

function DSSection({ title, subtitle, children, cols=2 }){
  return (
    <section style={{ padding:'48px 56px 0', maxWidth:1280, margin:'0 auto' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:DS.ink3, textTransform:'uppercase', letterSpacing:1.5, marginBottom:6 }}>{title}</div>
        {subtitle && <div style={{ fontFamily:'-apple-system,Inter,system-ui,sans-serif', fontSize:14, color:DS.ink2, lineHeight:1.5, maxWidth:680 }}>{subtitle}</div>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:16 }}>{children}</div>
    </section>
  );
}

function DSCard({ title, meta, children, span=1, padded=true }){
  return (
    <div style={{
      background:DS.card, borderRadius:16, border:`1px solid ${DS.hair}`,
      gridColumn:`span ${span}`, overflow:'hidden',
    }}>
      {(title || meta) && (
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${DS.hair}`, display:'flex', alignItems:'baseline', gap:10 }}>
          {title && <div style={{ fontFamily:'-apple-system,Inter,system-ui,sans-serif', fontSize:13, fontWeight:600, color:DS.ink }}>{title}</div>}
          {meta && <div style={{ fontFamily:'-apple-system,Inter,system-ui,sans-serif', fontSize:12, color:DS.ink3 }}>{meta}</div>}
        </div>
      )}
      <div style={{ padding: padded? 24:0 }}>{children}</div>
    </div>
  );
}

// Swatch
function Swatch({ name, value, ink='light' }){
  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${DS.hair}` }}>
      <div style={{ height:64, background: value }}/>
      <div style={{ padding:'8px 10px' }}>
        <div style={{ fontSize:12, fontWeight:600, color:DS.ink, fontFamily:'-apple-system,Inter,system-ui,sans-serif' }}>{name}</div>
        <div style={{ fontSize:11, color:DS.ink3, fontFamily:'ui-monospace,SF Mono,monospace' }}>{value}</div>
      </div>
    </div>
  );
}

// Scaled mini-button row used to demo all 5 button states
function PrimaryBtn({ label, color='var(--coral)', state='default' }){
  const isDisabled = state==='disabled';
  const isPressed = state==='pressed';
  const isLoading = state==='loading';
  const isSuccess = state==='success';
  const bg = isSuccess? 'var(--mint)' : color;
  return (
    <div style={{
      width:'100%', minHeight:56, borderRadius:999,
      background: isDisabled? '#E0DDD7' : bg,
      color:'#fff', fontFamily:'var(--display)', fontWeight:800, fontSize:18,
      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
      boxShadow: isPressed? 'inset 0 2px 6px rgba(0,0,0,.2)' : '0 4px 0 rgba(0,0,0,.08), 0 6px 18px rgba(255,111,97,.25)',
      transform: isPressed? 'translateY(2px)':'none',
      opacity: isDisabled? 0.85: 1,
    }}>
      {isLoading && <span style={{ width:18, height:18, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.4)', borderTopColor:'#fff', animation:'spin 0.9s linear infinite' }}/>}
      {isSuccess && <span style={{ fontSize:18 }}>✓</span>}
      {label}
    </div>
  );
}
function SecondaryBtn({ label, state='default' }){
  const isDisabled = state==='disabled';
  const isPressed = state==='pressed';
  return (
    <div style={{
      width:'100%', minHeight:56, borderRadius:999,
      background: isPressed? 'rgba(0,0,0,.04)':'transparent',
      border:'2px solid rgba(0,0,0,.12)',
      color: isDisabled? '#B5B0A8' : 'var(--ink-soft)',
      fontFamily:'var(--display)', fontWeight:700, fontSize:18,
      display:'flex', alignItems:'center', justifyContent:'center',
      opacity: isDisabled? 0.85: 1,
    }}>{label}</div>
  );
}

function IconBtn({ icon, state='default' }){
  return (
    <div style={{
      width:48, height:48, borderRadius:'50%',
      background: state==='pressed'? '#FFE2D6' : '#fff',
      boxShadow: state==='pressed'? 'inset 0 2px 6px rgba(0,0,0,.1)' : '0 2px 6px rgba(0,0,0,.08)',
      display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)',
      opacity: state==='disabled'? 0.45:1,
    }}>{icon}</div>
  );
}

// Mic button
function MicBtn({ state='ready' }){
  const cfg = {
    off:        { bg:'#E0DDD7', ring:false, glow:false, label:'Off' },
    ready:      { bg:'var(--coral)', ring:false, glow:true, label:'Ready' },
    listening:  { bg:'var(--coral)', ring:true, glow:true, label:'Listening' },
    speaking:   { bg:'var(--mint)', ring:true, glow:true, label:'Child speaking' },
    processing: { bg:'#B080F0', ring:false, glow:true, label:'Processing', spin:true },
    error:      { bg:'#C0392B', ring:false, glow:false, label:'Error' },
    missing:    { bg:'#E0DDD7', ring:false, glow:false, label:'Permission needed' },
  }[state];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', width:96, height:96 }}>
        {cfg.ring && (
          <>
            <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`2px solid ${cfg.bg}`, opacity:0.4, animation:'bot-pulse 2s ease-out infinite' }}/>
            <div style={{ position:'absolute', inset:-2, borderRadius:'50%', border:`2px solid ${cfg.bg}`, opacity:0.6, animation:'bot-pulse 2s ease-out 0.4s infinite' }}/>
          </>
        )}
        <div style={{
          width:96, height:96, borderRadius:'50%', background:cfg.bg, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: cfg.glow? `0 0 0 6px rgba(255,255,255,.6), 0 8px 24px ${cfg.bg}55` : '0 4px 12px rgba(0,0,0,.1)',
        }}>
          {cfg.spin? (
            <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid rgba(255,255,255,.4)', borderTopColor:'#fff', animation:'spin 0.9s linear infinite' }}/>
          ) : state==='missing' || state==='error'? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2"/></svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M19 11a7 7 0 11-14 0"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
          )}
        </div>
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:DS.ink2, fontFamily:'-apple-system,Inter,system-ui,sans-serif' }}>{cfg.label}</div>
    </div>
  );
}

// Listening indicator (rings + label)
function ListeningIndicator(){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'#fff', borderRadius:999, boxShadow:'0 2px 6px rgba(0,0,0,.06)' }}>
      <div style={{ position:'relative', width:14, height:14 }}>
        <div style={{ position:'absolute', inset:-6, borderRadius:'50%', border:'2px solid var(--coral)', opacity:0.4, animation:'bot-pulse 2s ease-out infinite' }}/>
        <div style={{ width:14, height:14, borderRadius:'50%', background:'var(--coral)' }}/>
      </div>
      <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:14, color:'var(--ink)' }}>Listening…</span>
    </div>
  );
}

// Speaking waveform
function Waveform({ color='var(--sky)', count=14 }){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, height:36 }}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} style={{
          width:5, borderRadius:3, background:color,
          height: 8 + (Math.sin(i*0.7)+1)*10,
          animation:`bot-wave 1.2s ease-in-out ${i*0.05}s infinite`,
        }}/>
      ))}
    </div>
  );
}

// Thinking dots
function ThinkingDots(){
  return (
    <div style={{ display:'flex', gap:8, padding:'12px 18px', background:'#fff', borderRadius:999, boxShadow:'0 2px 6px rgba(0,0,0,.06)', width:'fit-content' }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:10, height:10, borderRadius:5, background:'var(--plum)', animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite` }}/>
      ))}
    </div>
  );
}

// Lesson card
function LessonCard(){
  return (
    <div style={{ background:'#fff', borderRadius:24, padding:18, boxShadow:'0 2px 8px rgba(0,0,0,.06)', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:62, height:62, borderRadius:18, background:'var(--coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>📖</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>Lesson 3</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>How are you?</div>
        <div style={{ marginTop:6, height:6, borderRadius:3, background:'rgba(0,0,0,.06)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:'60%', background:'var(--mint)', borderRadius:3 }}/>
        </div>
      </div>
    </div>
  );
}
// Unit card
function UnitCard({ locked }){
  return (
    <div style={{ background:'#fff', borderRadius:24, padding:18, boxShadow:'0 2px 8px rgba(0,0,0,.06)', opacity: locked? 0.65:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <div style={{ width:54, height:54, borderRadius:18, background: locked? '#EEEAE0':'var(--mint-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{locked? '🔒':'🌳'}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>Unit 3</div>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>Family & Friends</div>
        </div>
        <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>{locked? '— /5':'3/5'}</span>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{ flex:1, height:8, borderRadius:4, background: !locked && i<=3? 'var(--mint)':'rgba(0,0,0,.08)' }}/>
        ))}
      </div>
    </div>
  );
}

// Word tile
function WordTile({ word='Hello', icon='👋', state='stronger' }){
  return (
    <div style={{ background:'#fff', borderRadius:20, padding:14, boxShadow:'0 2px 6px rgba(0,0,0,.05)', width:120 }}>
      <div style={{ fontSize:34 }}>{icon}</div>
      <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>{word}</div>
      {state==='stronger'? (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
          <div style={{ display:'flex', gap:2 }}>{[0,1,2].map(i=> <div key={i} style={{ width:12, height:5, borderRadius:3, background:i<2?'var(--mint)':'rgba(0,0,0,.1)'}}/>)}</div>
          <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:10, color:'#1F8A5B' }}>stronger</span>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)' }}/>
          <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:10, color:'#A06900' }}>visit again</span>
        </div>
      )}
    </div>
  );
}

// Progress pill
function ProgressPill({ icon='⭐', value=12, label='stars' }){
  return (
    <div style={{ background:'#fff', borderRadius:999, padding:'8px 16px 8px 8px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 2px 6px rgba(0,0,0,.05)', width:'fit-content' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--sun)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{icon}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        <span style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>{value}</span>
        <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)' }}>{label}</span>
      </div>
    </div>
  );
}

// Celebration badge
function CelebrationBadge(){
  return (
    <div style={{ background:'#fff', borderRadius:24, padding:'14px 18px', boxShadow:'0 4px 0 rgba(0,0,0,.06), 0 12px 26px rgba(0,0,0,.08)', display:'flex', alignItems:'center', gap:14, width:'fit-content' }}>
      <div style={{ width:54, height:54, borderRadius:'50%', background:'var(--coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>🌟</div>
      <div>
        <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>New sticker</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:16, color:'var(--ink)' }}>Brave Speaker</div>
      </div>
    </div>
  );
}

// Parent summary row
function ParentSummaryRow({ label='Speaking turns', value='8', icon='🎤' }){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#fff', border:`1px solid ${DS.hair}`, borderRadius:12, fontFamily:'-apple-system,Inter,system-ui,sans-serif' }}>
      <div style={{ width:28, height:28, borderRadius:7, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{icon}</div>
      <div style={{ flex:1, fontSize:15, color:DS.ink }}>{label}</div>
      <div style={{ fontSize:14, color:DS.ink2, fontVariantNumeric:'tabular-nums' }}>{value}</div>
    </div>
  );
}
// Settings row (toggle)
function SettingsRow({ label='Microphone', icon='🎤', on=true }){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#fff', border:`1px solid ${DS.hair}`, borderRadius:12, fontFamily:'-apple-system,Inter,system-ui,sans-serif' }}>
      <div style={{ width:28, height:28, borderRadius:7, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{icon}</div>
      <div style={{ flex:1, fontSize:15, color:DS.ink }}>{label}</div>
      <div style={{ width:42, height:25, borderRadius:13, background: on? '#1F8A5B':'#D8D8DD', position:'relative' }}>
        <div style={{ position:'absolute', top:2, left: on? 19:2, width:21, height:21, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
      </div>
    </div>
  );
}

// Error banner
function ErrorBanner({ tone='warn' }){
  const cfg = {
    warn: { bg:'#FFF6E6', border:'#F5D58A', icon:'⚠', text:'Microphone access is needed for speaking practice.' },
    info: { bg:'#EAF1FB', border:'#B5CCEC', icon:'ⓘ', text:'No transcript is shown in this version.' },
    error:{ bg:'#FBE7E2', border:'#E8B5AB', icon:'!', text:"Couldn't connect. Check your internet and try again." },
  }[tone];
  return (
    <div style={{ display:'flex', gap:10, padding:'12px 14px', background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:12, fontFamily:'-apple-system,Inter,system-ui,sans-serif' }}>
      <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:DS.ink, flexShrink:0 }}>{cfg.icon}</div>
      <div style={{ fontSize:13.5, color:DS.ink, lineHeight:1.4 }}>{cfg.text}</div>
    </div>
  );
}

// Reconnecting overlay
function ReconnectOverlay(){
  return (
    <div style={{ position:'relative', height:280, borderRadius:16, overflow:'hidden', background:'linear-gradient(180deg,#FFF5E6,#FFEAC9)' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(43,33,64,0.45)', backdropFilter:'blur(4px)' }}/>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'#fff', borderRadius:22, padding:'20px 22px', boxShadow:'0 20px 60px rgba(0,0,0,.25)', width:240, textAlign:'center' }}>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:16, color:'var(--ink)' }}>I'm trying to connect again…</div>
          <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:10 }}>
            {[0,1,2].map(i=> <div key={i} style={{ width:8, height:8, borderRadius:4, background:'var(--plum)', animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite` }}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Permission prompt card
function PermissionCard(){
  return (
    <div style={{ background:'#fff', borderRadius:18, padding:20, border:`1px solid ${DS.hair}`, fontFamily:'-apple-system,Inter,system-ui,sans-serif', maxWidth:340 }}>
      <div style={{ width:48, height:48, borderRadius:12, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={DS.ink} strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M19 11a7 7 0 11-14 0"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
      </div>
      <div style={{ fontSize:16, fontWeight:600, color:DS.ink, marginBottom:6 }}>Allow microphone?</div>
      <div style={{ fontSize:13.5, color:DS.ink2, lineHeight:1.5, marginBottom:14 }}>
        Robot English uses the microphone only during a lesson. No recordings are saved.
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <div style={{ flex:1, padding:'10px', borderRadius:8, background:'#2A6FDB', color:'#fff', fontWeight:600, fontSize:14, textAlign:'center' }}>Allow</div>
        <div style={{ flex:1, padding:'10px', borderRadius:8, background:'transparent', border:`1px solid ${DS.hair}`, color:DS.ink, fontWeight:500, fontSize:14, textAlign:'center' }}>Not now</div>
      </div>
    </div>
  );
}

// Modal / confirmation sheet
function ConfirmSheet(){
  return (
    <div style={{ background:'#fff', borderRadius:28, padding:'24px 22px', boxShadow:'0 20px 60px rgba(0,0,0,.18)', maxWidth:320, fontFamily:'var(--body)' }}>
      <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, color:'var(--ink)', marginBottom:6, textAlign:'center' }}>Stop the lesson?</div>
      <div style={{ fontSize:14, color:'var(--ink-soft)', textAlign:'center', marginBottom:18, lineHeight:1.4 }}>We'll save where you stopped.</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryBtn label="Keep playing" color="var(--mint)"/>
        <SecondaryBtn label="Yes, stop"/>
      </div>
    </div>
  );
}

// Robot states grid (uses existing Robot component)
function RobotStateTile({ emotion, label }){
  return (
    <div style={{ background:'#FFF', borderRadius:14, border:`1px solid ${DS.hair}`, padding:16, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Robot emotion={emotion} size={110}/>
      </div>
      <div style={{ fontFamily:'-apple-system,Inter,system-ui,sans-serif', fontSize:12.5, fontWeight:600, color:DS.ink, textAlign:'center' }}>{label}</div>
      <div style={{ fontFamily:'ui-monospace,SF Mono,monospace', fontSize:10.5, color:DS.ink3 }}>{emotion}</div>
    </div>
  );
}

function DesignSystemPage(){
  return (
    <div data-persona="parent" style={{ background:DS.pageBg, minHeight:'100vh', color:DS.ink, paddingBottom:80, fontFamily:'-apple-system,Inter,system-ui,sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bot-wave { 0%,100% { transform: scaleY(0.6);} 50% { transform: scaleY(1.4);} }
      `}</style>

      {/* Page header */}
      <header style={{ padding:'56px 56px 24px', maxWidth:1280, margin:'0 auto', borderBottom:`1px solid ${DS.hair}` }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--coral)', textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>Robot English · Design System</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:42, color:DS.ink, letterSpacing:-1, lineHeight:1.05 }}>Components & tokens</div>
        <div style={{ fontSize:15, color:DS.ink2, marginTop:10, maxWidth:680, lineHeight:1.5 }}>
          A shared library for the child play area and parent space. Two voices, one app: warm and chunky for kids, calm and structured for grown-ups.
        </div>
      </header>

      {/* TOKENS */}
      <DSSection title="Tokens · Color" subtitle="Sunny core palette for the child app, neutral slate for parent space.">
        <DSCard title="Brand & accents" span={2}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:10 }}>
            <Swatch name="Coral" value="#FF6F61"/>
            <Swatch name="Coral soft" value="#FFB3A8"/>
            <Swatch name="Sun" value="#FFC857"/>
            <Swatch name="Mint" value="#6CE2B6"/>
            <Swatch name="Sky" value="#6FC1FF"/>
            <Swatch name="Plum" value="#6B4A9B"/>
          </div>
        </DSCard>
        <DSCard title="Surfaces (kid)">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <Swatch name="Cream" value="#FFF5E6"/>
            <Swatch name="Cream 2" value="#FFEAC9"/>
            <Swatch name="Paper" value="#FFFCF6"/>
          </div>
        </DSCard>
        <DSCard title="Ink & text">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <Swatch name="Ink" value="#2B2140"/>
            <Swatch name="Ink soft" value="#5C4F77"/>
            <Swatch name="Ink mute" value="#8B8B96"/>
          </div>
        </DSCard>
        <DSCard title="Parent (slate)">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <Swatch name="Bg" value="#F5F5F2"/>
            <Swatch name="Card" value="#FFFFFF"/>
            <Swatch name="Accent" value="#2A6FDB"/>
          </div>
        </DSCard>
        <DSCard title="Semantic">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <Swatch name="Good" value="#1F8A5B"/>
            <Swatch name="Warn" value="#A06900"/>
            <Swatch name="Caution" value="#C0392B"/>
          </div>
        </DSCard>
      </DSSection>

      {/* TYPE */}
      <DSSection title="Tokens · Type" subtitle="Fraunces for warmth and headlines (kid + key parent moments). Nunito + system stack for body and dense parent UI.">
        <DSCard title="Display · Fraunces">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:44, color:DS.ink, lineHeight:1 }}>Hi friend!</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:32, color:DS.ink, lineHeight:1.05 }}>Lesson Title 32/Bold</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:22, color:DS.ink2, lineHeight:1.2 }}>Subtitle 22/Semi</div>
          </div>
        </DSCard>
        <DSCard title="Body · Nunito / system">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:18, color:DS.ink }}>Body 18/Bold — kid copy</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:DS.ink }}>Body 15/Semi — parent rows</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:DS.ink3, textTransform:'uppercase', letterSpacing:1 }}>Caption 13/Eyebrow</div>
            <div style={{ fontFamily:'ui-monospace,SF Mono,monospace', fontSize:12, color:DS.ink2 }}>Mono 12 — values, IDs</div>
          </div>
        </DSCard>
      </DSSection>

      {/* SPACING / RADIUS / SHADOW */}
      <DSSection title="Tokens · Space, radius & shadow" subtitle="Generous radii in the child app (cards 24, buttons 999). Tighter, more conventional in parent space (cards 14).">
        <DSCard title="Spacing scale">
          <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
            {[4,8,12,16,24,32,48].map(s=>(
              <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:s, height:s, background:'var(--coral)', borderRadius:4 }}/>
                <div style={{ fontSize:11, color:DS.ink3 }}>{s}</div>
              </div>
            ))}
          </div>
        </DSCard>
        <DSCard title="Radius">
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {[{r:8,l:'r-input'},{r:14,l:'r-parent'},{r:20,l:'r-tile'},{r:28,l:'r-card'},{r:9999,l:'r-pill'}].map(x=>(
              <div key={x.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:56, height:56, background:'var(--cream-2)', borderRadius:x.r, border:`1px solid ${DS.hair}` }}/>
                <div style={{ fontSize:11, color:DS.ink3 }}>{x.l} · {x.r===9999?'∞':x.r}</div>
              </div>
            ))}
          </div>
        </DSCard>
        <DSCard title="Shadow / elevation" span={2}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { l:'Card · soft', s:'0 2px 6px rgba(0,0,0,.06)' },
              { l:'Card · raised', s:'0 4px 14px rgba(0,0,0,.08)' },
              { l:'Sticker · puffy', s:'0 4px 0 rgba(0,0,0,.06), 0 12px 26px rgba(0,0,0,.08)' },
              { l:'Modal', s:'0 20px 60px rgba(0,0,0,.18)' },
            ].map(x=>(
              <div key={x.l} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <div style={{ width:'100%', height:60, background:'#fff', borderRadius:14, boxShadow:x.s }}/>
                <div style={{ fontSize:11, color:DS.ink3 }}>{x.l}</div>
              </div>
            ))}
          </div>
        </DSCard>
      </DSSection>

      {/* ROBOT STATES */}
      <DSSection title="Robot character" subtitle="Single character, ten emotional states. Drives all child-facing feedback. Animations are CSS-only.">
        <div style={{ gridColumn:'span 2', display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
          {[
            ['idle','Happy idle'],
            ['speak','Speaking'],
            ['listen','Listening'],
            ['think','Thinking'],
            ['success','Celebrating'],
            ['gentle','Gentle correction'],
            ['curious',"Confused / didn't hear"],
            ['worry','Reconnecting'],
            ['sad','Safety pause'],
            ['sleep','Sleep / lesson done'],
          ].map(([e,l])=> <RobotStateTile key={e} emotion={e} label={l}/>)}
        </div>
      </DSSection>

      {/* BUTTONS */}
      <DSSection title="Buttons" subtitle="Primary CTA in coral with sticker shadow; secondary as outlined pill; icon button as floating circle." cols={3}>
        <DSCard title="Primary CTA · states">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <PrimaryBtn label="Start Lesson" state="default"/>
            <PrimaryBtn label="Start Lesson" state="pressed"/>
            <PrimaryBtn label="Start Lesson" state="disabled"/>
            <PrimaryBtn label="Connecting…" state="loading"/>
            <PrimaryBtn label="Saved" state="success"/>
          </div>
        </DSCard>
        <DSCard title="Secondary · states">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <SecondaryBtn label="Stop for today" state="default"/>
            <SecondaryBtn label="Stop for today" state="pressed"/>
            <SecondaryBtn label="Stop for today" state="disabled"/>
          </div>
        </DSCard>
        <DSCard title="Icon button">
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <IconBtn icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>}/>
            <IconBtn state="pressed" icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/></svg>}/>
            <IconBtn state="disabled" icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>}/>
          </div>
          <div style={{ marginTop:10, fontSize:11, color:DS.ink3 }}>48×48 hit target. Soft shadow, no border.</div>
        </DSCard>
      </DSSection>

      {/* MIC + SPEECH */}
      <DSSection title="Voice components" subtitle="The microphone is the heart of the app. Color and motion communicate state without words." cols={3}>
        <DSCard title="Microphone · 7 states" span={3}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:12 }}>
            <MicBtn state="off"/>
            <MicBtn state="ready"/>
            <MicBtn state="listening"/>
            <MicBtn state="speaking"/>
            <MicBtn state="processing"/>
            <MicBtn state="error"/>
            <MicBtn state="missing"/>
          </div>
        </DSCard>
        <DSCard title="Listening indicator">
          <ListeningIndicator/>
        </DSCard>
        <DSCard title="Speaking waveform">
          <Waveform/>
        </DSCard>
        <DSCard title="Robot thinking">
          <ThinkingDots/>
        </DSCard>
      </DSSection>

      {/* CONTENT TILES */}
      <DSSection title="Content components">
        <DSCard title="Lesson card">
          <LessonCard/>
        </DSCard>
        <DSCard title="Unit card · open + locked">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <UnitCard/>
            <UnitCard locked/>
          </div>
        </DSCard>
        <DSCard title="Word tile">
          <div style={{ display:'flex', gap:10 }}>
            <WordTile word="Hello" icon="👋" state="stronger"/>
            <WordTile word="Friend" icon="👫" state="visit"/>
          </div>
        </DSCard>
        <DSCard title="Progress pill">
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <ProgressPill icon="⭐" value={12} label="stars"/>
            <ProgressPill icon="🎤" value={8} label="turns"/>
            <ProgressPill icon="🔥" value={5} label="day streak"/>
          </div>
        </DSCard>
        <DSCard title="Celebration badge">
          <CelebrationBadge/>
        </DSCard>
      </DSSection>

      {/* PARENT */}
      <DSSection title="Parent components" subtitle="Slate tones, denser type, clear rows.">
        <DSCard title="Summary row">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <ParentSummaryRow label="Speaking turns" value="8" icon="🎤"/>
            <ParentSummaryRow label="Time on task" value="8 min" icon="⏱"/>
            <ParentSummaryRow label="Lessons today" value="1" icon="📚"/>
          </div>
        </DSCard>
        <DSCard title="Settings row">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <SettingsRow label="Microphone" icon="🎤" on={true}/>
            <SettingsRow label="Sound effects" icon="🔊" on={true}/>
            <SettingsRow label="Anonymous analytics" icon="📊" on={false}/>
          </div>
        </DSCard>
        <DSCard title="Permission prompt" span={2}>
          <PermissionCard/>
        </DSCard>
      </DSSection>

      {/* ALERTS / OVERLAYS */}
      <DSSection title="Alerts & overlays">
        <DSCard title="Error banner · warn / info / error">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <ErrorBanner tone="warn"/>
            <ErrorBanner tone="info"/>
            <ErrorBanner tone="error"/>
          </div>
        </DSCard>
        <DSCard title="Reconnecting overlay" padded={false}>
          <ReconnectOverlay/>
        </DSCard>
        <DSCard title="Modal · confirmation" span={2}>
          <div style={{ display:'flex', justifyContent:'center', padding:'12px 0', background:'rgba(43,33,64,0.05)', borderRadius:14 }}>
            <ConfirmSheet/>
          </div>
        </DSCard>
      </DSSection>

      {/* PARENT GATE CONTROL */}
      <DSSection title="Parent gate" subtitle="Speed-bump pattern. Type-the-shown number — not authentication.">
        <DSCard title="Type-the-number control" span={2}>
          <div style={{ background:'#fff', border:`1px solid ${DS.hair}`, borderRadius:14, padding:'22px 20px', maxWidth:360 }}>
            <div style={{ fontSize:12, color:DS.ink3, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10, fontWeight:600 }}>Type this number</div>
            <div style={{ fontSize:38, fontWeight:600, letterSpacing:8, fontVariantNumeric:'tabular-nums', marginBottom:18, color:DS.ink }}>347</div>
            <div style={{ width:'100%', borderBottom:`2px solid #1F8A5B`, padding:'8px 0', fontSize:24, letterSpacing:6, fontVariantNumeric:'tabular-nums', color:DS.ink }}>347</div>
          </div>
        </DSCard>
      </DSSection>

      {/* MOTION + A11Y */}
      <DSSection title="Motion & accessibility" cols={2}>
        <DSCard title="Motion notes">
          <ul style={{ margin:0, paddingLeft:18, color:DS.ink2, fontSize:14, lineHeight:1.7 }}>
            <li><b style={{ color:DS.ink }}>Robot bob</b> — 3.6s ease-in-out infinite, 4–6px Y. Idle and happy only.</li>
            <li><b style={{ color:DS.ink }}>Pulse rings</b> — 2s ease-out, opacity 0.4→0. Listening only.</li>
            <li><b style={{ color:DS.ink }}>Wave bars</b> — 1.2s scaleY 0.6↔1.4, 0.05s stagger.</li>
            <li><b style={{ color:DS.ink }}>Thinking dots</b> — 1.4s, 0.18s stagger, plum.</li>
            <li><b style={{ color:DS.ink }}>Confetti</b> — single one-shot burst on celebration only.</li>
            <li>Honor <code>prefers-reduced-motion</code>: disable bob, pulse, confetti; keep state colors.</li>
          </ul>
        </DSCard>
        <DSCard title="Accessibility & contrast">
          <ul style={{ margin:0, paddingLeft:18, color:DS.ink2, fontSize:14, lineHeight:1.7 }}>
            <li>Min hit target <b style={{ color:DS.ink }}>44×44</b> (kid CTAs are 56+).</li>
            <li>Body text <b style={{ color:DS.ink }}>Ink on Cream</b> — AA at 14px+.</li>
            <li>White text on Coral / Plum / Mint passes AA at 18px bold.</li>
            <li>Never communicate state with color alone — pair with copy and motion.</li>
            <li>All robot states have a written label for screen readers.</li>
            <li>Parent space supports system Dynamic Type up to 130%.</li>
          </ul>
        </DSCard>
      </DSSection>

      <div style={{ padding:'48px 56px 0', maxWidth:1280, margin:'0 auto', fontSize:12, color:DS.ink3 }}>
        Robot English · Component library · v1.0
      </div>
    </div>
  );
}

Object.assign(window, { DesignSystemPage });
