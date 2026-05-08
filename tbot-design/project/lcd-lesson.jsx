// LCD lesson flow — "I like apples"
// A frame-by-frame look at what the Robot's 3.2" LCD shows during a real
// English lesson turn. Designed to live next to the LCD Face System page;
// every frame uses the same <LCDFace/> + <RobotDevice/> components so it
// matches the visual library exactly.

(function(){
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

  // ── tiny shared bits ──
  function Pill({ children, bg, fg }){
    return <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 10px', borderRadius:999,
      background:bg||'rgba(255,255,255,.7)', color:fg||C.inkSoft,
      fontFamily:'var(--body)', fontWeight:700, fontSize:12, letterSpacing:.2,
    }}>{children}</span>;
  }
  function Dot({ color, size=8 }){
    return <span style={{ width:size, height:size, borderRadius:size/2, background:color, display:'inline-block' }}/>;
  }

  // Rolling timeline marker — used at top of each card
  function StepBadge({ n, total, color }){
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{
          width:34, height:34, borderRadius:17, background:color, color:'#fff',
          fontFamily:'var(--display)', fontWeight:800, fontSize:16,
          display:'grid', placeItems:'center',
          boxShadow:'0 4px 10px rgba(0,0,0,.12)',
        }}>{n}</div>
        <div style={{ fontFamily:'ui-monospace, Menlo, monospace', fontSize:11, color:C.inkMuted, letterSpacing:.6 }}>
          STEP {String(n).padStart(2,'0')} / {String(total).padStart(2,'0')}
        </div>
      </div>
    );
  }

  // The LCD framed inside an embedded-product cradle: shows hard pixel size,
  // top corner spec, and an audio overlay (waveform / dialog bubble) when needed.
  function LCDStage({ emotion, w=420, overlay, bottomCue }){
    const lcdW = w; const lcdH = lcdW * (240/320);
    return (
      <div style={{ position:'relative', width:lcdW, height:lcdH, borderRadius:16, overflow:'hidden',
        background: C.lcdBg,
        boxShadow:'0 0 0 6px #1A1A1F, 0 0 0 8px #2c2c33, 0 14px 30px rgba(0,0,0,.18)',
      }}>
        <LCDFace emotion={emotion} size={lcdW}/>
        {/* spec corner */}
        <div style={{
          position:'absolute', top:8, right:10,
          fontFamily:'ui-monospace, Menlo, monospace',
          fontSize:10, letterSpacing:.6, color:'rgba(255,255,255,.3)',
        }}>320×240</div>
        {/* power LED */}
        <div style={{ position:'absolute', top:10, left:12, width:6, height:6, borderRadius:3, background:'#7BD389', boxShadow:'0 0 6px #7BD389' }}/>
        {overlay}
        {bottomCue}
      </div>
    );
  }

  // Big readable single-word overlay (used optionally on the LCD).
  function WordOverlay({ word, color=C.coral, anim }){
    return (
      <div style={{
        position:'absolute', left:0, right:0, bottom:14, textAlign:'center',
        fontFamily:'var(--display)', fontWeight:800, fontSize:32, color,
        letterSpacing:1, textShadow:'0 2px 6px rgba(0,0,0,.4)',
        animation: anim,
      }}>{word}</div>
    );
  }
  // A row of 7 reactive volume bars at the bottom of the LCD.
  function VoiceBars({ color=C.mint, count=11 }){
    const bars = [];
    for (let i=0;i<count;i++){
      bars.push(
        <div key={i} style={{
          width:5, height:8, borderRadius:2.5, background:color,
          animation:`lcdvb-${i%5} 0.6s ease-in-out infinite`,
          animationDelay: (i*0.06)+'s',
          opacity:.85,
        }}/>
      );
    }
    return (
      <div style={{
        position:'absolute', left:0, right:0, bottom:18,
        display:'flex', justifyContent:'center', alignItems:'flex-end', gap:4,
      }}>
        {bars}
        <style>{`
          @keyframes lcdvb-0 { 0%,100%{height:8px} 50%{height:24px} }
          @keyframes lcdvb-1 { 0%,100%{height:14px} 50%{height:30px} }
          @keyframes lcdvb-2 { 0%,100%{height:6px} 50%{height:36px} }
          @keyframes lcdvb-3 { 0%,100%{height:18px} 50%{height:28px} }
          @keyframes lcdvb-4 { 0%,100%{height:10px} 50%{height:22px} }
        `}</style>
      </div>
    );
  }

  // What the robot is saying — quoted line on the side, NOT on the LCD.
  function VoiceLine({ who, line, color }){
    return (
      <div style={{
        background:'#fff', borderRadius:14, padding:'12px 16px', display:'flex', gap:12, alignItems:'flex-start',
        boxShadow:'0 0 0 1px '+C.paperEdge,
      }}>
        <div style={{ width:32, height:32, flex:'0 0 auto', borderRadius:16, background:color, color:'#fff',
          display:'grid', placeItems:'center', fontFamily:'var(--display)', fontWeight:800, fontSize:13 }}>
          {who==='Robot' ? 'R' : 'C'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'ui-monospace, Menlo, monospace', fontSize:10.5, color:C.inkMuted, letterSpacing:.6, textTransform:'uppercase' }}>
            {who} says
          </div>
          <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:20, color:C.ink, marginTop:2 }}>
            {line}
          </div>
        </div>
      </div>
    );
  }

  // Each lesson step is a "card": step badge, LCD stage, what the robot says,
  // and animation/timing notes.
  function StepCard({ n, total, accent, title, subtitle, lcd, voice, notes, timing }){
    return (
      <div style={{
        background: C.paper, borderRadius: 24, padding: 26,
        boxShadow:'0 0 0 1px '+C.paperEdge+', 0 8px 24px rgba(40,30,20,.04)',
        display:'grid', gridTemplateColumns:'minmax(420px, 460px) 1fr', gap:32, alignItems:'flex-start',
      }}>
        {/* LCD column */}
        <div>
          <StepBadge n={n} total={total} color={accent}/>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:C.ink, lineHeight:1.05, marginTop:10, letterSpacing:-.4 }}>
            {title}
          </div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14.5, color:C.inkSoft, marginTop:6, lineHeight:1.5 }}>
            {subtitle}
          </div>
          <div style={{ marginTop:18 }}>
            {lcd}
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap:10, marginTop:12,
            fontFamily:'ui-monospace, Menlo, monospace', fontSize:11, color:C.inkMuted,
          }}>
            <Dot color={accent} size={6}/> {timing}
          </div>
        </div>
        {/* notes column */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, paddingTop:6 }}>
          {voice}
          {notes.map((nt,i)=>(
            <div key={i} style={{
              background: C.cream, borderRadius:14, padding:'12px 16px',
              fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, lineHeight:1.55,
            }}>
              <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:C.ink, textTransform:'uppercase', letterSpacing:.6, marginBottom:4 }}>
                {nt.label}
              </div>
              <div>{nt.body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── filmstrip strip: small LCD frames in a row, like a sequence shot ──
  function Filmstrip(){
    const frames = [
      { e:'idle',         l:'Ready' },
      { e:'speak',        l:'"Apple."' },
      { e:'listen',       l:'Listening' },
      { e:'child_speak',  l:'Child speaks' },
      { e:'think',        l:'Thinking' },
      { e:'success',      l:'Got it!' },
      { e:'gentle',       l:'(if missed)' },
      { e:'try_again',    l:'Try again' },
      { e:'celebrate',    l:'Activity done' },
    ];
    return (
      <div style={{
        background:'#1A1A1F', borderRadius:24, padding:22,
        display:'flex', overflowX:'auto', gap:14, alignItems:'center',
        boxShadow:'0 8px 30px rgba(0,0,0,.18)',
      }}>
        {frames.map((f,i)=>(
          <React.Fragment key={i}>
            <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center', flex:'0 0 auto' }}>
              <div style={{ width:160, height:120, borderRadius:10, overflow:'hidden', boxShadow:'0 0 0 4px #2c2c33' }}>
                <LCDFace emotion={f.e} size={160}/>
              </div>
              <div style={{ fontFamily:'ui-monospace, Menlo, monospace', fontSize:11, color:'rgba(255,255,255,.7)', letterSpacing:.5 }}>
                {String(i+1).padStart(2,'0')} · {f.l}
              </div>
            </div>
            {i<frames.length-1 && (
              <svg width="20" height="14" viewBox="0 0 20 14" style={{ flex:'0 0 auto' }}>
                <path d="M2 7 H14 M10 2 L16 7 L10 12" stroke="rgba(255,255,255,.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // ── App-vs-LCD comparison ──
  function AppVsLCD(){
    return (
      <div style={{
        background: 'linear-gradient(160deg, #FFE6CC 0%, #FFF5E6 60%, #F4E2C9 100%)',
        borderRadius:28, padding:'28px 32px',
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, alignItems:'stretch',
        boxShadow:'0 8px 30px rgba(120,80,40,.06)',
      }}>
        <div style={{ background: C.paper, borderRadius:20, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge }}>
          <Pill bg={C.sky} fg="#fff">PARENT'S PHONE</Pill>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:24, color:C.ink, marginTop:10 }}>App shows the lesson</div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginTop:6, lineHeight:1.5, marginBottom:16 }}>
            Lesson title, target word, progress dots, pause/end. Parent can monitor without interrupting.
          </div>
          {/* mock app screen */}
          <div style={{ width:240, height:380, margin:'0 auto', borderRadius:24, background:C.cream, padding:'46px 18px 22px', position:'relative', boxShadow:'0 6px 16px rgba(0,0,0,.06)' }}>
            <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', width:60, height:5, borderRadius:3, background:'rgba(0,0,0,.15)' }}/>
            <div style={{ fontFamily:'ui-monospace, Menlo', fontSize:10, color:C.inkMuted, letterSpacing:.6 }}>LESSON 3 · WORDS</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:22, color:C.ink, marginTop:4 }}>I like apples</div>
            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              {[1,1,1,0,0,0].map((d,i)=><div key={i} style={{ flex:1, height:6, borderRadius:3, background: d? C.coral:'rgba(0,0,0,.08)' }}/>)}
            </div>
            <div style={{ marginTop:24, padding:'18px 16px', background:'#fff', borderRadius:14 }}>
              <div style={{ fontFamily:'ui-monospace, Menlo', fontSize:10, color:C.inkMuted }}>NOW PRACTICING</div>
              <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:C.coral, marginTop:4 }}>Apple</div>
              <div style={{ fontFamily:'var(--body)', fontSize:13, color:C.inkSoft, marginTop:4 }}>Robot is teaching this word now</div>
            </div>
            <div style={{ marginTop:14, display:'flex', gap:10 }}>
              <div style={{ flex:1, padding:'10px 0', textAlign:'center', borderRadius:12, background:'rgba(0,0,0,.06)', fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:C.ink }}>Pause</div>
              <div style={{ flex:1, padding:'10px 0', textAlign:'center', borderRadius:12, background:C.coral, color:'#fff', fontFamily:'var(--body)', fontWeight:700, fontSize:13 }}>End</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.paper, borderRadius:20, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge, display:'flex', flexDirection:'column' }}>
          <Pill bg={C.coral} fg="#fff">CHILD'S ROBOT</Pill>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:24, color:C.ink, marginTop:10 }}>LCD shows the moment</div>
          <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginTop:6, lineHeight:1.5, marginBottom:16 }}>
            Just the face. Idle, listening, thinking, smiling. No menus. No words to read. No way to "lose".
          </div>
          <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center' }}>
            <RobotDevice emotion="speak" size={240}/>
          </div>
        </div>
      </div>
    );
  }

  // ── lesson recipe ──
  function LessonRecipe(){
    const items = [
      ['Each turn ≈ 5–8s',          'From "Robot speaks" → "Got it" / "Try again", a single attempt is 5–8 seconds.'],
      ['Listening window: 4s',      'Mic opens after Robot finishes speaking. Closes when child stops or after 4s of silence.'],
      ['Think window: 0.4–1.2s',    'Always at least 400ms even when answer arrives instantly — feels less robotic.'],
      ['Max retries: 2',            'After 2 misses, Robot helps with a softer, slower "let\'s try together" prompt — never a 3rd cold try.'],
      ['No grading on the LCD',     'Stars / progress live in the parent app. The child only ever sees a happy face or a "try again" face.'],
      ['Activity ends warmly',      'Whether nailed or struggled, the Robot ends every activity with a calm celebration.'],
    ];
    return (
      <div style={{ background:C.paper, borderRadius:24, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:24, color:C.ink, marginBottom:6 }}>How a lesson is paced</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginBottom:14 }}>The rhythm a child experiences for one target word.</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {items.map(([k,v])=>(
            <div key={k} style={{ background:C.cream, padding:'12px 14px', borderRadius:12 }}>
              <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:C.ink }}>{k}</div>
              <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:12.5, color:C.inkSoft, marginTop:3, lineHeight:1.5 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── the page ──
  function LCDLessonPage(){
    const total = 8;
    return (
      <div style={{
        minHeight:'100vh', background:C.page,
        fontFamily:'var(--body)', color:C.ink,
        padding:'48px 56px 96px',
      }}>
        {/* page header */}
        <div style={{ marginBottom: 28, maxWidth: 920 }}>
          <Pill bg={C.coral} fg="#fff">LESSON FLOW · CASE STUDY</Pill>
          <h1 style={{
            fontFamily:'var(--display)', fontWeight:800, fontSize:60, lineHeight:1.02,
            color:C.ink, margin:'14px 0 8px', letterSpacing:-1,
          }}>"I like apples."</h1>
          <p style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:18, color:C.inkSoft, lineHeight:1.5, maxWidth:760 }}>
            One real teaching turn, frame-by-frame on the Robot's 3.2-inch LCD. Every state below is what the child actually sees while learning the target word <strong>apple</strong>. The screen never becomes a menu.
          </p>
        </div>

        {/* App vs LCD framing */}
        <AppVsLCD/>

        {/* filmstrip preview */}
        <div style={{ marginTop:30 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:10 }}>
            <Dot color={C.coral}/>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:22, color:C.ink }}>The whole turn at a glance</div>
            <span style={{ fontFamily:'ui-monospace, Menlo', fontSize:12, color:C.inkMuted }}>scroll →</span>
          </div>
          <Filmstrip/>
        </div>

        {/* the 8 step cards */}
        <div style={{ marginTop:42, display:'flex', flexDirection:'column', gap:18 }}>
          {/* 1 — Robot Ready */}
          <StepCard
            n={1} total={total} accent={C.sky}
            title="Robot Ready"
            subtitle="Lesson is queued from the parent's app. The Robot sits in idle and waits for the child to look up."
            lcd={<LCDStage emotion="idle" w={420}/>}
            timing="t = 0.0s · holds until child engagement detected (or up to 6s)"
            voice={<VoiceLine who="Robot" line={'"Hi! Ready for our word today?"'} color={C.coral}/>}
            notes={[
              { label:'Animation', body:'Slow gentle bob (3.5s). Soft cheek glow on. Smile holds. Eyes blink every ~4s.' },
              { label:'Why this works', body:'No urgency. The child hasn\'t failed anything yet. Robot is just there, patient.' },
            ]}
          />

          {/* 2 — Robot Says Target Word */}
          <StepCard
            n={2} total={total} accent={C.coral}
            title="Robot Says The Word"
            subtitle={'The teaching beat. Mouth animates as a simple waveform; the Robot pronounces "Apple" once, slowly.'}
            lcd={
              <LCDStage emotion="speak" w={420}
                bottomCue={
                  <div style={{ position:'absolute', left:0, right:0, bottom:14, textAlign:'center' }}>
                    <span style={{
                      display:'inline-block', padding:'6px 18px', borderRadius:999,
                      background:'rgba(255,214,110,.18)', color:'#FFD66E',
                      fontFamily:'var(--display)', fontWeight:800, fontSize:24, letterSpacing:1.2,
                    }}>APPLE</span>
                  </div>
                }
              />
            }
            timing="t = 0.0–1.2s · TTS plays once. No repeat unless requested."
            voice={<VoiceLine who="Robot" line={'"Apple."'} color={C.coral}/>}
            notes={[
              { label:'Animation', body:'Mouth opens to "O", small vertical bob in sync with TTS. Yellow ring breathes (Robot is the active speaker).' },
              { label:'Optional caption', body:'Single bold word "APPLE" appears as a low-emphasis chip below the mouth. Never a sentence — readable from 1.5m only.' },
            ]}
          />

          {/* 3 — Robot Invites Child */}
          <StepCard
            n={3} total={total} accent={C.coral}
            title="Robot Invites Child"
            subtitle="Mic opens. The coral ring appears around the panel: a clear visual signal that the Robot is now listening."
            lcd={<LCDStage emotion="listen" w={420}/>}
            timing="t = 1.2–5.2s · 4-second listening window"
            voice={<VoiceLine who="Robot" line={'"Now you try!"'} color={C.coral}/>}
            notes={[
              { label:'Animation', body:'Coral ring breathes (1.6s). Mouth becomes a small attentive "o". Eyes hold gaze. Slight 2° tilt.' },
              { label:'No text', body:'No transcript, no countdown, no "Speak now" label. The ring is the affordance.' },
            ]}
          />

          {/* 4 — Child Speaks */}
          <StepCard
            n={4} total={total} accent={C.mint}
            title="Child Speaks"
            subtitle="Voice activity detected. The ring jumps to mint; ear bars at the bottom react to the child's volume in real time."
            lcd={
              <LCDStage emotion="child_speak" w={420}
                bottomCue={<VoiceBars color={C.mint}/>}
              />
            }
            timing="t = 2.0–4.0s (typical) · ends when child stops"
            voice={<VoiceLine who="Child" line={'"…apple!"'} color={C.mint}/>}
            notes={[
              { label:'Animation', body:'Eyes widen slightly (interest). Ring stays mint. Bottom bars track audio — bright but non-judgmental, like "I hear you".' },
              { label:'No correction yet', body:'The Robot does NOT react to right/wrong here. That happens after the think state — important for kids who are mid-word.' },
            ]}
          />

          {/* 5 — Robot Thinks */}
          <StepCard
            n={5} total={total} accent={C.plum}
            title="Robot Thinks"
            subtitle="A short, deliberate pause that absorbs voice-recognition latency. Eyes look up; three soft dots appear."
            lcd={<LCDStage emotion="think" w={420}/>}
            timing="t = 0.4–1.2s · always at least 400ms, even on instant matches"
            voice={<VoiceLine who="Robot" line={'(soft hum)'} color={C.plum}/>}
            notes={[
              { label:'Animation', body:'Eyes drift up. Mouth flattens to a calm line. Tiny "..." dots fade in top-right. Slow tilt.' },
              { label:'Why a min duration', body:'Without it, an instant "yes" feels mechanical. The pause makes the Robot feel like it\'s actually listening to the answer.' },
            ]}
          />

          {/* 6a — Success path */}
          <StepCard
            n={6} total={total} accent={C.mint}
            title="Child Did Well — Success"
            subtitle="The happy path. Big smile, cheek glow, sparkles drift up. Lasts about 1 second, then back to listen for the next prompt."
            lcd={<LCDStage emotion="success" w={420}/>}
            timing="t = 0.0–1.0s · success cue, no streaks or stars in the LCD"
            voice={<VoiceLine who="Robot" line={'"Yes! Apple. "'} color={C.mint}/>}
            notes={[
              { label:'Animation', body:'Happy-arc eyes. Big mouth. Mint glow ring (steady, not pulsing). 3-5 sparkles drift up over 1.0s and fade.' },
              { label:'Calm, not loud', body:'No confetti rain at this scale — confetti is reserved for activity-complete and end-of-lesson celebrations.' },
            ]}
          />

          {/* 7 — Retry path */}
          <StepCard
            n={7} total={total} accent={C.sun}
            title="Child Needs Retry"
            subtitle={'Two-frame sequence: a gentle correction beat (~700ms) flows directly into a "try again" beat with a small loop arrow.'}
            lcd={
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                  <div style={{ width:200, height:150, borderRadius:12, overflow:'hidden', boxShadow:'0 0 0 5px #1A1A1F', background:C.lcdBg }}>
                    <LCDFace emotion="gentle" size={200}/>
                  </div>
                  <svg width="20" height="14" viewBox="0 0 20 14" style={{ flex:'0 0 auto' }}>
                    <path d="M2 7 H14 M10 2 L16 7 L10 12" stroke={C.inkMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <div style={{ width:200, height:150, borderRadius:12, overflow:'hidden', boxShadow:'0 0 0 5px #1A1A1F', background:C.lcdBg }}>
                    <LCDFace emotion="try_again" size={200}/>
                  </div>
                </div>
                <div style={{ display:'flex', gap:14, fontFamily:'ui-monospace, Menlo', fontSize:11, color:C.inkMuted }}>
                  <div style={{ width:200, textAlign:'center' }}>Gentle (700ms)</div>
                  <div style={{ width:20 }}/>
                  <div style={{ width:200, textAlign:'center' }}>Try again (1.0s)</div>
                </div>
              </div>
            }
            timing="t = 0.0–1.7s · then re-enters Listening"
            voice={<VoiceLine who="Robot" line={'"Almost — let\'s try together: ah-pul."'} color={C.sun}/>}
            notes={[
              { label:'Animation', body:'Frame 1: eyes softly closed (almost a wink), small soft smile, no glow. Frame 2: encouraging open eyes, tiny loop arrow above the head, gentle bob.' },
              { label:'Never punitive', body:'No red, no X, no frown. Tone is "we\'re doing this together". After 2 retries, the Robot moves on — never a 3rd cold try.' },
            ]}
          />

          {/* 8 — Activity Complete */}
          <StepCard
            n={8} total={total} accent={C.coral}
            title="Activity Complete"
            subtitle="End of the activity (this word, all attempts). A warm celebration — confetti, big mouth, accent glow — short and contained."
            lcd={<LCDStage emotion="celebrate" w={420}/>}
            timing="t = 0.0–2.0s · then transitions to next activity or back to idle"
            voice={<VoiceLine who="Robot" line={'"Great job! "'} color={C.coral}/>}
            notes={[
              { label:'Animation', body:'Strong bob with rotation. Confetti (8 pieces, 1.6s loop, fade after first cycle). Coral glow ring. Eyes happy.' },
              { label:'Calm celebration', body:'No "SCORE: 80%". No fanfare sounds. The child just feels good for ~2 seconds, then we move on. Stars/progress live in the parent\'s app.' },
            ]}
          />
        </div>

        {/* recipe & boundaries */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginTop:42 }}>
          <LessonRecipe/>
          <div style={{ background:C.paper, borderRadius:24, padding:24, boxShadow:'0 0 0 1px '+C.paperEdge }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:24, color:C.ink, marginBottom:6 }}>What the LCD never becomes</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:C.inkSoft, marginBottom:14 }}>The screen is the Robot's face, not a course menu.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                'A list of lessons — that\'s the parent app',
                'A score, percentage, or letter grade — never',
                'A transcript of what the child said — privacy + tone',
                'A "next" / "skip" button — Robot drives, child speaks',
                'A red error, alarm, or ❌ — calm states only',
                'Paragraphs of text — at most one bold word, briefly',
              ].map((s,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px', background:C.cream, borderRadius:10 }}>
                  <div style={{ flex:'0 0 auto', width:18, height:18, borderRadius:9, background:'#fff', display:'grid', placeItems:'center' }}>
                    <svg width="9" height="9" viewBox="0 0 9 9"><path d="M2 2 L7 7 M7 2 L2 7" stroke={C.coral} strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:13.5, color:C.ink, lineHeight:1.45 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{
          marginTop:60, padding:'28px 36px',
          background:C.ink, color:'#fff',
          borderRadius:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:18,
        }}>
          <div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, marginBottom:4 }}>One word. Eight emotional beats.</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:500, fontSize:14, color:'rgba(255,255,255,.7)', maxWidth:560 }}>
              The same beat structure repeats for every target word, every activity, every lesson. Familiar, predictable, safe.
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Pill bg="rgba(255,255,255,.12)" fg="#fff">~6s per turn</Pill>
            <Pill bg="rgba(255,255,255,.12)" fg="#fff">8 LCD states used</Pill>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { LCDLessonPage });
})();
