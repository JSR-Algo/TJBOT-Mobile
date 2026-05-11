import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import { DV } from '@/components/Device-tokens';

export default function PairFirstLessonPage({ go, tweaks }){
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
