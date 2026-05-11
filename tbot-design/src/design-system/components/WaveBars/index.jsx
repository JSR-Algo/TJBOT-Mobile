import React from 'react';

export default function WaveBars({ count=14, color='var(--coral)', active=true, height=42 }){
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', height }}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} style={{
          width:5, height: '100%', borderRadius:6, background: color,
          transformOrigin:'center',
          animation: active ? `wave-bar ${0.7 + (i%4)*0.15}s ease-in-out ${(i*0.07)%1}s infinite` : 'none',
          opacity: active? 1: .3,
        }}/>
      ))}
    </div>
  );
}
