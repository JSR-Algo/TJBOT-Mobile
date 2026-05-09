// Course Library — 12 parent-facing frames for managing Robot courses.
// Parent-only (calm neutral chrome). Child never sees prices.
// Reuses DV tokens / DvShell / DvBigBtn / DvRow from device.jsx, RobotDevice, LCDFace.

const CL = {
  bg:'#F5F5F2', card:'#FFFFFF', ink:'#1A1A1F', ink2:'#5A5A66', ink3:'#8B8B96',
  hair:'rgba(0,0,0,0.07)', accent:'#2A6FDB', good:'#1F8A5B', warn:'#C99227', mint:'#E6F4EE',
};

// Course catalog — single source of truth used across all 12 screens
const COURSES = [
  { id:'c_hello',   title:'Hello Friends',     level:'Just starting',     ages:'4–6',
    teaches:['Greetings','Names','Family','Feelings'], lessons:24, weeks:6,
    state:'installed', completion:0.4, lcd:'happy',
    blurb:'A warm first course. Robot teaches everyday hellos and how to talk about people you love.' },
  { id:'c_animals', title:'My Animal Friends', level:'Just starting',     ages:'4–6',
    teaches:['Animals','Sounds','Colors','Counting 1–10'], lessons:30, weeks:7,
    state:'installed', completion:0.0, lcd:'idle',
    blurb:'Animals your child already loves, with simple sound games and color play.' },
  { id:'c_food',    title:'Yummy Words',       level:'Building up',       ages:'5–7',
    teaches:['Food','Asking politely','Likes & dislikes','Numbers 10–20'], lessons:28, weeks:7,
    state:'not_installed', completion:0, lcd:'speak',
    blurb:'Mealtime English — fruits, snacks, and gentle table phrases.' },
  { id:'c_outside', title:'Out & About',       level:'Building up',       ages:'5–7',
    teaches:['Weather','Clothes','Park & playground','Simple questions'], lessons:32, weeks:8,
    state:'locked', completion:0, lcd:'gentle',
    blurb:'Words for sunny days, rainy days, and what to wear.' },
  { id:'c_stories', title:'Story Time',        level:'Confident speaker', ages:'6–8',
    teaches:['Story words','Past tense','Feelings (deeper)','Retelling'], lessons:36, weeks:9,
    state:'locked', completion:0, lcd:'think',
    blurb:'Robot tells short stories your child can join in and retell.' },
];

// State chip — one of: installed, not_installed, locked, ready, completed, needs_sync
function CLChip({ state }){
  const map = {
    installed:    { bg:'#E6F4EE', fg:'#1F8A5B', dot:'#1F8A5B', label:'On Robot' },
    not_installed:{ bg:'#EEF1F5', fg:'#5A5A66', dot:'#8B8B96', label:'Not on Robot' },
    locked:       { bg:'#F2EEF6', fg:'#6E5A8A', dot:'#9B8FB8', label:'Locked' },
    ready:        { bg:'#FFF4D9', fg:'#8A6A12', dot:'#E8A33C', label:'Ready for today' },
    completed:    { bg:'#E6F4EE', fg:'#1F8A5B', dot:'#1F8A5B', label:'Completed' },
    needs_sync:   { bg:'#FFE9DC', fg:'#A04A1F', dot:'#D97757', label:'Needs sync' },
  };
  const s = map[state] || map.not_installed;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:s.bg, color:s.fg,
      fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:999, letterSpacing:0.2 }}>
      <span style={{ width:6, height:6, borderRadius:3, background:s.dot }}/>
      {s.label}
    </div>
  );
}

// Tiny LCD preview — reuses LCDFace component, fixed 88×66 frame
function LCDPreview({ emotion='idle', accent='#FF6F61', size=88, label }){
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ background:'#0E1116', borderRadius:8, padding:6, lineHeight:0,
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3)' }}>
        <LCDFace emotion={emotion} size={size} accent={accent}/>
      </div>
      {label && <div style={{ fontSize:9, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>}
    </div>
  );
}

