// LCD v2 — full deliverable page.
// Sections:
//  1. Brief + the 3 style directions side-by-side at 6 emotions each.
//  2. Verdict + the production face language (anatomy, palette, motion).
//  3. The 25 face states board.
//  4. Five cinematic storyboards.
//  5. Mobile-to-LCD state mapping table.
//  6. "Never on the LCD" rules.

const { useState } = React;
const P = window.LCD_PALETTE;
const { FaceA, FaceB, FaceC, FaceV2, STATES_V2 } = window;

// ─── tiny ui atoms ──────────────────────────────────────────
const ink = '#0B0F1A';
const paper = '#F6F4EE';
const rule = '#E2DDD0';
const muted = '#6F6A5E';

const Section = ({ id, kicker, title, sub, children }) => (
  <section id={id} style={{ padding:'88px 64px 24px', borderTop:`1px solid ${rule}`, scrollMarginTop:24 }}>
    <div style={{ display:'flex', alignItems:'baseline', gap:16, marginBottom:6 }}>
      <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.18em', color:muted, textTransform:'uppercase' }}>{kicker}</span>
    </div>
    <h2 style={{ margin:'0 0 10px', fontFamily:'"Fraunces",Georgia,serif', fontWeight:500, fontSize:54, lineHeight:1.02, letterSpacing:'-.02em', color:ink, textWrap:'balance' }}>{title}</h2>
    {sub && <p style={{ margin:'0 0 36px', fontSize:17, lineHeight:1.55, color:muted, maxWidth:760, textWrap:'pretty' }}>{sub}</p>}
    {children}
  </section>
);

