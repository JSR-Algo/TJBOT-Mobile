import React from 'react';

export default function TopBar({ left, right, title, dark }){
  const fg = dark ? '#fff' : 'var(--ink)';
  return (
    <div style={{
      position:'absolute', top:64, left:0, right:0, padding:'0 18px',
      display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:5,
    }}>
      <div>{left}</div>
      {title && <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:fg }}>{title}</div>}
      <div>{right}</div>
    </div>
  );
}