// Course card — used in library and elsewhere. Compact + tappable.
function CourseCard({ course, onClick, accent, showLCD=true }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px',
      display:'flex', gap:12, alignItems:'flex-start', cursor:'pointer', textAlign:'left', width:'100%',
      opacity: course.state==='locked' ? 0.85 : 1,
    }}>
      {showLCD && (
        <div style={{ background:'#0E1116', borderRadius:10, padding:6, flexShrink:0,
          filter: course.state==='locked' ? 'grayscale(0.6)' : 'none' }}>
          <LCDFace emotion={course.lcd} size={72} accent={accent}/>
        </div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
          <CLChip state={course.state}/>
          <div style={{ fontSize:11, color:CL.ink3 }}>Ages {course.ages}</div>
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:CL.ink, lineHeight:1.25, textWrap:'pretty' }}>{course.title}</div>
        <div style={{ fontSize:12, color:CL.ink2, marginTop:2 }}>{course.level} · {course.lessons} lessons</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
          {course.teaches.slice(0,3).map(t=>(
            <span key={t} style={{ background:'#EEF1F5', color:CL.ink2, fontSize:10, fontWeight:600, padding:'3px 7px', borderRadius:6 }}>{t}</span>
          ))}
          {course.teaches.length>3 && <span style={{ fontSize:10, color:CL.ink3, padding:'3px 4px' }}>+{course.teaches.length-3}</span>}
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────
// 1 · Course Library — all available courses
// ──────────────────────────────────────────────────
function S_CL_Library({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const sections = [
    { title:'On your Robot now', items: COURSES.filter(c=>c.state==='installed') },
    { title:'Available to add',  items: COURSES.filter(c=>c.state==='not_installed') },
    { title:'For when ready',    items: COURSES.filter(c=>c.state==='locked'), help:"These are shaped for older kids. Robot will suggest them when your child is ready." },
  ];
  return (
    <DvShell title="Course Library" onBack={()=>go('dv_home')}>
      <div style={{ padding:'14px 20px 0', fontSize:13, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Pick what your Robot teaches. Lessons play <b style={{ color:CL.ink }}>on the Robot</b>, not the phone.
      </div>
      {sections.map((sec, si)=>(
        sec.items.length === 0 ? null : (
          <div key={si} style={{ padding:'18px 16px 0' }}>
            <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>{sec.title}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sec.items.map(c=> <CourseCard key={c.id} course={c} accent={accent} onClick={()=>go('cl_detail')}/> )}
            </div>
            {sec.help && <div style={{ fontSize:11, color:CL.ink3, padding:'8px 6px 0', lineHeight:1.5, textWrap:'pretty' }}>{sec.help}</div>}
          </div>
        )
      ))}
      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 2 · Course Detail
// ──────────────────────────────────────────────────
function S_CL_Detail({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[2]; // "Yummy Words" — not_installed (best for showing add CTA)
  return (
    <DvShell title="Course details" onBack={()=>go('cl_library')}>
      {/* Hero */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ background:'#0E1116', padding:'18px 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <LCDFace emotion={c.lcd} size={140} accent={accent}/>
          </div>
          <div style={{ padding:'14px 14px 16px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
              <CLChip state={c.state}/>
              <div style={{ fontSize:11, color:CL.ink3 }}>Ages {c.ages} · {c.level}</div>
            </div>
            <div style={{ fontSize:20, fontWeight:600, color:CL.ink, letterSpacing:-0.2 }}>{c.title}</div>
            <div style={{ fontSize:13, color:CL.ink2, marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>{c.blurb}</div>
          </div>
        </div>
      </div>

      {/* What Robot teaches */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>What Robot will teach</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {c.teaches.map((t, i, a)=>(
            <div key={t} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px',
              borderBottom: i<a.length-1? `1px solid ${CL.hair}`:'none' }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>
                {['🗣️','🎯','💛','🔢'][i % 4]}
              </div>
              <div style={{ fontSize:14, color:CL.ink }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding:'20px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[
          { v:c.lessons, l:'Lessons' },
          { v:`${c.weeks}w`, l:'Pace' },
          { v:'4 min', l:'Per day' },
        ].map(s=>(
          <div key={s.l} style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:CL.ink }}>{s.v}</div>
            <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* What it's NOT */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:'#F8F6F1', borderRadius:12, padding:'12px 14px', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          <b style={{ color:CL.ink }}>A note for parents.</b> This course is gentle daily play, not a test. We don't promise quick results — we focus on warm, repeated practice.
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_buy')}>Add to Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_library')}>Back to library</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 3 · Buy / Unlock Course (parent-gated)
// ──────────────────────────────────────────────────
function S_CL_Buy({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[2];
  const [plan, setPlan] = React.useState('library'); // 'library' | 'single'
  return (
    <DvShell title="Add Yummy Words" onBack={()=>go('cl_detail')}>
      <div style={{ padding:'14px 20px 0', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ background:'#FFF4D9', color:'#8A6A12', fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:999, display:'inline-flex', alignItems:'center', gap:6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
          For parents only
        </div>
      </div>

      {/* Course summary tile */}
      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'12px 12px', display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ background:'#0E1116', borderRadius:10, padding:6, flexShrink:0 }}>
            <LCDFace emotion={c.lcd} size={64} accent={accent}/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:CL.ink }}>{c.title}</div>
            <div style={{ fontSize:12, color:CL.ink2, marginTop:2 }}>{c.lessons} lessons · {c.weeks} weeks</div>
          </div>
        </div>
      </div>

      {/* Plan picker */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Choose a plan</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { id:'library', tag:'Best for families', title:'All Courses', body:'Every course, now and future, on your Robot.', price:'$8.99', period:'/ month', cancel:'Cancel anytime · 7-day free trial' },
            { id:'single', tag:'One-time', title:'Just this course', body:'Yummy Words only, yours forever.', price:'$24', period:'one-time', cancel:'No subscription' },
          ].map(p=>{
            const sel = plan===p.id;
            return (
              <button key={p.id} onClick={(e)=>{e.stopPropagation(); setPlan(p.id);}} style={{
                background: sel ? '#E8F0FE' : CL.card, border: sel ? `2px solid ${CL.accent}` : `1px solid ${CL.hair}`,
                borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:CL.accent, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{p.tag}</div>
                    <div style={{ fontSize:15, fontWeight:600, color:CL.ink }}>{p.title}</div>
                    <div style={{ fontSize:12, color:CL.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{p.body}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:CL.ink }}>{p.price}</div>
                    <div style={{ fontSize:11, color:CL.ink2 }}>{p.period}</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:CL.ink3, marginTop:8 }}>{p.cancel}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Promise */}
      <div style={{ padding:'18px 20px 0', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Your child <b style={{ color:CL.ink }}>never sees prices or buy buttons</b> — only courses you've added to Robot.
      </div>

      {/* CTA */}
      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_unlock_confirm')}>Confirm & continue</DvBigBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('cl_detail');}} style={{ background:'transparent', border:'none', fontSize:14, color:CL.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:8 }}>Not now</button>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 12 · Parent Unlock Confirmation (parent gate before buy/install)
// ──────────────────────────────────────────────────
function S_CL_UnlockConfirm({ go, tweaks }){
  const [vals, setVals] = React.useState(['','','','']);
  const target = ['7','3','5','1'];
  const filled = vals.every(Boolean);
  const ok = vals.join('') === target.join('');
  return (
    <DvShell title="Quick parent check" onBack={()=>go('cl_buy')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={CL.ink2} strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
        </div>
        <div style={{ fontSize:20, fontWeight:600, color:CL.ink, letterSpacing:-0.2, textAlign:'center' }}>Type the number below</div>
        <div style={{ fontSize:13, color:CL.ink2, marginTop:6, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          A small step so kids can't add courses by accident.
        </div>
      </div>

      <div style={{ padding:'24px 20px 0', textAlign:'center' }}>
        <div style={{ fontSize:42, fontWeight:700, color:CL.ink, letterSpacing:6, fontFamily:'ui-monospace, monospace' }}>{target.join(' ')}</div>
      </div>

      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          {vals.map((v, i)=>(
            <div key={i} style={{ width:54, height:64, borderRadius:12, background:CL.card,
              border: `2px solid ${ok ? CL.good : v ? CL.accent : CL.hair}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:CL.ink, fontFamily:'ui-monospace, monospace' }}>
              {v || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Mini keypad */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i)=>(
            <button key={i} disabled={!k} onClick={(e)=>{
              e.stopPropagation();
              setVals(prev=>{
                const next = [...prev];
                if (k === '⌫'){
                  for (let j=next.length-1;j>=0;j--) if (next[j]){ next[j]=''; break; }
                } else if (k){
                  const idx = next.findIndex(x=>!x);
                  if (idx>=0) next[idx]=k;
                }
                return next;
              });
            }} style={{
              height:54, borderRadius:12, border:`1px solid ${CL.hair}`,
              background: k? CL.card : 'transparent', color:CL.ink, fontSize:20, fontWeight:600,
              fontFamily:'inherit', cursor: k? 'pointer':'default', visibility: k? 'visible':'hidden',
            }}>{k}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>{ if (ok) go('cl_added'); }}>
          {ok ? 'Confirm purchase' : filled ? 'Try again' : 'Enter the number'}
        </DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 4 · Course Added to Robot
// ──────────────────────────────────────────────────
function S_CL_Added({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[2];
  return (
    <DvShell title="Added to Robot">
      <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="celebrate" size={180} accent={accent}/>
        <div style={{ marginTop:24, fontSize:24, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          {c.title} is on Robot
        </div>
        <div style={{ marginTop:8, fontSize:14, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Robot is downloading the lessons now. Your child will see a new course tomorrow morning.
        </div>
      </div>

      {/* Mini Robot LCD preview */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px',
          display:'flex', alignItems:'center', gap:14 }}>
          <LCDPreview emotion={c.lcd} accent={accent} size={72}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:CL.good, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>On Robot now</div>
            <div style={{ fontSize:14, fontWeight:600, color:CL.ink }}>Lesson 1 · Hello, food!</div>
            <div style={{ fontSize:12, color:CL.ink2, marginTop:2 }}>4 minutes · ready to play</div>
          </div>
        </div>
      </div>

      {/* Tomorrow tile */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📅" title="First lesson tomorrow" body="Robot will gently invite your child after breakfast" />
          <DvRow icon="🔁" title="Mix into current course" body="Robot will alternate between Hello Friends and Yummy Words" />
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_send')}>Send today's lesson now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Back to Robot home</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 5 · Send Lesson to Robot — parent picks today's lesson
// ──────────────────────────────────────────────────
function S_CL_Send({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [pick, setPick] = React.useState(0);
  const options = [
    { title:'Lesson 4 · Animals at home', body:'Continues where your child left off', tag:'Recommended', tagColor:'#1F8A5B', emo:'happy' },
    { title:'Review · 3 tricky words',     body:'Robot will sneak these in playfully',     tag:'Quick',       tagColor:'#E8A33C', emo:'gentle' },
    { title:'Lesson 1 · Hello, food!',     body:'Try the new course Yummy Words',          tag:'New course',  tagColor:'#2A6FDB', emo:'speak' },
  ];
  return (
    <DvShell title="Today's lesson" onBack={()=>go('dv_home')}>
      <div style={{ padding:'14px 20px 0', fontSize:13, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Pick what Robot plays today. We'll send it to the device — about 4 minutes when your child is ready.
      </div>

      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {options.map((o, i)=>{
          const sel = i===pick;
          return (
            <button key={i} onClick={(e)=>{e.stopPropagation(); setPick(i);}} style={{
              background: sel? '#E8F0FE' : CL.card, border: sel? `2px solid ${CL.accent}` : `1px solid ${CL.hair}`,
              borderRadius:14, padding:'12px 12px', display:'flex', gap:12, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
              <LCDPreview emotion={o.emo} accent={accent} size={64}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:700, color:o.tagColor, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{o.tag}</div>
                <div style={{ fontSize:14, fontWeight:600, color:CL.ink, lineHeight:1.25 }}>{o.title}</div>
                <div style={{ fontSize:12, color:CL.ink2, marginTop:2, lineHeight:1.4, textWrap:'pretty' }}>{o.body}</div>
              </div>
              <div style={{ width:22, height:22, borderRadius:11, border: sel? 'none' : `2px solid ${CL.hair}`,
                background: sel? CL.accent : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Schedule */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>When</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="⚡" title="Send now" body="Robot will be ready as soon as your child taps it"/>
          <DvRow icon="☀️" title="Tomorrow morning" body="Robot will wake up gently after 8:00 AM"/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>go('cl_robot_ready')}>Send to Robot</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 6 · Robot Ready for Today's Lesson
// ──────────────────────────────────────────────────
function S_CL_RobotReady({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot is ready">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="happy" size={200} accent={accent}/>
        <div style={{ marginTop:22 }}>
          <CLChip state="ready"/>
        </div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          Lesson 4 · Animals at home
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Place Robot on the table. When your child taps it, the lesson starts. About 4 minutes.
        </div>
      </div>

      {/* Pre-flight checklist */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            { ic:'🔋', t:'Battery', v:'78% · plenty', good:true },
            { ic:'📶', t:'Wi-Fi', v:'Casa-Familia · strong', good:true },
            { ic:'🔉', t:'Volume', v:'6 of 10 · room-friendly', good:true },
            { ic:'📚', t:'Lesson loaded', v:'Ready on Robot', good:true },
          ].map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px',
              borderBottom: i<a.length-1? `1px solid ${CL.hair}`:'none' }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>{r.ic}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:CL.ink2, marginTop:1 }}>{r.v}</div>
              </div>
              {r.good && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CL.good} strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_running')}>Hand it to your child</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_send')}>Pick a different lesson</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 7 · Lesson Running on Robot — small parent-side ack
// ──────────────────────────────────────────────────
function S_CL_Running({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Lesson is on Robot">
      <div style={{ padding:'36px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ position:'relative', width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {[0,0.6].map(d=>(
            <div key={d} style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:`2px solid ${accent}`, opacity:0.4, animation:`cl-pulse 2s ease-out ${d}s infinite` }}/>
          ))}
          <RobotDevice emotion="speak" size={170} accent={accent}/>
        </div>
        <div style={{ marginTop:14 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#FFF4D9', color:'#8A6A12',
            fontSize:11, fontWeight:700, padding:'5px 11px', borderRadius:999 }}>
            <span style={{ width:7, height:7, borderRadius:4, background:'#E8A33C', animation:'cl-blink 1s ease-in-out infinite' }}/>
            Lesson playing
          </div>
        </div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          Animals at home
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Your child is talking with Robot. Your phone can stay in your pocket.
        </div>
      </div>

      <div style={{ padding:'30px 16px 0' }}>
        <div style={{ background:'#F8F6F1', borderRadius:12, padding:'12px 14px', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          You'll get a calm summary here when the lesson ends. <b style={{ color:CL.ink }}>Audio is never saved.</b>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_companion')}>See what's happening</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Done for now</DvBigBtn>
      </div>

      <style>{`
        @keyframes cl-pulse { 0%{transform:scale(.7);opacity:.5} 100%{transform:scale(1.15);opacity:0} }
        @keyframes cl-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 8 · App Companion View During Robot Lesson
// ──────────────────────────────────────────────────
function S_CL_Companion({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [phase, setPhase] = React.useState(2); // 0..4
  const phases = [
    { lcd:'speak',  label:'Robot is speaking', time:'00:42' },
    { lcd:'listen', label:'Robot is listening', time:'00:51' },
    { lcd:'think',  label:'Robot is thinking', time:'00:55' },
    { lcd:'success',label:'Robot heard them!',  time:'01:02' },
    { lcd:'happy',  label:'Robot is celebrating', time:'01:08' },
  ];
  React.useEffect(()=>{
    const t = setTimeout(()=>setPhase(p => (p+1) % phases.length), 1800);
    return ()=>clearTimeout(t);
  }, [phase]);
  const cur = phases[phase];

  return (
    <DvShell title="What Robot sees" onBack={()=>go('cl_running')}>
      <div style={{ padding:'14px 20px 0', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        A live mirror of Robot's face. <b style={{ color:CL.ink }}>No transcript</b> — what your child says stays between them.
      </div>

      {/* Big LCD mirror */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:'#0E1116', borderRadius:18, padding:'18px 18px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600, alignSelf:'flex-start' }}>
            <span style={{ width:7, height:7, borderRadius:4, background:'#EF5454', animation:'cl-blink 1s ease-in-out infinite' }}/>
            Live · {cur.time}
          </div>
          <LCDFace emotion={cur.lcd} size={220} accent={accent}/>
          <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginTop:4 }}>{cur.label}</div>
        </div>
      </div>

      {/* Lesson progress */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>Animals at home</div>
            <div style={{ fontSize:11, color:CL.ink2, fontVariantNumeric:'tabular-nums' }}>3 / 8 turns</div>
          </div>
          <div style={{ height:8, borderRadius:4, background:'#EEF1F5', overflow:'hidden' }}>
            <div style={{ width:'37%', height:'100%', background:`linear-gradient(90deg, ${CL.accent}, ${accent})`, borderRadius:4 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:CL.ink2, marginTop:8 }}>
            <div>About 2 minutes left</div>
            <div>Words: 4 of 10</div>
          </div>
        </div>
      </div>

      {/* Calm controls — parent only, no scary "stop" */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>If you need to</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔉" title="Turn volume down" body="Currently at 6 of 10"/>
          <DvRow icon="⏸️" title="Pause Robot gently" body="Robot will say 'Let's take a quick break'"/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 9 · Lesson Complete Synced
// ──────────────────────────────────────────────────
function S_CL_Complete({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Today's lesson">
      <div style={{ padding:'36px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="celebrate" size={170} accent={accent}/>
        <div style={{ marginTop:18 }}>
          <CLChip state="completed"/>
        </div>
        <div style={{ marginTop:12, fontSize:22, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          A lovely 4 minutes
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Synced from Robot just now. Audio was never saved.
        </div>
      </div>

      {/* Summary stats — child-friendly framing, no grades */}
      <div style={{ padding:'24px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { v:'10', l:'Words played with' },
          { v:'7',  l:'Tried out loud' },
          { v:'4 min', l:'Time together' },
          { v:'3', l:'Words to revisit' },
        ].map(s=>(
          <div key={s.l} style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:12, padding:'12px 12px' }}>
            <div style={{ fontSize:22, fontWeight:700, color:CL.ink, letterSpacing:-0.4 }}>{s.v}</div>
            <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Words list */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>What Robot taught</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[
              { w:'cat', good:true }, { w:'dog', good:true }, { w:'bird', good:true },
              { w:'fish', good:true }, { w:'rabbit', good:false }, { w:'happy', good:true },
              { w:'big', good:true }, { w:'small', good:false }, { w:'jump', good:true },
              { w:'sleep', good:false },
            ].map(t=>(
              <span key={t.w} style={{
                background: t.good ? '#E6F4EE' : '#FFF4D9',
                color: t.good ? '#1F8A5B' : '#8A6A12',
                fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:7 }}>{t.w}</span>
            ))}
          </div>
          <div style={{ fontSize:11, color:CL.ink3, marginTop:10, lineHeight:1.5, textWrap:'pretty' }}>
            <span style={{ color:'#1F8A5B', fontWeight:700 }}>Green</span> = practiced confidently · <span style={{ color:'#8A6A12', fontWeight:700 }}>Yellow</span> = Robot will revisit
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_send')}>Plan tomorrow's lesson</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Done</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 10 · Robot Needs Sync — calm reconnect
// ──────────────────────────────────────────────────
function S_CL_NeedsSync({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot needs to catch up">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={170} accent={accent}/>
        <div style={{ marginTop:18 }}>
          <CLChip state="needs_sync"/>
        </div>
        <div style={{ marginTop:12, fontSize:20, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink, maxWidth:300, textWrap:'pretty' }}>
          Robot is offline right now
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Your new course "Yummy Words" is waiting on the app. We'll send it the moment Robot is back on Wi-Fi.
        </div>
      </div>

      {/* Pending */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Waiting to send</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:`1px solid ${CL.hair}` }}>
            <LCDPreview emotion="speak" accent={accent} size={56}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>Yummy Words · full course</div>
              <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>28 lessons · added 2 minutes ago</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px' }}>
            <LCDPreview emotion="happy" accent={accent} size={56}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>Today's lesson · Animals at home</div>
              <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>Will play once Robot is back online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Try this */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Try this</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔌" title="Check Robot is plugged in" body="Or has at least 20% battery"/>
          <DvRow icon="📶" title="Update Wi-Fi" body="If your network changed or password rotated" onClick={()=>go('dv_pair_wifi')}/>
          <DvRow icon="🔄" title="Restart Robot" body="Hold the top button for 5 seconds"/>
        </div>
      </div>

      <div style={{ padding:'12px 20px 0', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        No rush — your child can pick up tomorrow.
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_added')}>Reconnect Robot now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>I'll do it later</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// 11 · Course Locked
// ──────────────────────────────────────────────────
function S_CL_Locked({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[4]; // Story Time — locked, oldest tier
  return (
    <DvShell title="Locked for now" onBack={()=>go('cl_library')}>
      {/* Hero — desaturated */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ background:'#0E1116', padding:'18px 16px', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', filter:'grayscale(0.5)' }}>
            <LCDFace emotion={c.lcd} size={140} accent={accent}/>
            <div style={{ position:'absolute', top:10, right:10, background:'rgba(255,255,255,0.1)', padding:'5px 9px', borderRadius:999, display:'flex', alignItems:'center', gap:6, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.85)', textTransform:'uppercase', letterSpacing:0.5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              Locked
            </div>
          </div>
          <div style={{ padding:'14px 14px 16px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
              <CLChip state="locked"/>
              <div style={{ fontSize:11, color:CL.ink3 }}>Ages {c.ages}</div>
            </div>
            <div style={{ fontSize:20, fontWeight:600, color:CL.ink, letterSpacing:-0.2 }}>{c.title}</div>
            <div style={{ fontSize:13, color:CL.ink2, marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>{c.blurb}</div>
          </div>
        </div>
      </div>

      {/* Why locked */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ background:'#F8F6F1', borderRadius:12, padding:'14px 14px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:CL.ink, marginBottom:6 }}>Why is this locked?</div>
          <div style={{ fontSize:13, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
            Story Time uses past-tense and longer sentences. Your child is doing great with greetings — Robot will suggest this when they're ready, usually after Hello Friends.
          </div>
        </div>
      </div>

      {/* Suggested first */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Try first</div>
        <CourseCard course={COURSES[0]} accent={accent} onClick={()=>go('cl_detail')}/>
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_unlock_confirm')}>Unlock anyway</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_library')}>Back to library</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ──────────────────────────────────────────────────
// State + map exports
// ──────────────────────────────────────────────────
const COURSE_LIB_STATES = [
  { id:'cl_library',        title:'Course · Library',                     group:'Course Library' },
  { id:'cl_detail',         title:'Course · Detail',                      group:'Course Library' },
  { id:'cl_buy',            title:'Course · Buy / Unlock',                group:'Course Library' },
  { id:'cl_unlock_confirm', title:'Course · Parent unlock confirmation',  group:'Course Library' },
  { id:'cl_added',          title:'Course · Added to Robot',              group:'Course Library' },
  { id:'cl_send',           title:'Course · Send lesson to Robot',        group:'Course Library' },
  { id:'cl_robot_ready',    title:'Course · Robot ready for today',       group:'Course Library' },
  { id:'cl_running',        title:'Course · Lesson running on Robot',     group:'Course Library' },
  { id:'cl_companion',      title:'Course · App companion view',          group:'Course Library' },
  { id:'cl_complete',       title:'Course · Lesson complete (synced)',    group:'Course Library' },
  { id:'cl_needs_sync',     title:'Course · Robot needs sync',            group:'Course Library' },
  { id:'cl_locked',         title:'Course · Locked',                      group:'Course Library' },
];

const COURSE_LIB_SCREEN_MAP = {
  cl_library:        S_CL_Library,
  cl_detail:         S_CL_Detail,
  cl_buy:            S_CL_Buy,
  cl_unlock_confirm: S_CL_UnlockConfirm,
  cl_added:          S_CL_Added,
  cl_send:           S_CL_Send,
  cl_robot_ready:    S_CL_RobotReady,
  cl_running:        S_CL_Running,
  cl_companion:      S_CL_Companion,
  cl_complete:       S_CL_Complete,
  cl_needs_sync:     S_CL_NeedsSync,
  cl_locked:         S_CL_Locked,
};

Object.assign(window, { COURSE_LIB_STATES, COURSE_LIB_SCREEN_MAP });
