// Paths — guided tours through the prototype.
// Each step references an existing screen id from the global ALL_SCREEN_MAP.
// Renders the screen inside an iOS frame with a step rail + role chips
// (parent / child / Robot) so the audience always knows whose POV they're in.

const PATH_DEFS = [
  {
    id: 'A',
    title: 'Path A · Buy and activate Robot',
    summary: "Parent buys the Robot, it ships, they pair it, and the child meets it for the first time.",
    steps: [
      { id:'pr_intro',          role:'parent', label:'Product Intro',         caption:'Parent learns the Robot is a physical buddy. App is the dashboard.' },
      { id:'pr_bundle',         role:'parent', label:'Robot Bundle',          caption:'Choose Robot only or Robot + courses bundle.' },
      { id:'pr_checkout',       role:'parent', label:'Checkout Entry',        caption:'Calm checkout — order summary, shipping, Apple Pay.' },
      { id:'pr_confirm',        role:'parent', label:'Order Confirmation',    caption:'Robot is on its way. Child never sees prices.' },
      { id:'pr_arrived',        role:'parent', label:'Robot Arrived · Setup', caption:'CTA to begin pairing the physical Robot.' },
      { id:'dv_pair_add',       role:'parent', label:'Add Robot Device',      caption:'App scans for the new Robot.' },
      { id:'dv_pair_code',      role:'both',   label:'Pairing · Code',        caption:'Code shown on Robot LCD; parent confirms in app.' },
      { id:'dv_pair_wifi',      role:'parent', label:'Wi-Fi Setup',           caption:'Parent gives Robot the home Wi-Fi.' },
      { id:'dv_pair_success',   role:'parent', label:'Robot Connected',       caption:'Robot is online and ready.' },
      { id:'dv_pair_first_lesson', role:'child', label:'First Lesson Entry',  caption:'Hand the phone to your child — Robot greets them.' },
    ],
  },
  {
    id: 'B',
    title: 'Path B · Parent sends a lesson to Robot',
    summary: "Daily flow: parent picks today's lesson; Robot is prepared; child takes over.",
    steps: [
      { id:'home_hub_idle',  role:'parent', label:'Parent Home',         caption:'Quiet home dashboard with today\'s suggestion.' },
      { id:'cl_library',     role:'parent', label:'Course Library',      caption:'All installed courses; pick one to send.' },
      { id:'cl_detail',      role:'parent', label:'Course Detail',       caption:'See what Robot will teach today.' },
      { id:'cl_added',       role:'parent', label:'Add Course to Robot', caption:'Course is loaded onto the physical Robot.' },
      { id:'cl_send',        role:'parent', label:"Send Today's Lesson", caption:'Pick the day\'s 8-minute lesson and send.' },
      { id:'cl_robot_ready', role:'both',   label:'Robot Ready',         caption:'Battery, Wi-Fi, volume preflight on Robot.' },
      { id:'greeting',       role:'child',  label:'Child Starts Lesson', caption:'Child says hi to Robot. Phone steps aside.' },
    ],
  },
  {
    id: 'C',
    title: 'Path C · Child lesson with the physical Robot',
    summary: "The full conversational loop happens face-to-face with Robot. The LCD face is the emotional UI.",
    steps: [
      { id:'dv_lcd',           role:'robot', label:'Robot LCD · Idle Happy',      caption:'Robot waits with a soft idle face.' },
      { id:'robot_speaking',   role:'robot', label:'Robot Speaking',              caption:'Robot says the prompt out loud.' },
      { id:'robot_listening',  role:'robot', label:'Robot Listening',             caption:'Pulse rings + sound bars — Robot is hearing the child.' },
      { id:'user_speaking',    role:'child', label:'Child Speaking Detected',     caption:'Robot signals it caught the child\'s voice.' },
      { id:'thinking',         role:'robot', label:'Robot Thinking',              caption:'Brief consider beat — Robot is forming a reply.' },
      { id:'success',          role:'robot', label:'Success Face',                caption:'Warm celebration on the LCD; sticker earned.' },
      { id:'activity_done',    role:'robot', label:'Activity Complete Face',      caption:'Lesson chunk wraps up cleanly on Robot.' },
    ],
  },
  {
    id: 'D',
    title: 'Path D · Robot is offline',
    summary: "What happens when Robot can't reach Wi-Fi mid-send. Calm recovery, not an error wall.",
    steps: [
      { id:'cl_detail',         role:'parent', label:'Course Detail',     caption:'Parent picks a lesson to send.' },
      { id:'cl_send',           role:'parent', label:'Send Lesson',       caption:'Tap to push lesson to Robot.' },
      { id:'cl_needs_sync',     role:'parent', label:'Robot Offline',     caption:'Friendly card: Robot can\'t be reached right now.' },
      { id:'rm_offline_help',   role:'parent', label:'Reconnect Robot',   caption:'Five plain-language steps to bring Robot back.' },
      { id:'dv_pair_connecting',role:'both',   label:'Sync Complete',     caption:'Robot reconnects, lesson syncs across.' },
      { id:'cl_robot_ready',    role:'both',   label:'Robot Ready',       caption:'Back to the daily flow — Robot is set.' },
    ],
  },
  {
    id: 'E',
    title: 'Path E · Course purchase',
    summary: "Locked content stays gated behind the parent. Children never see prices.",
    steps: [
      { id:'cl_library',        role:'parent', label:'Course Library',     caption:'Parent browses installed + locked courses.' },
      { id:'cl_locked',         role:'parent', label:'Locked Course',      caption:'Locked card with a calm padlock — never red.' },
      { id:'parent_gate',       role:'parent', label:'Parent Gate',        caption:'Type-the-number speed bump confirms an adult.' },
      { id:'cl_detail',         role:'parent', label:'Course Detail',      caption:'Full course preview, price visible to parent only.' },
      { id:'cl_buy',            role:'parent', label:'Buy / Unlock',       caption:'Plan picker — one course or library subscription.' },
      { id:'cl_unlock_confirm', role:'parent', label:'Unlock Confirmation',caption:'Numeric confirmation before payment.' },
      { id:'cl_added',          role:'parent', label:'Course Added',       caption:'Course is now on Robot.' },
      { id:'cl_send',           role:'parent', label:'Send Lesson',        caption:'Send the first lesson of the new course.' },
    ],
  },
  {
    id: 'F',
    title: 'Path F · Device management',
    summary: "Calm parent-facing admin: check on Robot, update firmware, confirm everything is fine.",
    steps: [
      { id:'parent_settings', role:'parent', label:'Parent Settings',   caption:'Settings entry — adult chrome, neutral tone.' },
      { id:'rm_my_robot',    role:'parent', label:'My Robot',          caption:'Live status hero + status grid.' },
      { id:'rm_battery',     role:'parent', label:'Battery',           caption:'78% · charging · battery health tips.' },
      { id:'rm_wifi',        role:'parent', label:'Wi-Fi',             caption:'Signal, IP, switch network.' },
      { id:'rm_storage',     role:'parent', label:'Course Sync',       caption:'Storage gauge, courses on Robot, sync now.' },
      { id:'rm_firmware',    role:'parent', label:'Firmware Update',   caption:'"Small update" framing — child progress is kept.' },
      { id:'rm_my_robot',    role:'parent', label:'Update Success',    caption:'Back to My Robot — all green.' },
    ],
  },
];

