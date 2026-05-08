// LCD Face System page — dedicated reference for the physical Robot's
// 3.2" / ~320×240 LCD. NOT a mobile app screen. Shows all 20 face states,
// the visual system (eyes/mouth/cheeks/rings/icons), and storyboards for
// real lesson moments. Driven entirely off LCD_STATES_LIST + LCDFace +
// RobotDevice from lcd-face.jsx.

(function(){
  // ── tokens (scoped to this page; mirrors tokens.css feel) ──
  const C = {
    page:        '#F5EFE3',
    paper:       '#FFFCF6',
    paperEdge:   'rgba(0,0,0,.06)',
    ink:         '#2B2140',
    inkSoft:     '#5C4F77',
    inkMuted:    '#8B7BA8',
    coral:       '#FF6F61',
    sky:         '#6FC1FF',
    mint:        '#6CE2B6',
    sun:         '#FFC857',
    plum:        '#9B8FB8',
    cream:       '#FFF5E6',
    lcdBg:       '#0E1116',
  };

  // group meta — color + short description
  const GROUP_META = {
    Lifecycle:     { color: C.sky,   blurb: 'Power, sleep, wake. Calm transitions only.' },
    Conversation:  { color: C.coral, blurb: 'The lesson loop: speak ⇄ listen ⇄ think.' },
    Feedback:      { color: C.mint,  blurb: 'Reactions to what the child said. Always kind.' },
    Safety:        { color: C.plum,  blurb: 'Off-topic redirects and grown-up pauses.' },
    System:        { color: C.sun,   blurb: 'Network, mic, battery — never alarming.' },
  };

  const GROUP_ORDER = ['Lifecycle','Conversation','Feedback','Safety','System'];

  // ── re-usable little bits ──
  function Pill({ children, bg, fg }){
    return <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 10px', borderRadius:999,
      background:bg||'rgba(255,255,255,.7)', color:fg||C.inkSoft,
      fontFamily:'var(--body)', fontWeight:700, fontSize:12,
      letterSpacing:.2,
    }}>{children}</span>;
  }
  function Dot({ color }){
    return <span style={{ width:8, height:8, borderRadius:4, background:color, display:'inline-block' }}/>;
  }

  // ── the device-cradle: shows the LCD as a 3.2" slab inside a hint of
  //    Robot bezel, plus a faint "child eye-line" callout
  function LCDSlab({ emotion, w=380, label, num, group, anim, use }){
    const lcdW = w; const lcdH = lcdW * (240/320);
    const gMeta = GROUP_META[group] || { color: C.coral };
    return (
      <div style={{
        background: C.paper, borderRadius: 24, padding: 18,
        boxShadow: '0 1px 0 rgba(255,255,255,.8) inset, 0 8px 24px rgba(40,30,20,.05), 0 0 0 1px '+C.paperEdge,
        display:'flex', flexDirection:'column', gap:14, width: lcdW + 36,
      }}>
        {/* LCD */}
        <div style={{
          position:'relative', width:lcdW, height:lcdH, borderRadius: 16, overflow:'hidden',
          background: C.lcdBg,
          boxShadow:'0 0 0 6px #1A1A1F, 0 0 0 8px #2c2c33, 0 14px 30px rgba(0,0,0,.18)',
        }}>
          <LCDFace emotion={emotion} size={lcdW}/>
          {/* tiny corner spec */}
          <div style={{
            position:'absolute', top:8, right:10,
            fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize:10, letterSpacing:.6, color:'rgba(255,255,255,.3)',
          }}>320×240</div>
        </div>
        {/* meta */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{
              fontFamily:'var(--display)', fontWeight:800, fontSize:13,
              color: gMeta.color, letterSpacing:1, textTransform:'uppercase',
            }}>{String(num).padStart(2,'0')} · {group}</span>
          </div>
          <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:24, color:C.ink, lineHeight:1.1 }}>{label}</div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, lineHeight:1.45 }}>
            <strong style={{ color:C.ink }}>Animation.</strong> {anim}
          </div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, lineHeight:1.45 }}>
            <strong style={{ color:C.ink }}>Used when.</strong> {use}
          </div>
        </div>
      </div>
    );
  }

  // ── visual-system reference card: face anatomy ──
  function AnatomyCard(){
    return (
      <div style={{ background:C.paper, borderRadius:24, padding:24, display:'grid', gridTemplateColumns:'minmax(220px,300px) 1fr', gap:28, alignItems:'center', boxShadow:'0 0 0 1px '+C.paperEdge }}>
        <div style={{ width:300, height:225, background:C.lcdBg, borderRadius:16, padding:8, boxShadow:'0 0 0 6px #1A1A1F' }}>
          <svg viewBox="0 0 320 240" width="100%" height="100%">
            {/* eyes */}
            <circle cx="110" cy="120" r="22" fill="#E8F4FF"/>
            <circle cx="115" cy="117" r="7" fill={C.lcdBg}/>
            <circle cx="210" cy="120" r="22" fill="#E8F4FF"/>
            <circle cx="215" cy="117" r="7" fill={C.lcdBg}/>
            {/* cheeks */}
            <ellipse cx="78" cy="160" rx="18" ry="11" fill={C.coral} opacity=".85"/>
            <ellipse cx="242" cy="160" rx="18" ry="11" fill={C.coral} opacity=".85"/>
            {/* mouth */}
            <path d="M128 178 Q160 200 192 178" stroke="#E8F4FF" strokeWidth="10" fill="none" strokeLinecap="round"/>
            {/* labels */}
            <g fontFamily="ui-monospace, Menlo" fontSize="10" fill="rgba(255,255,255,.55)">
              <line x1="135" y1="120" x2="180" y2="60" stroke="rgba(255,255,255,.35)" strokeWidth="1"/>
              <text x="184" y="58">eyes (skin)</text>
              <line x1="78" y1="148" x2="40" y2="100" stroke="rgba(255,255,255,.35)" strokeWidth="1"/>
              <text x="6" y="96">cheeks (accent)</text>
              <line x1="160" y1="190" x2="220" y2="220" stroke="rgba(255,255,255,.35)" strokeWidth="1"/>
              <text x="222" y="223">mouth</text>
            </g>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:28, color:C.ink, marginBottom:6 }}>Face anatomy</div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:15, color:C.inkSoft, lineHeight:1.6, maxWidth: 540 }}>
            Every face is built from the same five elements. We change <strong>one or two at a time</strong> to express emotion — never every element at once. This keeps states feel related, like the same character is reacting differently rather than morphing into a new robot.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18 }}>
            {[
              ['Eyes',     'open · happy · closed · wide · up · droopy · blinking'],
              ['Mouth',    'smile · big · tinyo · O · line · soft · wave · dots'],
              ['Cheeks',   'on / off (accent color)'],
              ['Ring',     'pulse (active) · glow (state) · none (calm)'],
              ['Brow',     'rare. Slight down or asymmetric for "I tried to hear"'],
              ['Icon',     'tiny semantic mark above (?, arrow, wifi, shield, battery)'],
            ].map(([k,v])=>(
              <div key={k} style={{ background:C.cream, padding:'10px 12px', borderRadius:10 }}>
                <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:C.ink }}>{k}</div>
                <div style={{ fontFamily:'ui-monospace, Menlo, monospace', fontSize:11, color:C.inkSoft, marginTop:3 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── color & ring legend ──
  function LegendCard(){
    const ringRow = (color, name, when) => (
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'8px 0' }}>
        <div style={{ width:60, height:42, borderRadius:8, background:C.lcdBg, position:'relative', flex:'0 0 auto' }}>
          <div style={{ position:'absolute', inset:4, borderRadius:5, border:'2.5px solid '+color }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:15, color:C.ink }}>{name}</div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:13, color:C.inkSoft }}>{when}</div>
        </div>
      </div>
    );
    return (
      <div style={{ background:C.paper, borderRadius:24, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:24, color:C.ink, marginBottom:6 }}>Glow ring meanings</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginBottom:14 }}>The ring around the face panel is the most-readable signal from across the room. Only one meaning per color.</div>
        {ringRow(C.coral, 'Coral · listening',     'Mic is open, please speak.')}
        {ringRow(C.mint,  'Mint · positive',       'Good answer / child speaking detected.')}
        {ringRow(C.sun,   'Yellow · trying',       'Reconnecting Wi-Fi or otherwise patient.')}
        {ringRow(C.plum,  'Lavender · grown-up',   'Calm safety pause — get a grown-up.')}
        {ringRow(C.sky,   'Blue · waking up',      'Booting or pairing.')}
      </div>
    );
  }

  // ── never-do card (boundaries) ──
  function NeverDoCard(){
    const items = [
      ['No red X',           'Errors and missed words never use red Xs or warning triangles.'],
      ['No frown / sad',     'Robot is patient. The closest is a soft asymmetric brow.'],
      ['No flashing',        'Pulses are slow (>1s). Rings never strobe.'],
      ['No tiny text',       'No paragraphs on the LCD. Icons + face do the talking.'],
      ['No "you failed"',    'Mistakes show as "let\'s try together", never "wrong".'],
      ['No alarm sounds',    'Even mic/wifi issues stay visually calm.'],
    ];
    return (
      <div style={{ background:C.paper, borderRadius:24, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:24, color:C.ink, marginBottom:6 }}>What the Robot never does</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginBottom:14 }}>The face is a child's first audience. These are non-negotiable.</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {items.map(([k,v])=>(
            <div key={k} style={{ display:'flex', gap:10, padding:'10px 12px', background:C.cream, borderRadius:10 }}>
              <div style={{ width:22, height:22, borderRadius:11, background:'#fff', flex:'0 0 auto', display:'grid', placeItems:'center', boxShadow:'0 0 0 1px rgba(0,0,0,.05)' }}>
                <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 2 L9 9 M9 2 L2 9" stroke={C.coral} strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:C.ink }}>{k}</div>
                <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:12.5, color:C.inkSoft, lineHeight:1.4 }}>{v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── storyboard frame: small LCD + caption + arrow ──
  function StoryFrame({ emotion, label, sub, last }){
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center', width: 200 }}>
          <div style={{ width:200, height:150, borderRadius:12, background:C.lcdBg, boxShadow:'0 0 0 5px #1A1A1F', overflow:'hidden' }}>
            <LCDFace emotion={emotion} size={200}/>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:C.ink }}>{label}</div>
            {sub && <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:11, color:C.inkSoft, marginTop:2 }}>{sub}</div>}
          </div>
        </div>
        {!last && (
          <svg width="28" height="20" viewBox="0 0 28 20" style={{ flex:'0 0 auto' }}>
            <path d="M2 10 H22 M16 4 L24 10 L16 16" stroke={C.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        )}
      </div>
    );
  }
  function Storyboard({ title, subtitle, frames, accent }){
    return (
      <div style={{ background:C.paper, borderRadius:24, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:4 }}>
          <Dot color={accent}/>
          <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:22, color:C.ink }}>{title}</div>
        </div>
        <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginBottom:18, marginLeft:18 }}>{subtitle}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
          {frames.map((f,i)=>(
            <StoryFrame key={i} emotion={f.e} label={f.l} sub={f.s} last={i===frames.length-1}/>
          ))}
        </div>
      </div>
    );
  }

  // ── physical-context card: shows the LCD inside the actual Robot, with
  //    a child silhouette to convey "1-2m viewing distance" ──
  function PhysicalContextCard(){
    return (
      <div style={{
        background: 'linear-gradient(160deg, #FFE6CC 0%, #FFF5E6 60%, #F4E2C9 100%)',
        borderRadius:28, padding:'32px 36px',
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'center',
        boxShadow:'0 8px 30px rgba(120,80,40,.08)',
      }}>
        <div>
          <Pill bg={C.ink} fg="#fff">PHYSICAL DEVICE</Pill>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:38, color:C.ink, marginTop:14, lineHeight:1.05 }}>The Robot's face<br/>is its UI.</div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:16, color:C.inkSoft, lineHeight:1.55, marginTop:14, maxWidth: 480 }}>
            A 3.2-inch landscape LCD (~320×240). No buttons, no menus, no paragraphs. The child looks at it from <strong>1–2 meters away</strong> while speaking. Every state has to be readable at a glance and feel emotionally safe.
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:18 }}>
            <Pill bg="#fff" fg={C.ink}>3.2" landscape LCD</Pill>
            <Pill bg="#fff" fg={C.ink}>~320×240 px</Pill>
            <Pill bg="#fff" fg={C.ink}>1–2 m viewing distance</Pill>
            <Pill bg="#fff" fg={C.ink}>20 face states</Pill>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', position:'relative', minHeight:340 }}>
          {/* child silhouette */}
          <svg viewBox="0 0 200 220" width="120" height="132" style={{ opacity:.7 }}>
            <circle cx="100" cy="50" r="34" fill={C.ink} opacity=".55"/>
            <path d="M40 220 Q40 110 100 110 Q160 110 160 220 Z" fill={C.ink} opacity=".55"/>
          </svg>
          {/* gaze line */}
          <svg width="110" height="40" viewBox="0 0 110 40" style={{ margin:'0 8px' }}>
            <path d="M0 20 H100" stroke={C.inkMuted} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round"/>
            <path d="M94 14 L102 20 L94 26" stroke={C.inkMuted} strokeWidth="2" strokeLinecap="round" fill="none"/>
            <text x="38" y="14" fontFamily="ui-monospace" fontSize="10" fill={C.inkSoft}>1–2 m</text>
          </svg>
          <RobotDevice emotion="idle" size={210}/>
        </div>
      </div>
    );
  }

  // ── main page ──
  function LCDFaceSystemPage(){
    // Group states by their "group" field (set in lcd-face.jsx).
    const grouped = {};
    GROUP_ORDER.forEach(g=> grouped[g] = []);
    LCD_STATES_LIST.forEach(s => {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push(s);
    });
    // global numbering across groups (1..20)
    let globalIdx = 0;
    const numbered = {};
    GROUP_ORDER.forEach(g=>{
      numbered[g] = (grouped[g]||[]).map(s => ({ ...s, num: ++globalIdx }));
    });

    return (
      <div style={{
        minHeight:'100vh', background:C.page,
        fontFamily:'var(--body)', color:C.ink,
        padding:'48px 56px 96px',
      }}>
        {/* page header */}
        <div style={{ marginBottom: 28, maxWidth: 920 }}>
          <Pill bg={C.coral} fg="#fff">LCD FACE SYSTEM · v1.0</Pill>
          <h1 style={{
            fontFamily:'var(--display)', fontWeight:800, fontSize:64, lineHeight:1.02,
            color:C.ink, margin:'14px 0 8px', letterSpacing:-1,
          }}>20 faces. One Robot.</h1>
          <p style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:18, color:C.inkSoft, lineHeight:1.5, maxWidth:760 }}>
            The complete visual library for the Robot's 3.2-inch LCD. Every face the device can show during a real lesson — booting, speaking, listening, thinking, celebrating, gently correcting, asking for a grown-up. Designed to be readable from across the room and emotionally safe at every moment.
          </p>
        </div>

        {/* hero — physical context */}
        <PhysicalContextCard/>

        {/* TOC strip */}
        <div style={{
          display:'flex', flexWrap:'wrap', gap:8, margin:'36px 0 28px',
          padding:'14px 18px', background:C.paper, borderRadius:18,
          boxShadow:'0 0 0 1px '+C.paperEdge,
        }}>
          <span style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:C.inkMuted, padding:'6px 4px', textTransform:'uppercase', letterSpacing:1 }}>Jump to ›</span>
          {GROUP_ORDER.map(g=>(
            <a key={g} href={'#g-'+g} style={{
              padding:'6px 12px', borderRadius:999,
              background:'rgba(255,255,255,.6)',
              fontFamily:'var(--body)', fontWeight:700, fontSize:13,
              color:C.ink, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6,
            }}>
              <Dot color={GROUP_META[g].color}/>{g} <span style={{ color:C.inkMuted, fontWeight:600 }}>· {numbered[g].length}</span>
            </a>
          ))}
          <a href="#storyboards" style={{
            padding:'6px 12px', borderRadius:999, background: C.ink, color:'#fff',
            fontFamily:'var(--body)', fontWeight:700, fontSize:13, textDecoration:'none',
          }}>Storyboards →</a>
        </div>

        {/* anatomy + legends */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
          <div style={{ gridColumn:'span 2' }}><AnatomyCard/></div>
          <LegendCard/>
          <NeverDoCard/>
        </div>

        {/* state groups */}
        {GROUP_ORDER.map(g => (
          <section id={'g-'+g} key={g} style={{ marginTop: 56 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:14, marginBottom:6 }}>
              <Dot color={GROUP_META[g].color}/>
              <h2 style={{
                fontFamily:'var(--display)', fontWeight:800, fontSize:36, color:C.ink,
                margin:0, letterSpacing:-.4,
              }}>{g}</h2>
              <span style={{ fontFamily:'ui-monospace, Menlo, monospace', color:C.inkMuted, fontSize:13 }}>
                {numbered[g].length} {numbered[g].length===1?'state':'states'}
              </span>
            </div>
            <p style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:15, color:C.inkSoft, margin:'0 0 24px 22px', maxWidth:680 }}>
              {GROUP_META[g].blurb}
            </p>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(420px, 1fr))',
              gap:18,
            }}>
              {numbered[g].map(s => (
                <LCDSlab key={s.id}
                  emotion={s.id}
                  num={s.num}
                  group={s.group}
                  label={s.label}
                  anim={s.anim}
                  use={s.use}
                  w={380}
                />
              ))}
            </div>
          </section>
        ))}

        {/* storyboards */}
        <section id="storyboards" style={{ marginTop:80 }}>
          <Pill bg={C.ink} fg="#fff">STORYBOARDS</Pill>
          <h2 style={{
            fontFamily:'var(--display)', fontWeight:800, fontSize:44, color:C.ink,
            margin:'14px 0 8px', letterSpacing:-.6,
          }}>How the face changes during a real lesson</h2>
          <p style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:16, color:C.inkSoft, marginBottom:28, maxWidth:720 }}>
            Three moments from a typical session, frame-by-frame on the actual LCD. Notice how a missed answer becomes "let's try", and how a Wi-Fi blip stays calm.
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <Storyboard
              title="One lesson turn"
              subtitle="The full conversation loop, ~6 seconds end-to-end. This pattern repeats every prompt."
              accent={C.coral}
              frames={[
                { e:'idle',        l:'Idle',           s:'Resting before prompt' },
                { e:'speak',       l:'Robot speaks',   s:'"Say apple"' },
                { e:'listen',      l:'Robot listens',  s:'Coral ring opens' },
                { e:'child_speak', l:'Child speaks',   s:'Bars + green pulse' },
                { e:'think',       l:'Thinking',       s:'~600ms latency' },
                { e:'success',     l:'Success',        s:'Sparkles + smile' },
              ]}
            />

            <Storyboard
              title="Retry — child wasn't heard"
              subtitle={'Mic timed out without clear audio. Robot stays kind: "didn\'t hear" → "let\'s try" → back to listening.'}
              accent={C.mint}
              frames={[
                { e:'listen',      l:'Listening',      s:'Window open' },
                { e:'didnt_hear',  l:"Didn't hear",    s:'Curious look + ear cue' },
                { e:'try_again',   l:'Try again',      s:'Loop arrow above' },
                { e:'listen',      l:'Listening',      s:'Second attempt' },
              ]}
            />

            <Storyboard
              title="Wi-Fi reconnect"
              subtitle="Network blip mid-lesson. Robot pauses gently, then either resumes or asks for a grown-up — never crashes."
              accent={C.sun}
              frames={[
                { e:'idle',       l:'Idle',         s:'Lesson in progress' },
                { e:'reconnect',  l:'Reconnecting', s:'Yellow ring breathes' },
                { e:'idle',       l:'Resumed',      s:'Back to lesson' },
                { e:'safety',     l:'Ask grown-up', s:'If still offline >30s' },
              ]}
            />

            <Storyboard
              title="Power & rest"
              subtitle="The lifecycle the child sees at the start and end of a session."
              accent={C.sky}
              frames={[
                { e:'boot',     l:'Booting',       s:'Eye dots wake up' },
                { e:'idle',     l:'Idle ready',    s:'Smiles, waits' },
                { e:'charging', l:'Charging',      s:'On the dock' },
                { e:'sleep',    l:'Sleeping',      s:'Quiet hours' },
              ]}
            />
          </div>
        </section>

        {/* footer */}
        <div style={{
          marginTop:80, padding:'28px 36px',
          background:C.ink, color:'#fff',
          borderRadius:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:18,
        }}>
          <div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, marginBottom:4 }}>20 faces. Zero alarms.</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:'rgba(255,255,255,.7)', maxWidth:520 }}>
              Every state was reviewed for child safety: never angry, never disappointed, never broken, never judgmental. The Robot is a patient friend.
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Pill bg="rgba(255,255,255,.12)" fg="#fff">SVG · scalable</Pill>
            <Pill bg="rgba(255,255,255,.12)" fg="#fff">Single component · &lt;LCDFace emotion="…"/&gt;</Pill>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { LCDFaceSystemPage });
})();
