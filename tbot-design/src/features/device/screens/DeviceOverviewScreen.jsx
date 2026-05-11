import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import { DV } from '@/components/Device-tokens';

export default function DeviceOverviewPage({ tweaks, go }){
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
