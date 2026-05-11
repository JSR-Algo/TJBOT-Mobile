import React from 'react';

export default function PrimaryCTA({ children, onClick, color='var(--coral)', icon }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:72, borderRadius:'var(--r-button)', border:'none',
      background: color, color:'#fff',
      fontFamily:'var(--display)', fontWeight:700, fontSize:26, letterSpacing:.2,
      boxShadow:`0 4px 0 rgba(0,0,0,.15), 0 10px 24px ${color === 'var(--coral)' ? 'rgba(255,111,97,.4)' : 'rgba(0,0,0,.12)'}`,
      display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
      padding:'0 22px',
    }}>
      {icon}{children}
    </button>
  );
}