const ROLE_META = {
  parent: { label:'Parent · App',     bg:'#E8F0FE', fg:'#2A6FDB', icon:'📱' },
  child:  { label:'Child · with Robot',bg:'#FFE9E2', fg:'#C0492B', icon:'🧒' },
  robot:  { label:'Robot · LCD face',  bg:'#0E1116', fg:'#FFD66E', icon:'🤖' },
  both:   { label:'Parent & Robot',    bg:'#EFEAFB', fg:'#5C4F77', icon:'🤝' },
};

function PathsView({ tweaks }){
  const [pathIdx, setPathIdx] = React.useState(0);
  const [stepIdx, setStepIdx] = React.useState(0);
  const path = PATH_DEFS[pathIdx];
  const step = path.steps[stepIdx];
  const role = ROLE_META[step.role];
  const robotProps = { color: tweaks.robotColor, accent: tweaks.accent };
  const Comp = window.ALL_SCREEN_MAP[step.id];

  const setPath = (i) => { setPathIdx(i); setStepIdx(0); };
  const next = () => setStepIdx(i => Math.min(path.steps.length - 1, i + 1));
  const prev = () => setStepIdx(i => Math.max(0, i - 1));

  React.useEffect(()=>{
    const k = (e)=>{
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', k);
    return ()=>window.removeEventListener('keydown', k);
  });

  return (
    <div data-persona="parent" style={{
      minHeight:'100vh', background:'linear-gradient(180deg,#fff5e6 0%,#f3e9d8 60%,#e8dec9 100%)',
      display:'flex', flexDirection:'row', fontFamily:'var(--body)',
    }}>
      {/* Left rail — path picker */}
      <div style={{
        width:280, flexShrink:0, padding:'80px 20px 30px', borderRight:'1px solid rgba(0,0,0,.06)',
        background:'rgba(255,255,255,.5)', backdropFilter:'blur(8px)',
        display:'flex', flexDirection:'column', gap:10, overflowY:'auto', maxHeight:'100vh',
      }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:13, color:'#5C4F77', textTransform:'uppercase', letterSpacing:1.5, padding:'4px 8px 12px' }}>Prototype Paths</div>
        {PATH_DEFS.map((p, i)=>{
          const sel = i === pathIdx;
          return (
            <button key={p.id} onClick={()=>setPath(i)} style={{
              border: sel? '2px solid var(--coral)' : '1px solid rgba(0,0,0,.08)',
              background: sel? '#fff' : 'rgba(255,255,255,.5)',
              borderRadius:12, padding:'12px 14px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
              display:'flex', flexDirection:'column', gap:4,
            }}>
              <div style={{ fontSize:11, fontWeight:800, color: sel? 'var(--coral)':'#8B7E94', letterSpacing:1, textTransform:'uppercase' }}>Path {p.id}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#2B2140', lineHeight:1.3 }}>{p.title.replace(`Path ${p.id} · `,'')}</div>
              <div style={{ fontSize:11, color:'#6B6076', marginTop:2 }}>{p.steps.length} steps</div>
            </button>
          );
        })}

        <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(255,255,255,.6)', borderRadius:12, fontSize:11, color:'#6B6076', lineHeight:1.5 }}>
          <b style={{ color:'#2B2140' }}>Tip:</b> use ← / → to walk a path.
        </div>
      </div>

      {/* Center — phone */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px 30px', position:'relative' }}>
        {/* Header */}
        <div style={{ width:'100%', maxWidth:720, marginBottom:18, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'var(--coral)', letterSpacing:1.5, textTransform:'uppercase' }}>Path {path.id}</div>
          <div style={{ fontFamily:'var(--display)', fontSize:24, fontWeight:700, color:'#2B2140', letterSpacing:-0.4, marginTop:4, lineHeight:1.2 }}>{path.title.replace(`Path ${path.id} · `,'')}</div>
          <div style={{ fontSize:13, color:'#6B6076', marginTop:6, maxWidth:540, margin:'6px auto 0', lineHeight:1.5 }}>{path.summary}</div>
        </div>

        {/* Phone + role chip */}
        <div style={{ position:'relative' }}>
          <div data-screen-label={`Path ${path.id} · ${stepIdx+1} ${step.label}`}>
            <IOSDevice width={390} height={844} dark={false}>
              <Comp go={()=>{}} robotProps={robotProps}/>
            </IOSDevice>
          </div>
          {/* Role chip floating top-right of phone */}
          <div style={{
            position:'absolute', top:-12, right:-160, width:150,
            background: role.bg, color: role.fg, padding:'10px 12px', borderRadius:12,
            boxShadow:'0 4px 14px rgba(0,0,0,.08)', fontSize:11, fontWeight:700,
          }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{role.icon}</div>
            <div style={{ textTransform:'uppercase', letterSpacing:1, opacity:.7, fontSize:10 }}>POV</div>
            <div style={{ fontSize:13, fontWeight:800, marginTop:2, lineHeight:1.2 }}>{role.label}</div>
          </div>
        </div>

        {/* Step caption */}
        <div style={{ marginTop:22, maxWidth:520, textAlign:'center' }}>
          <div style={{ fontSize:13, color:'#8B7E94', fontWeight:700, letterSpacing:0.6, textTransform:'uppercase' }}>Step {stepIdx+1} of {path.steps.length}</div>
          <div style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:700, color:'#2B2140', marginTop:4, letterSpacing:-0.2 }}>{step.label}</div>
          <div style={{ fontSize:14, color:'#5A4F66', marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>{step.caption}</div>
        </div>

        {/* Nav controls */}
        <div style={{ marginTop:20, display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={prev} disabled={stepIdx===0} style={{
            background:'#fff', border:'1px solid rgba(0,0,0,.08)', borderRadius:999,
            width:44, height:44, fontSize:20, cursor: stepIdx===0?'not-allowed':'pointer',
            opacity: stepIdx===0?0.4:1, fontFamily:'inherit', color:'#2B2140',
          }}>‹</button>
          <button onClick={next} disabled={stepIdx===path.steps.length-1} style={{
            background:'var(--coral)', color:'#fff', border:'none', borderRadius:999,
            padding:'12px 20px', fontWeight:700, fontSize:14, cursor: stepIdx===path.steps.length-1?'not-allowed':'pointer',
            opacity: stepIdx===path.steps.length-1?0.5:1, fontFamily:'inherit',
          }}>{stepIdx===path.steps.length-1 ? 'Path complete' : 'Next step →'}</button>
          <button onClick={next} disabled={stepIdx===path.steps.length-1} style={{
            background:'#fff', border:'1px solid rgba(0,0,0,.08)', borderRadius:999,
            width:44, height:44, fontSize:20, cursor: stepIdx===path.steps.length-1?'not-allowed':'pointer',
            opacity: stepIdx===path.steps.length-1?0.4:1, fontFamily:'inherit', color:'#2B2140',
          }}>›</button>
        </div>
      </div>

      {/* Right rail — step list */}
      <div style={{
        width:280, flexShrink:0, padding:'80px 20px 30px', borderLeft:'1px solid rgba(0,0,0,.06)',
        background:'rgba(255,255,255,.5)', backdropFilter:'blur(8px)',
        display:'flex', flexDirection:'column', gap:6, overflowY:'auto', maxHeight:'100vh',
      }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:13, color:'#5C4F77', textTransform:'uppercase', letterSpacing:1.5, padding:'4px 8px 12px' }}>Steps</div>
        {path.steps.map((s, i)=>{
          const sel = i === stepIdx;
          const r = ROLE_META[s.role];
          return (
            <button key={i} onClick={()=>setStepIdx(i)} style={{
              border:'none', background: sel? 'var(--coral)' : 'transparent',
              color: sel? '#fff' : '#2B2140',
              padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'left',
              fontFamily:'inherit', display:'flex', gap:10, alignItems:'flex-start',
            }}>
              <div style={{
                width:22, height:22, borderRadius:11, flexShrink:0, marginTop:1,
                background: sel? 'rgba(255,255,255,.25)' : r.bg,
                color: sel? '#fff' : r.fg,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
              }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, lineHeight:1.3 }}>{s.label}</div>
                <div style={{ fontSize:10, marginTop:2, opacity: sel? 0.85 : 0.6, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{r.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.PathsView = PathsView;
