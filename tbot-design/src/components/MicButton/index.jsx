import React from 'react';

export default function MicButton({ on, onClick, label }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:108, height:108, borderRadius:'50%', border:'none',
      background: on ? 'var(--coral)' : '#fff',
      color: on ? '#fff' : 'var(--coral)',
      boxShadow: on
        ? '0 4px 0 rgba(0,0,0,.15), 0 0 0 8px rgba(255,111,97,.18), 0 12px 30px rgba(255,111,97,.4)'
        : '0 4px 0 rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.1)',
      display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      position:'relative', zIndex:2,
    }} aria-label={label || 'microphone'}>
      <svg width="40" height="48" viewBox="0 0 24 28" fill="none">
        <rect x="8" y="2" width="8" height="14" rx="4" fill="currentColor"/>
        <path d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    </button>
  );
}
