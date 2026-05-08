// Robot purchase flow — 12 parent-facing frames.
// Premium, calm, trust-first. Reuses DV/CL tokens via globals.

const PR = {
  bg:'#F8F6F1', ink:'#1A1A1F', ink2:'#5A5A66', ink3:'#8B8B96',
  card:'#FFFFFF', hair:'rgba(0,0,0,0.08)', accent:'#2A6FDB', good:'#1F8A5B',
  warm:'#FAF3E8', sand:'#EFE7D8',
};

// Stylised hero "product photo" — soft pedestal + Robot character.
function RobotHero({ size=200, accent='#FF6F61', tilt=0, halo=true }){
  return (
    <div style={{ position:'relative', width:size+60, height:size+40, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      {halo && (
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 55%, rgba(255,210,170,0.55) 0%, rgba(255,210,170,0) 65%)', borderRadius:'50%' }}/>
      )}
      <div style={{ position:'absolute', bottom:6, width:size*0.85, height:14, background:'radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 70%)' }}/>
      <div style={{ transform:`rotate(${tilt}deg)` }}>
        <RobotDevice emotion="happy" size={size} accent={accent}/>
      </div>
    </div>
  );
}

function PRChip({ children, color=PR.accent, bg='#E8F0FE' }){
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:bg, color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, letterSpacing:0.2 }}>{children}</span>;
}

function PRStepTab({ step, total }){
  return (
    <div style={{ display:'flex', gap:6, padding:'0 6px' }}>
      {Array.from({length:total}).map((_, i)=>(
        <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i<=step ? PR.accent : 'rgba(0,0,0,0.08)' }}/>
      ))}
    </div>
  );
}