// "Device" — embedded LCD bezel around any face SVG.
const LCD_OUTER_W = 360, LCD_OUTER_H = 272;
function Device({ children, scale=1, label }){
  return (
    <div style={{
      width:LCD_OUTER_W*scale, position:'relative',
      background:'linear-gradient(180deg,#1B1F2A,#0E1118)',
      padding:14*scale, borderRadius:24*scale,
      boxShadow:`0 1px 0 #fff inset, 0 ${30*scale}px ${60*scale}px rgba(15,18,28,.32), 0 ${4*scale}px ${10*scale}px rgba(15,18,28,.18)`,
      border:'1px solid #0A0D14',
    }}>
      <div style={{ borderRadius:14*scale, overflow:'hidden', background:'#000', position:'relative' }}>
        {children}
        {/* tiny LCD reflective top sheen */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          background:'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0) 30%)' }}/>
      </div>
      {label && (
        <div style={{ position:'absolute', left:0, right:0, bottom:-26*scale, textAlign:'center',
          fontFamily:'ui-monospace,Menlo', fontSize:11*scale, letterSpacing:'.16em', color:muted, textTransform:'uppercase' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── 1. Three directions grid ──────────────────────────────
const EMOTIONS_6 = [
  { id:'idle',    label:'Idle' },
  { id:'speak',   label:'Speaking' },
  { id:'listen',  label:'Listening' },
  { id:'think',   label:'Thinking' },
  { id:'success', label:'Success' },
  { id:'retry',   label:'Retry' },
];

function DirectionRow({ name, tag, blurb, Comp, accent }){
  return (
    <div style={{ borderTop:`1px solid ${rule}`, padding:'40px 0' }}>
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:48, alignItems:'start' }}>
        <div style={{ position:'sticky', top:24 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:muted, marginBottom:10 }}>
            <span style={{ width:8, height:8, borderRadius:99, background:accent }}/> Direction {tag}
          </div>
          <h3 style={{ margin:'0 0 10px', fontFamily:'"Fraunces",serif', fontWeight:500, fontSize:32, letterSpacing:'-.02em', lineHeight:1.05, color:ink }}>{name}</h3>
          <p style={{ margin:0, fontSize:14.5, lineHeight:1.55, color:muted, maxWidth:240 }}>{blurb}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'40px 28px' }}>
          {EMOTIONS_6.map(e => (
            <div key={e.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
              <Device scale={0.78}>
                <Comp emotion={e.id} size={LCD_OUTER_W*0.78 - 28} />
              </Device>
              <div style={{ marginTop:14, fontSize:12.5, color:muted, fontFamily:'ui-monospace,Menlo', letterSpacing:'.06em' }}>{e.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Directions(){
  return (
    <div>
      <DirectionRow tag="A" name="Soft Companion" accent={P.cyan}
        blurb="Pill-shaped glowing eyes, warm cheeks, calm rounded mouth. Pastel-on-midnight. Reads as nurturing and safe."
        Comp={FaceA} />
      <DirectionRow tag="B" name="Smart AI Buddy" accent={P.aqua}
        blurb="Concentric luminous arcs and a scanline core. Subtle waveform mouth. Reads as intelligent, premium, slightly futuristic."
        Comp={FaceB} />
      <DirectionRow tag="C" name="Playful Learning Friend" accent={P.amber}
        blurb="Larger round elastic eyes, brighter tints, micro stars and dots. Reads as joyful and energetic, still controlled."
        Comp={FaceC} />
    </div>
  );
}

// ─── 2. Verdict + chosen language ──────────────────────────
function Verdict(){
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:64, alignItems:'start' }}>
      <div>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.18em', color:muted, textTransform:'uppercase', marginBottom:8 }}>Chosen direction</div>
        <h3 style={{ margin:'0 0 16px', fontFamily:'"Fraunces",serif', fontWeight:500, fontSize:44, letterSpacing:'-.02em', lineHeight:1.05, color:ink }}>
          A — Soft Companion, with B&apos;s ring discipline.
        </h3>
        <p style={{ margin:'0 0 20px', fontSize:16, lineHeight:1.6, color:'#2C2E36', maxWidth:560 }}>
          A reads as the most child-safe and the most distinctive at 1–2 m. The pill eyes are the silhouette
          parents will remember. C is too busy on a 320×240 panel and edges into babyish; B feels cold and
          gendered toward older users. We keep A&apos;s warmth and import the perimeter ring from B as the
          single most important state cue (idle / listening / speaking / thinking).
        </p>
        <ul style={{ margin:0, padding:0, listStyle:'none', display:'grid', gap:10, fontSize:14.5, color:muted }}>
          <li><span style={{ color:ink, fontWeight:500 }}>Eyes</span> — pill-shaped, 48×52 px. Specular highlight in upper third. The whole emotional bandwidth lives here.</li>
          <li><span style={{ color:ink, fontWeight:500 }}>Mouth</span> — small. Smile arc / dot / waveform. Never larger than ~⅓ of the face.</li>
          <li><span style={{ color:ink, fontWeight:500 }}>Cheeks</span> — coral glow at low opacity. On for warmth states; off for system / safety.</li>
          <li><span style={{ color:ink, fontWeight:500 }}>Ring</span> — perimeter, 3.5 px, rounded 22 px. Color = the active state. Pulses for listening.</li>
          <li><span style={{ color:ink, fontWeight:500 }}>Ambient</span> — radial bg glow tinted by state, 8–24% opacity. Vignette anchors corners.</li>
          <li><span style={{ color:ink, fontWeight:500 }}>Icons</span> — only when load-bearing (Wi-Fi, mic, battery, helper, star, book, compass, shield).</li>
        </ul>
      </div>
      <div>
        <Device scale={1.1} label="Production face · idle">
          <FaceV2 emotion="idle" size={LCD_OUTER_W*1.1 - 28}/>
        </Device>
      </div>
    </div>
  );
}

// Anatomy diagram + palette + motion rules
function Anatomy(){
  const Token = ({ name, hex, role }) => (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:`1px solid ${rule}` }}>
      <div style={{ width:34, height:34, borderRadius:8, background:hex, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.06)' }}/>
      <div style={{ display:'flex', flexDirection:'column' }}>
        <div style={{ fontSize:14, color:ink, fontWeight:500 }}>{name}</div>
        <div style={{ fontSize:12, color:muted, fontFamily:'ui-monospace,Menlo' }}>{hex} — {role}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:48, marginTop:48 }}>
      {/* Anatomy callouts */}
      <div>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.16em', color:muted, textTransform:'uppercase', marginBottom:12 }}>Anatomy</div>
        <div style={{ position:'relative' }}>
          <Device scale={0.9}>
            <FaceV2 emotion="idle" size={LCD_OUTER_W*0.9 - 28}/>
          </Device>
        </div>
        <div style={{ marginTop:48, display:'grid', gap:12, fontSize:13.5, color:muted, lineHeight:1.55 }}>
          <div><b style={{ color:ink }}>1 Pill eye</b> — 48×52 px, 24 px radius, soft white. Specular ellipse top-left.</div>
          <div><b style={{ color:ink }}>2 Mouth</b> — 36×10 max. Smile arc, dot, or waveform.</div>
          <div><b style={{ color:ink }}>3 Cheek</b> — 28 px coral, 60% opacity. Optional.</div>
          <div><b style={{ color:ink }}>4 Ring</b> — 3.5 px stroke, rounded. Pulses for active states.</div>
          <div><b style={{ color:ink }}>5 Ambient</b> — radial gradient tinted by state.</div>
        </div>
      </div>

      {/* Palette */}
      <div>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.16em', color:muted, textTransform:'uppercase', marginBottom:12 }}>LCD palette</div>
        <Token name="Midnight"      hex={P.bg0}    role="canvas"/>
        <Token name="Skin"          hex={P.skin}   role="eyes / mouth"/>
        <Token name="Cyan"          hex={P.cyan}   role="speaking · idle ring"/>
        <Token name="Aqua"          hex={P.aqua}   role="listening · attention"/>
        <Token name="Mint"          hex={P.mint}   role="success · review"/>
        <Token name="Amber"         hex={P.amber}  role="retry · low batt · redirect"/>
        <Token name="Coral"         hex={P.coral}  role="cheeks · child voice"/>
        <Token name="Violet"        hex={P.violet} role="thinking · syncing"/>
        <Token name="Helper"        hex={P.helper} role="locked · safety pause"/>
        <Token name="Boot blue"     hex={P.blue}   role="wake / reconnect"/>
      </div>

      {/* Motion rules */}
      <div>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.16em', color:muted, textTransform:'uppercase', marginBottom:12 }}>Motion rules</div>
        <div style={{ display:'grid', gap:14 }}>
          {[
            ['Breathe', '4.2 s ease-in-out, ±3 px Y. Idle, listening, charging.'],
            ['Blink',   'Every 4–6 s. 120 ms close, 80 ms open. Both eyes together.'],
            ['Speak',   'Mouth waveform synced to TTS phonemes; head bob 0.8 s.'],
            ['Listen',  'Ring pulses 1.6 s. Eyes one notch wider; mouth shrinks to dot.'],
            ['Child voice', 'Ring switches to mint, pulses 1.0 s; mint waveform appears at lower screen.'],
            ['Think',   'Eyes look up; tilt rocks ±2°; violet orbit dot 1.6 s.'],
            ['Success', '800 ms sparkle drift, then return to idle. No scaling pop.'],
            ['Retry',   'Soft 3° tilt, no frown — eyes stay friendly. Loop arrow appears.'],
            ['System',  'All system states (low batt, reconnect, mic) stay calm — same breathing as idle.'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'grid', gridTemplateColumns:'110px 1fr', gap:14, fontSize:13.5, color:muted, paddingBottom:10, borderBottom:`1px solid ${rule}` }}>
              <div style={{ color:ink, fontWeight:500 }}>{k}</div>
              <div style={{ lineHeight:1.55 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 3. 25-state board ─────────────────────────────────────
function StateBoard(){
  const groups = ['Lifecycle','Conversation','Feedback','Safety','System'];
  return (
    <div style={{ display:'grid', gap:48 }}>
      {groups.map(g => {
        const items = STATES_V2.filter(s => s.group === g);
        return (
          <div key={g}>
            <div style={{ display:'flex', alignItems:'baseline', gap:14, marginBottom:18 }}>
              <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.18em', color:muted, textTransform:'uppercase' }}>{g}</span>
              <span style={{ flex:1, height:1, background:rule }}/>
              <span style={{ fontSize:12, color:muted }}>{items.length} state{items.length===1?'':'s'}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'48px 28px' }}>
              {items.map(s => (
                <div key={s.id} style={{ display:'flex', flexDirection:'column' }}>
                  <Device scale={0.82}>
                    <FaceV2 emotion={s.id} size={LCD_OUTER_W*0.82 - 28}/>
                  </Device>
                  <div style={{ marginTop:34, display:'flex', alignItems:'baseline', gap:10 }}>
                    <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, color:muted }}>{String(s.num).padStart(2,'0')}</span>
                    <h4 style={{ margin:0, fontSize:17, color:ink, fontFamily:'"Fraunces",serif', fontWeight:500, letterSpacing:'-.01em' }}>{s.label}</h4>
                  </div>
                  <div style={{ marginTop:10, display:'grid', gap:6, fontSize:12.5, color:muted, lineHeight:1.5 }}>
                    <div><b style={{ color:ink, fontWeight:500 }}>Anim · </b>{s.anim}</div>
                    <div><b style={{ color:ink, fontWeight:500 }}>Audio · </b>{s.audio}</div>
                    <div><b style={{ color:ink, fontWeight:500 }}>Feel · </b>{s.feel}</div>
                    <div><b style={{ color:ink, fontWeight:500 }}>Trigger · </b>{s.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 4. Storyboards ────────────────────────────────────────
const STORYBOARDS = [
  {
    id:'sb1', title:'Storyboard 1 · First word practice',
    sub:'Target word: "Apple". Robot models, child mimics, success on first try.',
    duration:'≈ 6.4 s',
    frames:[
      { state:'course_ready', t:'0.0 s', cap:'Course ready',          note:'Lesson loaded; star above face.', audio:'Lesson chime', feel:'Anticipation' },
      { state:'speak_word',   t:'0.6 s', cap:'Robot says "Apple"',    note:'Waveform syncs; cheeks warm.', audio:'TTS: "Apple."', feel:'Clear model' },
      { state:'listen',       t:'1.6 s', cap:'Listening',             note:'Aqua ring pulse; eyes wide.', audio:'Soft listen tone', feel:'My turn' },
      { state:'child_speak',  t:'2.4 s', cap:'Child voice detected',  note:'Ring → mint; mint waveform appears.', audio:'Silent — Robot listens', feel:'Heard' },
      { state:'think',        t:'3.4 s', cap:'Thinking',              note:'Up-eyes; orbit dot; ~900 ms.', audio:'Silent', feel:'Considering' },
      { state:'success',      t:'4.3 s', cap:'Success',               note:'Eye arcs; sparkles drift up.', audio:'Chime + "Yes!"', feel:'Earned' },
      { state:'idle',         t:'5.4 s', cap:'Next turn ready',       note:'Returns to idle breathing.', audio:'Silent', feel:'Calm reset' },
    ],
  },
  {
    id:'sb2', title:'Storyboard 2 · Sentence practice with retry',
    sub:'"I like apples." Child stumbles once, gets a gentle retry, succeeds on second attempt.',
    duration:'≈ 12.0 s',
    frames:[
      { state:'speak_sent',   t:'0.0 s', cap:'Robot says sentence',   note:'Wider waveform; mid-sentence blink.', audio:'TTS: "I like apples."', feel:'Modeling' },
      { state:'listen',       t:'1.8 s', cap:'Listening',             note:'Ring pulse aqua.', audio:'Listen tone', feel:'My turn' },
      { state:'child_speak',  t:'2.6 s', cap:'Child speaks',          note:'Mint pulse; waveform.', audio:'Silent', feel:'Heard' },
      { state:'think',        t:'4.0 s', cap:'Thinking',              note:'Orbit dot, ~1.1 s.', audio:'Silent', feel:'Considering' },
      { state:'retry',        t:'5.1 s', cap:'Gentle retry · 5B',     note:'3° tilt, soft amber loop. Eyes warm.', audio:'"Let\'s try together!"', feel:'Encouraged' },
      { state:'listen',       t:'6.6 s', cap:'Listening again · 6B',  note:'Ring pulse aqua.', audio:'Listen tone', feel:'Second chance' },
      { state:'child_speak',  t:'7.2 s', cap:'Child speaks again',    note:'Mint pulse; brighter.', audio:'Silent', feel:'Confident' },
      { state:'success',      t:'9.0 s', cap:'Success · 7B',          note:'Sparkles; cheeks bright.', audio:'Chime + "Great!"', feel:'Proud' },
    ],
  },
  {
    id:'sb3', title:'Storyboard 3 · Child interrupts robot',
    sub:'Robot is mid-sentence; child speaks. Robot yields gracefully and responds.',
    duration:'≈ 4.2 s',
    frames:[
      { state:'speak_sent',   t:'0.0 s', cap:'Robot speaking',        note:'Wave mid-flight.', audio:'TTS in progress', feel:'Receiving' },
      { state:'interrupt',    t:'0.9 s', cap:'Interruption detected', note:'Wave stops; pause icon; mouth dot.', audio:'TTS fades 150 ms', feel:'Acknowledged' },
      { state:'listen',       t:'1.2 s', cap:'Listening',             note:'Ring pulse aqua. Fast handoff.', audio:'Listen tone', feel:'Yielded gracefully' },
      { state:'think',        t:'2.6 s', cap:'Thinking',              note:'Up-eyes; orbit.', audio:'Silent', feel:'Considering' },
      { state:'speak_sent',   t:'3.4 s', cap:'Responds kindly',       note:'New waveform; warm cheeks.', audio:'TTS reply', feel:'Heard, answered' },
    ],
  },
  {
    id:'sb4', title:'Storyboard 4 · Robot could not hear',
    sub:'Listen window opens, child stays quiet, gentle re-prompt without blame.',
    duration:'≈ 9.5 s',
    frames:[
      { state:'listen',       t:'0.0 s', cap:'Listening',             note:'Ring pulse aqua.', audio:'Listen tone', feel:'My turn' },
      { state:'silence',      t:'3.0 s', cap:'Silence / waiting',     note:'Slow blink; ring stays soft.', audio:'Silent', feel:'No pressure' },
      { state:'didnt_hear',   t:'5.5 s', cap:"Didn't hear clearly",   note:'Up-eyes; question shimmer.', audio:'"Hmm, can you say it again?"', feel:'Curious' },
      { state:'retry',        t:'7.0 s', cap:'Gentle retry',          note:'Tilt + loop arrow.', audio:'"Let\'s try together!"', feel:'Encouraged' },
      { state:'listen',       t:'8.4 s', cap:'Listening again',       note:'Ring pulse aqua.', audio:'Listen tone', feel:'Second chance' },
    ],
  },
  {
    id:'sb5', title:'Storyboard 5 · Lesson complete',
    sub:'Final word landed; celebration; settle to rest.',
    duration:'≈ 7.0 s',
    frames:[
      { state:'success',      t:'0.0 s', cap:'Activity complete',     note:'Smile arc; cheeks bright.', audio:'Chime + "You did it!"', feel:'Earned' },
      { state:'celebrate',    t:'0.8 s', cap:'Big celebration',       note:'Confetti rains 1.6 s; ring glow mint.', audio:'Two-note flourish', feel:'Joy' },
      { state:'idle',         t:'3.4 s', cap:'Calm rest',             note:'Returns to idle breathing.', audio:'Silent', feel:'Composed glow' },
      { state:'sleep',        t:'5.4 s', cap:'Sleep',                 note:'Eyes close, "z z" drift.', audio:'Silent', feel:'Peaceful end' },
    ],
  },
];

function Storyboard({ sb }){
  return (
    <div style={{ marginBottom:88 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:18, marginBottom:6, flexWrap:'wrap' }}>
        <h3 style={{ margin:0, fontFamily:'"Fraunces",serif', fontWeight:500, fontSize:30, letterSpacing:'-.02em', color:ink }}>{sb.title}</h3>
        <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, color:muted, letterSpacing:'.14em' }}>{sb.duration}</span>
      </div>
      <p style={{ margin:'0 0 28px', color:muted, fontSize:15, maxWidth:680 }}>{sb.sub}</p>
      <div style={{ position:'relative' }}>
        {/* the timeline rail */}
        <div style={{ position:'absolute', left:0, right:0, top:130, height:1, background:rule }}/>
        <div style={{ display:'flex', overflowX:'auto', gap:24, paddingBottom:8 }}>
          {sb.frames.map((f, i) => (
            <div key={i} style={{ flex:'0 0 auto', width:280 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
                <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, color:ink, fontWeight:600, letterSpacing:'.04em' }}>FR {String(i+1).padStart(2,'0')}</span>
                <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, color:muted }}>{f.t}</span>
              </div>
              <Device scale={0.82}>
                <FaceV2 emotion={f.state} size={LCD_OUTER_W*0.82 - 28}/>
              </Device>
              <div style={{ marginTop:28, fontSize:14.5, color:ink, fontWeight:500 }}>{f.cap}</div>
              <div style={{ marginTop:6, display:'grid', gap:4, fontSize:12.5, color:muted, lineHeight:1.55 }}>
                <div><b style={{ color:ink, fontWeight:500 }}>Anim · </b>{f.note}</div>
                <div><b style={{ color:ink, fontWeight:500 }}>Audio · </b>{f.audio}</div>
                <div><b style={{ color:ink, fontWeight:500 }}>Feel · </b>{f.feel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 5. Mobile → LCD mapping ───────────────────────────────
const MAP = [
  ['Mobile course state', 'Robot LCD face', 'Notes'],
  ['App open · Home idle',                       'idle',         'Robot breathes calmly on stand.'],
  ['Lesson card tapped → loading',               'syncing',      'Eyes closed, violet orbit.'],
  ['Lesson loaded, ready to start',              'course_ready', 'Star icon + smile.'],
  ['"Tap to start" pressed',                     'speak_word',   'Robot models target word.'],
  ['Robot finishes speaking · awaits child',     'listen',       'Aqua ring pulse.'],
  ['Child speaking (VAD active)',                'child_speak',  'Mint ring + waveform.'],
  ['Scoring in progress',                        'think',        'Violet orbit, ≤ 1.5 s.'],
  ['Correct answer (single turn)',               'success',      'Sparkle drift.'],
  ['Incorrect / low confidence',                 'retry',        'Tilt + loop arrow. Never sad.'],
  ['Listen window timed out',                    "didnt_hear",   'Curious eyes, question shimmer.'],
  ['Child speech off-topic 2× in a row',         'redirect',     'Compass cue, calm.'],
  ['Word due for spaced review',                 'review',       'Book icon; invitation tone.'],
  ['Child taps locked lesson',                   'locked',       'Helper silhouette; ask grown-up.'],
  ['Lesson complete',                            'celebrate',    'Confetti; ≤ 1.6 s.'],
  ['Quiet hours / 10 min idle',                  'sleep',        '"z z" drift, dim glow.'],
  ['Wake from sleep / first power-on',           'boot',         'Eyes rise from darkness.'],
  ['Robot listening for parent voice (settings)','look',         'Eye contact, no mouth waveform.'],
  ['Network blip mid-lesson',                    'reconnect',    'Wifi pulse; calm.'],
  ['Mic permission missing / hardware mute',     'mic_off',      'Mic-slash glyph; parent app prompts.'],
  ['Battery < 15%',                              'low_batt',     'Droopy eyes; amber sliver.'],
  ['Docked',                                     'charging',     'Closed eyes, mint fill.'],
  ['Trigger phrase / safety',                    'safety',       'Lavender shield; pause.'],
  ['Course content updating in background',      'syncing',      'Same as load.'],
];

function Mapping(){
  return (
    <div style={{ borderTop:`1px solid ${rule}`, marginTop:8 }}>
      {MAP.map((row, i) => {
        const head = i === 0;
        return (
          <div key={i} style={{
            display:'grid', gridTemplateColumns:'1.4fr 0.9fr 1.5fr',
            gap:32, padding:'14px 0', borderBottom:`1px solid ${rule}`,
            alignItems:'center',
            fontFamily: head?'ui-monospace,Menlo':'inherit',
            fontSize: head?11:14.5,
            letterSpacing: head?'.16em':'normal',
            textTransform: head?'uppercase':'none',
            color: head?muted:ink,
          }}>
            <div>{row[0]}</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {!head && (
                <span style={{ width:46, height:34, borderRadius:5, overflow:'hidden', flex:'0 0 auto', background:'#000', boxShadow:'inset 0 0 0 1px rgba(0,0,0,.15)' }}>
                  <FaceV2 emotion={row[1]} size={46}/>
                </span>
              )}
              <code style={{ fontFamily:'ui-monospace,Menlo', fontSize: head?11:12.5, color: head?muted:'#3B5BCC' }}>{row[1]}</code>
            </div>
            <div style={{ color: head?muted:'#3a3a40', fontSize: head?11:13.5 }}>{row[2]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 6. Never on the LCD ───────────────────────────────────
const NEVER = [
  ['Prices, paywalls, upsells',  'Adult-money decisions never appear on the child face.'],
  ['Long text, tutorials',       'Max one large word, optional. The face is the message.'],
  ['Score numbers, percentages', 'No quantification of the child\'s effort.'],
  ['Red X, alarm red',           'Failure visuals. Even safety pause uses lavender, not red.'],
  ['Angry face, crying face',    'The Robot is incapable of these expressions.'],
  ['Failure labels',             'No "Wrong", no "Try again" text. Visuals + voice only.'],
  ['Leaderboards, ranks',        'No comparison to other children, ever.'],
  ['Complex menus',              'No tabs, no lists. The Robot is not a phone.'],
  ['Tiny app icons',             'Min 44 px touch / 24 px icon. Glyphs are bold or absent.'],
  ['Generic spinners',           'Use the orbit-dot or breathing ring; never an OS spinner.'],
  ['Unbranded confetti',         'Confetti uses the LCD palette only — no rainbow vomit.'],
  ['Flashing / strobe',          'Nothing changes faster than 1.6 Hz. Photosensitive-safe.'],
];

function NeverList(){
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 56px', marginTop:8 }}>
      {NEVER.map(([k,v]) => (
        <div key={k} style={{ display:'grid', gridTemplateColumns:'24px 1fr', gap:14, padding:'14px 0', borderTop:`1px solid ${rule}`, alignItems:'baseline' }}>
          <span style={{ fontSize:18, color:'#B73A3A', lineHeight:1, fontWeight:600 }}>×</span>
          <div>
            <div style={{ fontSize:15, color:ink, fontWeight:500 }}>{k}</div>
            <div style={{ fontSize:13.5, color:muted, marginTop:4, lineHeight:1.55 }}>{v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page shell ────────────────────────────────────────────
const NAV = [
  ['#brief',     'Brief'],
  ['#a',         'Direction A'],
  ['#b',         'Direction B'],
  ['#c',         'Direction C'],
  ['#chosen',    'Chosen face'],
  ['#states',    '25 states'],
  ['#stories',   'Storyboards'],
  ['#mapping',   'Mapping'],
  ['#never',     'Never'],
];

function App(){
  return (
    <div style={{ background:paper, color:ink, minHeight:'100vh', fontFamily:'-apple-system,"SF Pro Text",Inter,system-ui,sans-serif' }}>
      {/* Header */}
      <header data-screen-label="Hero" style={{ padding:'72px 64px 16px', borderBottom:`1px solid ${rule}`, position:'relative' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.22em', color:muted, textTransform:'uppercase', marginBottom:14 }}>
              TBOT · Robot Face System v2 · LCD 320×240
            </div>
            <h1 style={{ margin:0, fontFamily:'"Fraunces",Georgia,serif', fontWeight:400, fontSize:96, lineHeight:0.96, letterSpacing:'-.035em', maxWidth:1100, textWrap:'balance' }}>
              The Robot's face. The product's identity.
            </h1>
            <p style={{ margin:'24px 0 0', fontSize:18, color:muted, maxWidth:760, lineHeight:1.5, textWrap:'pretty' }}>
              A premium LCD face system designed to feel alive, warm, and intelligent at 1–2 m — a companion you trust your child with, not a dashboard.
              Three style explorations, a chosen direction, the full 25-state board, and the lesson flow that lives on it.
            </p>
          </div>
          <div style={{ display:'flex', gap:24, alignItems:'center' }}>
            <Device scale={0.95}>
              <FaceV2 emotion="idle" size={LCD_OUTER_W*0.95 - 28}/>
            </Device>
          </div>
        </div>
        <nav style={{ marginTop:48, display:'flex', flexWrap:'wrap', gap:'10px 6px' }}>
          {NAV.map(([h,l]) => (
            <a key={h} href={h} style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.14em', color:muted, textTransform:'uppercase',
              padding:'6px 12px', border:`1px solid ${rule}`, borderRadius:99, textDecoration:'none' }}>{l}</a>
          ))}
        </nav>
      </header>

      <Section id="brief" kicker="01 · Brief"
        title="Three explorations before we commit."
        sub="Same character, three visual languages. Each rendered at six emotional states on the same 320×240 LCD with the same bezel. We pick the one that earns the silhouette test.">
      </Section>

      <div data-screen-label="Direction A · Soft Companion" id="a"><Directions /></div>

      <Section id="chosen" kicker="02 · Chosen language"
        title="Pill-eyes on midnight. The face we ship."
        sub="A soft companion that holds attention without competing with the lesson. Eyes do the work; the perimeter ring is the second voice.">
        <Verdict />
        <Anatomy />
      </Section>

      <Section id="states" kicker="03 · Face state board"
        title="All 25 states, one character."
        sub="Grouped by purpose — Lifecycle, Conversation, Feedback, Safety, System. Every state is the same Robot wearing a different feeling, never a different costume.">
        <div data-screen-label="25 States"><StateBoard /></div>
      </Section>

      <Section id="stories" kicker="04 · Lesson storyboards"
        title="Five cinematic flows on the LCD."
        sub="The lesson example is a single word, &ldquo;Apple,&rdquo; and a sentence, &ldquo;I like apples.&rdquo; Each storyboard reads left-to-right with timing, animation, audio, and emotional intent.">
        <div data-screen-label="Storyboards">
          {STORYBOARDS.map(sb => <Storyboard key={sb.id} sb={sb} />)}
        </div>
      </Section>

      <Section id="mapping" kicker="05 · Mobile → LCD mapping"
        title="Every app event has one face."
        sub="When the app changes course state, the Robot changes feeling. This is the contract.">
        <Mapping />
      </Section>

      <Section id="never" kicker="06 · Rules"
        title="What must never appear on the LCD."
        sub="The face is the product. These belong on the parent's phone, in the SDK logs, or nowhere at all.">
        <NeverList />
      </Section>

      <footer style={{ padding:'72px 64px 96px', borderTop:`1px solid ${rule}`, marginTop:32 }}>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.22em', color:muted, textTransform:'uppercase' }}>
          End of document · TBOT Robot Face System v2
        </div>
      </footer>
    </div>
  );
}

window.LCDv2Page = App;
