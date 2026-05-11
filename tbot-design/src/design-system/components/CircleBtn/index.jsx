import React from 'react';

export default function CircleBtn({ children, bg='#fff', onClick, size=48, ariaLabel }){
  return (
    <button aria-label={ariaLabel} onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:size, height:size, borderRadius:'50%', border:'none',
      background:bg, boxShadow:'0 2px 0 rgba(0,0,0,.08), 0 6px 14px rgba(0,0,0,.06)',
      display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      color:'var(--ink-soft)',
    }}>{children}</button>
  );
}
