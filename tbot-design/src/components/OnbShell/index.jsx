import React from 'react';

const OB = {
  bg: '#F5F5F2',
  card: '#FFFFFF',
  ink: '#1A1A1F',
  ink2: '#5A5A66',
  ink3: '#8B8B96',
  hair: 'rgba(0,0,0,0.07)',
  accent: '#2A6FDB',
  good: '#1F8A5B',
  danger: '#C0392B',
  dangerSoft: '#FBE7E2',
};

export { OB };

export default function OnbShell({ children, step, total, onBack, title }){
  return (
    <div style={{ height:'100%', overflow:'auto', background:OB.bg, color:OB.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Text", system-ui, sans-serif', WebkitFontSmoothing:'antialiased' }}>
      <div style={{ position:'sticky', top:0, zIndex:5, background:OB.bg, padding:'56px 20px 12px',
        display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${OB.hair}` }}>
        {onBack && (
          <button onClick={(e)=>{e.stopPropagation(); onBack();}} style={{
            width:32, height:32, borderRadius:8, border:'none', background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:OB.ink2,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div style={{ flex:1, fontWeight:600, fontSize:17, letterSpacing:-0.2 }}>{title}</div>
        {step && total && <div style={{ fontSize:13, color:OB.ink3, fontWeight:500 }}>{step} of {total}</div>}
      </div>
      {children}
    </div>
  );
}
