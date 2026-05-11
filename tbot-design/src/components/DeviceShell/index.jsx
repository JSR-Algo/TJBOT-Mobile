import React from 'react';
import { DV } from '@/components/Device-tokens';

export default function DvShell({ title, onBack, children }){
  return (
    <div style={{ height:'100%', overflow:'auto', background:DV.bg, color:DV.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', WebkitFontSmoothing:'antialiased' }}>
      <div style={{ position:'sticky', top:0, zIndex:5, background:DV.bg, padding:'56px 20px 12px',
        display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${DV.hair}` }}>
        {onBack && (
          <button onClick={(e)=>{e.stopPropagation(); onBack();}} style={{
            width:32, height:32, borderRadius:8, border:'none', background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:DV.ink2,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div style={{ flex:1, fontWeight:600, fontSize:17, letterSpacing:-0.2 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}