// ── 1. Product Intro / Robot Overview
function S_PR_Intro({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Meet Robot" onBack={()=>go('dv_home')}>
      <div style={{ padding:'18px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotHero size={220} accent={accent}/>
        <div style={{ marginTop:14 }}><PRChip>A gentle English buddy</PRChip></div>
        <div style={{ marginTop:14, fontSize:30, fontWeight:600, color:PR.ink, letterSpacing:-0.6, textAlign:'center', textWrap:'pretty', lineHeight:1.1 }}>
          A small robot that helps your child practice spoken English
        </div>
        <div style={{ marginTop:10, fontSize:14, color:PR.ink2, textAlign:'center', maxWidth:320, lineHeight:1.55, textWrap:'pretty' }}>
          4 minutes a day. Just talking. No screens, no pressure, no scores.
        </div>
      </div>

      <div style={{ padding:'28px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, padding:'4px 4px' }}>
          {[
            { ic:'🎙️', t:'Built for spoken English', b:'Robot is a patient listener — kids speak out loud, not type.' },
            { ic:'🪶', t:'Calm, never pushy', b:'No streaks, no badges that hurt to lose. Just steady warmth.' },
            { ic:'👨‍👩‍👧', t:'Designed with parents', b:'You set the courses. Your child sees only what you choose.' },
          ].map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:14, padding:'14px 14px', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_how')}>See how it works</DvBigBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('pr_privacy');}} style={{ background:'transparent', border:'none', fontSize:13, color:PR.ink2, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:8 }}>Privacy & safety first</button>
      </div>
    </DvShell>
  );
}

// ── 2. How Robot Lessons Work — the 3-part system
function S_PR_How({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const steps = [
    { n:1, t:'Robot talks and listens', b:'A short greeting, a question, a game. Robot speaks with warmth and waits patiently.', emo:'speak', side:'robot' },
    { n:2, t:'Your child practices speaking', b:'They answer out loud. Robot celebrates effort, gently revisits tricky words.', emo:'listen', side:'child' },
    { n:3, t:'You see a calm summary', b:'Words your child played with today. No transcripts, no recordings.', emo:'happy', side:'parent' },
  ];
  return (
    <DvShell title="How it works" onBack={()=>go('pr_intro')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={1} total={3}/>
      </div>
      <div style={{ padding:'24px 24px 0' }}>
        <div style={{ fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textWrap:'pretty', lineHeight:1.2 }}>
          Three small parts, one calm rhythm
        </div>
      </div>

      <div style={{ padding:'20px 16px 0', display:'flex', flexDirection:'column', gap:12 }}>
        {steps.map(s=>(
          <div key={s.n} style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, padding:'16px 16px', display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background: PR.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>{s.n}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, color:PR.ink }}>{s.t}</div>
              <div style={{ fontSize:13, color:PR.ink2, marginTop:4, lineHeight:1.5, textWrap:'pretty' }}>{s.b}</div>
              <div style={{ marginTop:10, background:'#0E1116', borderRadius:10, padding:6, display:'inline-block' }}>
                <LCDFace emotion={s.emo} size={88} accent={accent}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_included')}>What's included</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_intro')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 3. What's Included
function S_PR_Included({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const items = [
    { ic:'🤖', t:'Robot device', b:'3.2" LCD face, soft-touch shell, 8-hour battery' },
    { ic:'🔌', t:'Charging dock', b:'USB-C cable, magnet-aligned base' },
    { ic:'📱', t:'Parent app', b:'Free, no ads, course library and summaries' },
    { ic:'🎁', t:'Hello Friends starter course', b:'24 lessons of greetings, names, and feelings' },
    { ic:'📖', t:'Quick start booklet', b:'Setup in 5 minutes, with Spanish & English' },
    { ic:'🛡️', t:'2-year warranty', b:'Replace or refund if anything goes wrong' },
  ];
  return (
    <DvShell title="In the box" onBack={()=>go('pr_how')}>
      <div style={{ padding:'18px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <PRStepTab step={2} total={3}/>
        <div style={{ marginTop:18, fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Everything to start tomorrow
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, overflow:'hidden' }}>
          {items.map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:14, padding:'14px 16px', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:PR.warm, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 20px 0', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        Hardware is yours. The starter course is included forever.
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_bundle')}>Choose a bundle</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 4. Robot + Starter Course Bundle (parent picks hardware option)
function S_PR_Bundle({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [pick, setPick] = React.useState(0);
  const opts = [
    { id:'robot',   tag:'Most parents pick this', tagColor:PR.good, title:'Robot + Hello Friends', body:'Robot device and your first course. Add more later, only if you want.', price:149, sub:'one-time · ships free' },
    { id:'family',  tag:'Saves more',             tagColor:PR.accent, title:'Robot + All Courses (1 year)', body:'Robot device and every course for a year. Cancel anytime.', price:219, sub:`${window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(149, 'USD') : '$149'} hardware + ${window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(70, 'USD') : '$70'} first year` },
  ];
  return (
    <DvShell title="Pick your bundle" onBack={()=>go('pr_included')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
      </div>

      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {opts.map((o, i)=>{
          const sel = i===pick;
          return (
            <button key={o.id} onClick={(e)=>{e.stopPropagation(); setPick(i);}} style={{
              background: sel? '#E8F0FE' : PR.card, border: sel? `2px solid ${PR.accent}` : `1px solid ${PR.hair}`,
              borderRadius:16, padding:'14px 14px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:o.tagColor, textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{o.tag}</div>
                  <div style={{ fontSize:15, fontWeight:600, color:PR.ink }}>{o.title}</div>
                  <div style={{ fontSize:12, color:PR.ink2, lineHeight:1.45, marginTop:3, textWrap:'pretty' }}>{o.body}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:PR.ink, letterSpacing:-0.3 }}>{typeof o.price === 'number' ? (window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(o.price, 'USD') : `$${o.price}`) : o.price}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:PR.ink3, marginTop:8 }}>{o.sub}</div>
              {/* Mini contents */}
              <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:5 }}>
                {(i===0 ? ['Robot','Dock','Hello Friends','App'] : ['Robot','Dock','5 courses','New courses included','App']).map(t=>(
                  <span key={t} style={{ background:'#EEF1F5', color:PR.ink2, fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6 }}>{t}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding:'18px 20px 0', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        Both bundles include free shipping and a 30-day return.
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_subs')}>Continue</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_included')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 5. Course Subscription / Course Packs (clearly optional)
function S_PR_Subs({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [pick, setPick] = React.useState('none');
  const opts = [
    { id:'none', tag:'No subscription', body:"Stick with Hello Friends. You can add courses one at a time later.", price:'Free', sub:'Always an option' },
    { id:'all',  tag:'All Courses',     body:'Every course on your Robot, including new ones we add.', price:8.99, sub:'/ month · 7-day free trial' },
    { id:'pack', tag:'Starter pack',    body:'Hello Friends, Animals, Yummy Words — once, yours forever.', price:48, sub:`one-time · save ${window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(24, 'USD') : '$24'}` },
  ];
  return (
    <DvShell title="Add courses?" onBack={()=>go('pr_bundle')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:PR.ink, letterSpacing:-0.3, textWrap:'pretty', lineHeight:1.2 }}>
          Optional · skip if you'd rather wait
        </div>
        <div style={{ marginTop:6, fontSize:13, color:PR.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          Robot already comes with the Hello Friends course. Add more only if you want — you can change this anytime.
        </div>
      </div>

      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {opts.map(o=>{
          const sel = pick===o.id;
          return (
            <button key={o.id} onClick={(e)=>{e.stopPropagation(); setPick(o.id);}} style={{
              background: sel? '#E8F0FE' : PR.card, border: sel? `2px solid ${PR.accent}` : `1px solid ${PR.hair}`,
              borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left',
              display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:22, height:22, borderRadius:11, border: sel? 'none' : `2px solid ${PR.hair}`,
                background: sel? PR.accent : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>{o.tag}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:PR.ink, letterSpacing:-0.2 }}>{o.price}</div>
                </div>
                <div style={{ fontSize:12, color:PR.ink2, lineHeight:1.5, marginTop:3, textWrap:'pretty' }}>{o.body}</div>
                <div style={{ fontSize:11, color:PR.ink3, marginTop:5 }}>{o.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding:'18px 20px 0', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        Your child never sees prices. Subscriptions are managed only here.
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_privacy')}>Continue</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_bundle')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 6. Parent Trust / Privacy
function S_PR_Privacy({ go, tweaks }){
  const rows = [
    { ic:'🎙️', t:"We don't save audio", b:"What your child says is processed in real time and discarded. There is no transcript stored." },
    { ic:'🚫', t:'No ads, ever', b:'Robot will never show, mention, or hint at advertising — at any age, in any course.' },
    { ic:'🔒', t:'Parent-only purchases', b:"Buying Robot, adding courses, or upgrading always passes through a parent gate." },
    { ic:'🌐', t:'Stops if Robot is offline', b:'Robot only listens during a lesson, and a lesson can only start with your Wi-Fi.' },
    { ic:'📁', t:'Easy data export & delete', b:"Download or wipe your child's summary history with one tap, anytime." },
    { ic:'🇺🇸', t:'COPPA & GDPR-K compliant', b:"Independently audited. Reports available in Settings → Safety & Privacy." },
  ];
  return (
    <DvShell title="What we promise parents" onBack={()=>go('pr_subs')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRChip color={PR.good} bg="#E6F4EE">Privacy first · always</PRChip>
        <div style={{ marginTop:14, fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textWrap:'pretty', lineHeight:1.2 }}>
          Your child's voice stays your child's
        </div>
      </div>

      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:16, overflow:'hidden' }}>
          {rows.map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', gap:14, padding:'13px 16px', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'#E6F4EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{r.ic}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5, textWrap:'pretty' }}>{r.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_checkout')}>I'm ready · go to checkout</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('pr_subs')}>Back</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 7. Checkout Entry — order summary, address, pay
function S_PR_Checkout({ go }){
  return (
    <DvShell title="Checkout" onBack={()=>go('pr_privacy')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
      </div>

      {/* Order summary */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Your order</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'14px 14px' }}>
          {[
            { t:'Robot device + Hello Friends course', s:'Includes dock & cable', p:149.00 },
            { t:'All Courses · monthly', s:'7-day free trial · cancel anytime', p:0.00 },
            { t:'Shipping', s:'Free · arrives in 3–5 business days', p:'Free' },
          ].map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:11, color:PR.ink2, marginTop:2 }}>{r.s}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:PR.ink, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{typeof r.p === 'number' ? (window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(r.p, 'USD') : `$${r.p.toFixed(2)}`) : r.p}</div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', paddingTop:10, marginTop:6, borderTop:`1px solid ${PR.hair}` }}>
            <div style={{ fontSize:14, fontWeight:700, color:PR.ink }}>Today's total</div>
            <div style={{ fontSize:20, fontWeight:700, color:PR.ink, letterSpacing:-0.3 }}>{window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(149.00, 'USD') : '$149.00'}</div>
          </div>
          <div style={{ fontSize:11, color:PR.ink2, marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>
            Subscription begins after free trial. We email a reminder 2 days before.
          </div>
        </div>
      </div>

      {/* Ship to */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Ship to</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>Sarah Chen</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5 }}>247 Linden St · Apt 3B<br/>Brooklyn, NY 11215</div>
          </div>
          <button onClick={(e)=>e.stopPropagation()} style={{ background:'transparent', border:'none', color:PR.accent, fontWeight:600, fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>Edit</button>
        </div>
      </div>

      {/* Payment */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Payment</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🍎" title="Apple Pay" body="Touch ID · default" right={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PR.accent} strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill={PR.accent}/></svg>}/>
          <DvRow icon="💳" title="Card ending 4421" body="Visa · expires 12/27"/>
        </div>
      </div>

      <div style={{ padding:'18px 20px 6px', fontSize:11, color:PR.ink3, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        30-day return · 2-year warranty · no auto-renew without notice
      </div>

      <div style={{ padding:'10px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_confirm')}>Place order · {window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(149.00, 'USD') : '$149.00'}</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 8. Order Confirmation
function S_PR_Confirm({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Order placed">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#E6F4EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={PR.good} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>
        </div>
        <div style={{ marginTop:18, fontSize:26, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textAlign:'center', textWrap:'pretty', lineHeight:1.15 }}>
          Thank you, Sarah
        </div>
        <div style={{ marginTop:8, fontSize:14, color:PR.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Robot is on its way. We'll send a setup nudge when it arrives — no rush.
        </div>
      </div>

      {/* Order tile */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'center' }}>
          <RobotHero size={84} accent={accent} halo={false}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5 }}>Order #TB-48217</div>
            <div style={{ fontSize:14, fontWeight:600, color:PR.ink, marginTop:3 }}>Robot · Cream</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:2 }}>Hello Friends starter course</div>
            <div style={{ fontSize:12, color:PR.ink2 }}>{window.__tbot?.fmtPrice ? window.__tbot.fmtPrice(149.00, 'USD') : '$149.00'} · paid with Apple Pay</div>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Next</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📦" title="Today" body="We're packing your order"/>
          <DvRow icon="🚚" title="Tue – Thu" body="Arrives at 247 Linden St · free shipping"/>
          <DvRow icon="🤖" title="When it arrives" body="Open the app — we'll guide setup in 5 minutes"/>
        </div>
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ background:PR.warm, borderRadius:12, padding:'12px 14px', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We just emailed your receipt to <b style={{ color:PR.ink }}>sarah@example.com</b>.
        </div>
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_shipping')}>Track delivery</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Back to home</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 9. Shipping / Delivery Status
function S_PR_Shipping({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const steps = [
    { t:'Order placed',  s:'Mon, 9:42 AM',  done:true,   active:false },
    { t:'Packed',        s:'Mon, 4:10 PM',  done:true,   active:false },
    { t:'In transit',    s:'On a truck near Newark', done:false, active:true },
    { t:'Out for delivery', s:'Expected Wed', done:false, active:false },
    { t:'Delivered',     s:'',               done:false, active:false },
  ];
  return (
    <DvShell title="Robot is on its way" onBack={()=>go('pr_confirm')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'18px 18px',
          display:'flex', gap:14, alignItems:'center' }}>
          <RobotHero size={84} accent={accent} halo={false}/>
          <div style={{ flex:1 }}>
            <PRChip color={'#8A6A12'} bg="#FFF4D9">Arriving Wed, Apr 24</PRChip>
            <div style={{ fontSize:14, fontWeight:600, color:PR.ink, marginTop:6 }}>Order #TB-48217</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:2 }}>247 Linden St · Apt 3B</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding:'24px 24px 0' }}>
        <div style={{ display:'flex', flexDirection:'column' }}>
          {steps.map((s, i)=>(
            <div key={s.t} style={{ display:'flex', gap:14, position:'relative', minHeight:54 }}>
              {/* line */}
              {i<steps.length-1 && (
                <div style={{ position:'absolute', left:11, top:24, bottom:-6, width:2, background: s.done? PR.good : 'rgba(0,0,0,0.1)' }}/>
              )}
              <div style={{ width:24, height:24, borderRadius:'50%', background: s.done? PR.good : s.active? '#fff' : '#fff',
                border: s.active ? `2px solid ${PR.accent}` : s.done ? 'none' : `2px solid ${PR.hair}`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1 }}>
                {s.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
                {s.active && <span style={{ width:8, height:8, borderRadius:4, background:PR.accent, animation:'pr-pulse 1.4s ease-in-out infinite' }}/>}
              </div>
              <div style={{ flex:1, paddingTop:1, paddingBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:600, color: s.done||s.active ? PR.ink : PR.ink3 }}>{s.t}</div>
                {s.s && <div style={{ fontSize:12, color:PR.ink2, marginTop:2 }}>{s.s}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'8px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📍" title="Track with carrier" body="USPS · 9405 5113 1234 5678 9012 34"/>
          <DvRow icon="✉️" title="Change delivery address" body="Until Tuesday at 6 PM"/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn secondary onClick={()=>go('pr_arrived')}>Mark as arrived (demo)</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Back to home</DvBigBtn>
      </div>

      <style>{`@keyframes pr-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}`}</style>
    </DvShell>
  );
}

// ── 10. Robot Arrived: Setup CTA
function S_PR_Arrived({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot is here">
      <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotHero size={220} accent={accent}/>
        <div style={{ marginTop:14 }}><PRChip color={PR.good} bg="#E6F4EE">📦 Delivered today</PRChip></div>
        <div style={{ marginTop:14, fontSize:28, fontWeight:600, color:PR.ink, letterSpacing:-0.5, textAlign:'center', textWrap:'pretty', lineHeight:1.15 }}>
          Your Robot has arrived
        </div>
        <div style={{ marginTop:8, fontSize:14, color:PR.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Setup takes about 5 minutes. Find a quiet spot and a nearby outlet.
        </div>
      </div>

      <div style={{ padding:'30px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📦" title="1. Open the box" body="Robot, charging dock, USB-C cable"/>
          <DvRow icon="🔌" title="2. Plug in the dock" body="Place Robot on it — a soft chime means hello"/>
          <DvRow icon="📶" title="3. Connect to your Wi-Fi" body="We'll guide you screen-by-screen"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:PR.warm, borderRadius:12, padding:'12px 14px', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
          Setting up later? Robot will wait quietly in its box.
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_activate')}>Set up Robot now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Later tonight</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 11. Activate Robot — enter activation code
function S_PR_Activate({ go }){
  const [vals, setVals] = React.useState(['','','','','','']);
  const filled = vals.every(Boolean);
  return (
    <DvShell title="Activate your Robot" onBack={()=>go('pr_arrived')}>
      <div style={{ padding:'18px 24px 0', textAlign:'center' }}>
        <PRStepTab step={1} total={3}/>
      </div>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:54, height:54, borderRadius:14, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PR.ink2} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <div style={{ fontSize:22, fontWeight:600, color:PR.ink, letterSpacing:-0.3, textAlign:'center' }}>Enter activation code</div>
        <div style={{ marginTop:8, fontSize:13, color:PR.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          You'll find a 6-character code on the card inside Robot's box.
        </div>
      </div>

      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          {vals.map((v, i)=>(
            <div key={i} style={{ width:42, height:54, borderRadius:10, background:PR.card, border: `2px solid ${v ? PR.accent : PR.hair}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:PR.ink, fontFamily:'ui-monospace, monospace', textTransform:'uppercase' }}>
              {v || ''}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6 }}>
          {['T','B','4','7','K','9'].map((k, i)=>(
            <button key={i} onClick={(e)=>{
              e.stopPropagation();
              setVals(prev => { const next=[...prev]; const idx = next.findIndex(x=>!x); if (idx>=0) next[idx]=k; return next; });
            }} style={{ height:46, borderRadius:10, border:`1px solid ${PR.hair}`, background:PR.card, color:PR.ink, fontSize:16, fontWeight:600, fontFamily:'ui-monospace, monospace', cursor:'pointer' }}>{k}</button>
          ))}
        </div>
        <button onClick={(e)=>{ e.stopPropagation(); setVals(['','','','','','']); }} style={{ marginTop:10, background:'transparent', border:'none', color:PR.accent, fontWeight:600, fontSize:13, fontFamily:'inherit', cursor:'pointer', display:'block', width:'100%', padding:8 }}>Clear</button>
      </div>

      <div style={{ padding:'18px 20px 0' }}>
        <DvRow icon="❓" title="Can't find the code?" body="It's printed on the inside flap of the box"/>
      </div>

      <div style={{ padding:'18px 20px 30px' }}>
        <DvBigBtn onClick={()=>{ if (filled) go('pr_first_course'); }}>{filled ? 'Activate Robot' : 'Enter the code'}</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 12. Add First Course
function S_PR_FirstCourse({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="One more step">
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
      </div>
      <div style={{ padding:'24px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8 }}>
          <LCDFace emotion="happy" size={150} accent={accent}/>
        </div>
        <div style={{ marginTop:14 }}><PRChip color={PR.good} bg="#E6F4EE">Robot · activated</PRChip></div>
        <div style={{ marginTop:14, fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Add your first course
        </div>
        <div style={{ marginTop:8, fontSize:13, color:PR.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Hello Friends comes free with your Robot. We'll send it to the device now.
        </div>
      </div>

      {/* Free starter card */}
      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ background:PR.card, border:`2px solid ${PR.accent}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ background:'#0E1116', borderRadius:10, padding:6, flexShrink:0 }}>
            <LCDFace emotion="happy" size={64} accent={accent}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              <PRChip color={PR.good} bg="#E6F4EE">Free with Robot</PRChip>
              <span style={{ fontSize:11, color:PR.ink3 }}>Ages 4–6</span>
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:PR.ink }}>Hello Friends</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:3, lineHeight:1.4, textWrap:'pretty' }}>
              Greetings, names, family, and feelings. 24 lessons of warm play.
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
              {['Greetings','Names','Family','Feelings'].map(t=>(
                <span key={t} style={{ background:'#EEF1F5', color:PR.ink2, fontSize:10, fontWeight:600, padding:'3px 7px', borderRadius:6 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:PR.warm, borderRadius:12, padding:'12px 14px', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
          Browse more courses anytime in <b style={{ color:PR.ink }}>Course Library</b>.
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_added')}>Send Hello Friends to Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_library')}>Explore the library first</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ────────── Exports ──────────
const PURCHASE_STATES = [
  { id:'pr_intro',        title:'Buy · Robot overview',        group:'Purchase' },
  { id:'pr_how',          title:'Buy · How lessons work',      group:'Purchase' },
  { id:'pr_included',     title:"Buy · What's included",       group:'Purchase' },
  { id:'pr_bundle',       title:'Buy · Bundle picker',         group:'Purchase' },
  { id:'pr_subs',         title:'Buy · Course subscription',   group:'Purchase' },
  { id:'pr_privacy',      title:'Buy · Parent trust & privacy',group:'Purchase' },
  { id:'pr_checkout',     title:'Buy · Checkout',              group:'Purchase' },
  { id:'pr_confirm',      title:'Buy · Order confirmed',       group:'Purchase' },
  { id:'pr_shipping',     title:'Buy · Shipping & delivery',   group:'Purchase' },
  { id:'pr_arrived',      title:'Buy · Robot arrived · setup', group:'Purchase' },
  { id:'pr_activate',     title:'Buy · Activate Robot',        group:'Purchase' },
  { id:'pr_first_course', title:'Buy · Add first course',      group:'Purchase' },
];

const PURCHASE_SCREEN_MAP = {
  pr_intro: S_PR_Intro,
  pr_how: S_PR_How,
  pr_included: S_PR_Included,
  pr_bundle: S_PR_Bundle,
  pr_subs: S_PR_Subs,
  pr_privacy: S_PR_Privacy,
  pr_checkout: S_PR_Checkout,
  pr_confirm: S_PR_Confirm,
  pr_shipping: S_PR_Shipping,
  pr_arrived: S_PR_Arrived,
  pr_activate: S_PR_Activate,
  pr_first_course: S_PR_FirstCourse,
};

Object.assign(window, { PURCHASE_STATES, PURCHASE_SCREEN_MAP });
