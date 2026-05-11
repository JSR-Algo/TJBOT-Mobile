import React from 'react';
import { PA } from '../components/palette';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';

export default function ParentSummaryPage({ go }){
  return (
    <ParentScroll
      title="Parent Space"
      right={<button onClick={(e)=>{e.stopPropagation(); go('parent_settings');}} style={{ background:'transparent', border:'none', color:PA.accent, fontSize:15, fontWeight:500, cursor:'pointer' }}>Settings</button>}
    >
      {/* Today summary card */}
      <div style={{ padding:'18px 16px 8px' }}>
        <div style={{ fontSize:13, color:PA.ink3, marginBottom:6 }}>Today · Tuesday, Mar 12</div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, lineHeight:1.25, marginBottom:18 }}>
          Mira practiced greetings and feelings for about 8 minutes.
        </div>

        {/* simple stat row, no charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { v:'8', l:'minutes' },
            { v:'1', l:'lesson' },
            { v:'8', l:'speaking turns' },
          ].map(s=>(
            <div key={s.l} style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:12, padding:'12px 12px' }}>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:PA.ink, fontVariantNumeric:'tabular-nums' }}>{s.v}</div>
              <div style={{ fontSize:12, color:PA.ink2, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <button onClick={(e)=>{e.stopPropagation(); go('parent_today');}} style={{
          width:'100%', background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:12,
          padding:'14px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', textAlign:'left',
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:500, color:PA.ink }}>What Mira practiced today</div>
            <div style={{ fontSize:13, color:PA.ink2, marginTop:2 }}>Greetings · feelings · 3 new words</div>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
        </button>
      </div>

      <PRowGroup header="History">
        <PRow icon="🗓" label="Past 30 days" value="22 days active" chevron onClick={()=>go('parent_history')}/>
        <PRow icon="📚" label="Course progress" value="Unit 3 of 8" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Account">
        <PRow icon="🛡" label="Safety & Privacy" chevron onClick={()=>go('parent_safety')}/>
        <PRow icon="⚙" label="Settings" chevron onClick={()=>go('parent_settings')} isLast/>
      </PRowGroup>

      <div style={{ padding:'18px 24px 36px', textAlign:'center' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:PA.accent, fontSize:15, fontWeight:500, cursor:'pointer',
        }}>Return to child play area</button>
      </div>
    </ParentScroll>
  );
}
