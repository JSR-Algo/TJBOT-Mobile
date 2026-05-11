import React from 'react';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';

export default function ChildProfilePage({ go }){
  const [buddy, setBuddy] = React.useState('panda');
  const [level, setLevel] = React.useState('starter');
  const buddies = [
    { id:'panda',  emoji:'🐼', label:'Panda' },
    { id:'cat',    emoji:'🐱', label:'Cat'   },
    { id:'fox',    emoji:'🦊', label:'Fox'   },
    { id:'rabbit', emoji:'🐰', label:'Rabbit'},
    { id:'frog',   emoji:'🐸', label:'Frog'  },
    { id:'lion',   emoji:'🦁', label:'Lion'  },
    { id:'unicorn',emoji:'🦄', label:'Unicorn'},
    { id:'dog',    emoji:'🐶', label:'Dog'   },
  ];
  const levels = [
    { id:'starter',  label:'Just starting',   body:'New to English. Lots of Robot voice and pictures.' },
    { id:'building', label:'Knows some words', body:'Can say a few English words. Ready for short phrases.' },
    { id:'flowing',  label:'Speaks a bit',    body:'Can answer simple questions. Ready to talk in sentences.' },
  ];
  const sel = buddies.find(b=>b.id===buddy);

  return (
    <OnbShell title="Your child's buddy" onBack={()=>go('onb_login')}>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, marginBottom:6 }}>
          Pick a buddy and a starting level
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We don't ask for your child's name or photo. The buddy is how Robot greets them.
        </div>
      </div>

      {/* Buddy picker */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:12, color:OB.ink3, padding:'0 4px 8px', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>Buddy</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {buddies.map(b=>(
            <button key={b.id} onClick={(e)=>{e.stopPropagation(); setBuddy(b.id);}} style={{
              aspectRatio:'1', border:`2px solid ${buddy===b.id? OB.accent : OB.hair}`,
              borderRadius:14, background: buddy===b.id? '#E8F0FE' : OB.card,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, cursor:'pointer',
            }}>{b.emoji}</button>
          ))}
        </div>
        <div style={{ fontSize:13, color:OB.ink2, padding:'10px 4px 0' }}>Robot will say: <b>"Hi, {sel.label} friend!"</b></div>
      </div>

      {/* Level picker */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:12, color:OB.ink3, padding:'0 4px 8px', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>Starting level</div>
        <div style={{ background:OB.card, borderRadius:14, border:`1px solid ${OB.hair}`, overflow:'hidden' }}>
          {levels.map((l,i)=>{
            const active = level===l.id;
            return (
              <button key={l.id} onClick={(e)=>{e.stopPropagation(); setLevel(l.id);}} style={{
                display:'flex', alignItems:'flex-start', gap:12, width:'100%', padding:'14px 14px',
                border:'none', background: active? '#E8F0FE' : 'transparent',
                borderBottom: i<levels.length-1? `1px solid ${OB.hair}`:'none',
                cursor:'pointer', textAlign:'left',
              }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0, marginTop:2,
                  border:`2px solid ${active? OB.accent : 'rgba(0,0,0,.2)'}`,
                  background: active? OB.accent : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:OB.ink, marginBottom:2 }}>{l.label}</div>
                  <div style={{ fontSize:13, color:OB.ink2, lineHeight:1.45, textWrap:'pretty' }}>{l.body}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize:12, color:OB.ink3, padding:'8px 4px 0', lineHeight:1.5 }}>Robot adapts as you go — you can change this any time.</div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <OnbBigBtn onClick={()=>go('onb_first_lesson')}>Save and meet Robot</OnbBigBtn>
      </div>
    </OnbShell>
  );
}
