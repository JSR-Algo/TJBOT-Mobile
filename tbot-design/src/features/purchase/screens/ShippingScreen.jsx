import React from 'react';
import { PR } from '../components/tokens';
import RobotHero from '../components/RobotHero';
import PRChip from '../components/PRChip';

export default function ShippingPage({ go, tweaks }){
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
