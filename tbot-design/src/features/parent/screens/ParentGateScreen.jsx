import React from 'react';
import { PA } from '../components/palette';

export default function ParentGatePage({ go, robotProps }){
  // type-the-shown-number. randomized per mount; not a real auth.
  const [target] = React.useState(() => 100 + Math.floor(Math.random()*900));
  const [val, setVal] = React.useState('');
  const ok = val === String(target);

  React.useEffect(()=>{
    if (ok) { const t = setTimeout(()=>go('parent_summary'), 280); return ()=>clearTimeout(t); }
  }, [ok]);

  return (
    <div style={{ height:'100%', background:PA.bg, color:PA.ink, fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'68px 28px 0' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:PA.ink2,
          padding:0, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to play
        </button>
      </div>
      <div style={{ flex:1, padding:'40px 28px 28px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PA.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2"/>
            <path d="M8 10V7a4 4 0 018 0v3"/>
          </svg>
        </div>
        <div style={{ fontSize:24, fontWeight:600, letterSpacing:-0.4, marginBottom:8 }}>Parent Space</div>
        <div style={{ fontSize:15, color:PA.ink2, lineHeight:1.45, marginBottom:32 }}>
          To continue, please type the number below. This keeps the parent area separate from the play area.
        </div>

        <div style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:14, padding:'22px 20px', marginBottom:18 }}>
          <div style={{ fontSize:12, color:PA.ink3, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Type this number</div>
          <div style={{ fontSize:38, fontWeight:600, letterSpacing:8, fontVariantNumeric:'tabular-nums', marginBottom:18, color:PA.ink }}>{target}</div>
          <input
            inputMode="numeric"
            value={val}
            onChange={e=>setVal(e.target.value.replace(/\D/g,'').slice(0,3))}
            placeholder="—"
            style={{
              width:'100%', border:'none', borderBottom:`2px solid ${ok? PA.good : PA.hair}`,
              background:'transparent', outline:'none',
              fontSize:24, padding:'8px 0', fontVariantNumeric:'tabular-nums', letterSpacing:6, color:PA.ink,
              fontFamily:'inherit',
            }}
          />
        </div>
        <div style={{ fontSize:13, color:PA.ink3, lineHeight:1.5 }}>
          This is a speed bump, not a password. Children using the device on their own will see the play area only.
        </div>
      </div>
    </div>
  );
}
