// Progress & Celebration screens
// 5 frames: today_progress, words_practiced, lesson_summary, review_needed, celebration

// shared chip
function StatChip({ icon, value, label, color='var(--coral)' }){
  return (
    <div style={{
      background:'#fff', borderRadius:24, padding:'18px 16px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
      boxShadow:'0 2px 6px rgba(0,0,0,.05)',
      flex:1, minWidth:0,
    }}>
      <div style={{ width:48, height:48, borderRadius:16, background:color, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:4 }}>{icon}</div>
      <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)', textAlign:'center', textWrap:'pretty' }}>{label}</div>
    </div>
  );
}

// 1. Today's Progress
function S_TodayProgress({ go, robotProps }){
  return (
    <PageScroll>
      <PageHeader
        onBack={()=>go('home')}
        subtitle="Today"
        title="You practiced speaking!"
      />
      <div style={{ padding:'4px 24px 14px', display:'flex', justifyContent:'center' }}>
        <Robot emotion="happy" size={170} {...robotProps}/>
      </div>
      <div style={{ padding:'4px 18px 14px', display:'flex', gap:10 }}>
        <StatChip icon="🎤" value="8" label="speaking turns" color="var(--coral)"/>
        <StatChip icon="📚" value="1" label="lesson done" color="var(--mint)"/>
        <StatChip icon="⭐" value="12" label="stars today" color="var(--sun)"/>
      </div>
      <div style={{ padding:'4px 18px 14px' }}>
        <div style={{ background:'#fff', borderRadius:22, padding:'16px 18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:16, color:'var(--ink)', marginBottom:10 }}>This week</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:8, height:90 }}>
            {['M','T','W','T','F','S','S'].map((d,i)=>{
              const v = [0.4,0.7,0.5,0.9,0.6,0,0][i];
              const today = i===3;
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{
                    width:'70%', height: v? `${v*100}%`:8,
                    background: today? 'var(--coral)': v? 'var(--mint)':'rgba(0,0,0,.06)',
                    borderRadius:8,
                  }}/>
                  <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:12, color: today?'var(--coral)':'var(--ink-soft)' }}>{d}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:10, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
            🔥 5-day streak — nice!
          </div>
        </div>
      </div>
      <div style={{ padding:'8px 24px 28px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home')} color="var(--coral)">Back home</PrimaryCTA>
      </div>
    </PageScroll>
  );
}

// 2. Words Practiced
function S_WordsPracticed({ go, robotProps }){
  const stronger = [
    { w:'Hello', icon:'👋' },
    { w:'Cat',   icon:'🐱' },
    { w:'Happy', icon:'😊' },
  ];
  const visiting = [
    { w:'Friend', icon:'👫' },
    { w:'Dog',    icon:'🐶' },
  ];
  const Tile = ({ w, icon, strong }) => (
    <div style={{
      background:'#fff', borderRadius:20, padding:'14px',
      display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start',
      boxShadow:'0 2px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize:34 }}>{icon}</div>
      <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:20, color:'var(--ink)' }}>{w}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
        {strong ? (
          <>
            <div style={{ display:'flex', gap:2 }}>
              {[0,1,2].map(i=> <div key={i} style={{ width:14, height:6, borderRadius:3, background: i<2?'var(--mint)':'rgba(0,0,0,.1)'}}/>)}
            </div>
            <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'#1F8A5B' }}>stronger</span>
          </>
        ) : (
          <>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)' }}/>
            <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'#A06900' }}>visit again</span>
          </>
        )}
      </div>
    </div>
  );
  return (
    <PageScroll>
      <PageHeader onBack={()=>go('today_progress')} subtitle="Today" title="Words Practiced"/>
      <div style={{ padding:'0 24px 8px', display:'flex', alignItems:'center', gap:12 }}>
        <Robot emotion="happy" size={80} {...robotProps}/>
        <div style={{ background:'#fff', borderRadius:18, padding:'10px 14px', flex:1, fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)', boxShadow:'0 2px 6px rgba(0,0,0,.05)', textWrap:'pretty', lineHeight:1.3 }}>
          These words got stronger today.
        </div>
      </div>
      <div style={{ padding:'14px 18px 8px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Stronger 💪</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {stronger.map(t=> <Tile key={t.w} {...t} strong/>)}
        </div>
      </div>
      <div style={{ padding:'14px 18px 14px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Visit again soon 🌱</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {visiting.map(t=> <Tile key={t.w} {...t}/>)}
        </div>
      </div>
      <div style={{ padding:'10px 24px 28px' }}>
        <PrimaryCTA onClick={()=>go('review_needed')} color="var(--sun)">Practice 2 words</PrimaryCTA>
      </div>
    </PageScroll>
  );
}

// 3. Lesson Completion Summary
function S_LessonSummary({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, var(--mint-soft) 0%, var(--cream) 60%)">
      <div style={{ padding:'80px 24px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:14, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.5 }}>Lesson done</div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:32, color:'var(--ink)', textAlign:'center', lineHeight:1.1 }}>Great effort!</div>
        <Robot emotion="success" size={200} accent="var(--sun)" {...robotProps}/>
      </div>
      <div style={{ padding:'4px 24px 14px' }}>
        <div style={{ background:'#fff', borderRadius:24, padding:'18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { icon:'🎤', label:'You tried', value:'8 English turns' },
              { icon:'⭐', label:'Earned',    value:'12 stars' },
              { icon:'📚', label:'Words',     value:'3 new friends' },
            ].map((r,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:14, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{r.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>{r.label}</div>
                  <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding:'8px 24px 28px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)">Keep going →</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          width:'100%', minHeight:56, borderRadius:'var(--r-button)', border:'2px solid rgba(0,0,0,.08)',
          background:'transparent', color:'var(--ink-soft)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>Stop for today</button>
      </div>
    </PageScroll>
  );
}

// 4. Review Needed
function S_ReviewNeeded({ go, robotProps }){
  const words = [
    { w:'Friend',  icon:'👫', when:'2 days ago' },
    { w:'Dog',     icon:'🐶', when:'3 days ago' },
    { w:'Morning', icon:'🌅', when:'5 days ago' },
  ];
  return (
    <PageScroll bg="linear-gradient(180deg, #FFE6BD 0%, var(--cream) 60%)">
      <PageHeader onBack={()=>go('home')} subtitle="A friendly nudge" title="Let's visit again"/>
      <div style={{ padding:'0 24px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <Robot emotion="curious" size={120} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>3 words miss you!</SpeechBubble>
      </div>
      <div style={{ padding:'4px 18px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {words.map(w=>(
          <div key={w.w} style={{
            background:'#fff', borderRadius:20, padding:'14px',
            display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{ width:54, height:54, borderRadius:18, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{w.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:20, color:'var(--ink)' }}>{w.w}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)' }}/> Last seen {w.when}
              </div>
            </div>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--sun)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌱</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 24px 28px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--sun)" icon={<span style={{fontSize:26}}>▶</span>}>Practice together</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Maybe later</button>
      </div>
    </PageScroll>
  );
}

// 5. Celebration
function S_Celebration({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, var(--sun) 0%, #FFD9B0 50%, var(--cream-2) 100%)">
      {/* confetti */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {Array.from({length:24}).map((_,i)=>{
          const colors = ['var(--coral)','var(--mint)','var(--sky)','#fff','var(--plum)'];
          return (
            <div key={i} style={{
              position:'absolute',
              left:`${(i*37)%100}%`, top:`${(i*17)%80}%`,
              width: 10+(i%3)*4, height: 14+(i%4)*3,
              background: colors[i%colors.length],
              borderRadius: i%2? 4: 50,
              transform:`rotate(${i*23}deg)`,
              animation:`bot-bob ${1.6+(i%5)*0.3}s ease-in-out ${(i*0.07)%1.2}s infinite`,
              opacity:.85,
            }}/>
          );
        })}
      </div>

      <div style={{ position:'relative', padding:'80px 24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-hero)', color:'var(--ink)', textAlign:'center', lineHeight:1, textShadow:'0 2px 0 rgba(255,255,255,.3)' }}>You did it!</div>
        <Robot emotion="success" size={240} accent="var(--coral)" {...robotProps}/>
        <div style={{
          background:'rgba(255,255,255,.85)', backdropFilter:'blur(8px)',
          padding:'14px 22px', borderRadius:22,
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)',
          textAlign:'center', maxWidth:300, lineHeight:1.3,
        }}>
          You finished today's lesson.<br/>Great effort speaking out loud!
        </div>

        {/* sticker reward */}
        <div style={{
          marginTop:6, background:'#fff', borderRadius:24, padding:'14px 18px',
          display:'flex', alignItems:'center', gap:14, boxShadow:'0 4px 0 rgba(0,0,0,.06), 0 12px 26px rgba(0,0,0,.08)'
        }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🌟</div>
          <div>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>New sticker</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>Brave Speaker</div>
          </div>
        </div>
      </div>

      <div style={{ position:'relative', padding:'24px 24px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home')} color="var(--coral)">Back to Robot Home</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('review_needed');}} style={{
          background:'rgba(255,255,255,.7)', border:'none', color:'var(--ink)',
          minHeight:56, borderRadius:'var(--r-button)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>Practice review words</button>
      </div>
    </PageScroll>
  );
}

const PROGRESS_SCREEN_MAP = {
  today_progress: S_TodayProgress,
  words_practiced: S_WordsPracticed,
  lesson_summary: S_LessonSummary,
  review_needed: S_ReviewNeeded,
  celebration: S_Celebration,
};

const PROGRESS_STATES = [
  { id:'today_progress',  title:"Today's Progress",     group:'Progress' },
  { id:'words_practiced', title:'Words Practiced',      group:'Progress' },
  { id:'lesson_summary',  title:'Lesson Summary',       group:'Progress' },
  { id:'review_needed',   title:'Review Needed',        group:'Progress' },
  { id:'celebration',     title:'Celebration',          group:'Progress' },
];

Object.assign(window, { PROGRESS_SCREEN_MAP, PROGRESS_STATES });
