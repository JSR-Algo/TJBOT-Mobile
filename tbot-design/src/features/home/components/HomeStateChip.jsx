import React from 'react';

export default function HomeStateChip({ children, color='var(--coral)', icon }){
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:8,
      background:'rgba(255,255,255,.85)', backdropFilter:'blur(8px)',
      padding:'8px 14px', borderRadius:999,
      fontFamily:'var(--display)', fontWeight:700, fontSize:13,
      color:'var(--ink-soft)', boxShadow:'0 2px 8px rgba(0,0,0,.06)',
    }}>
      {icon && <span style={{ display:'inline-flex', color }}>{icon}</span>}
      {children}
    </div>
  );
}
