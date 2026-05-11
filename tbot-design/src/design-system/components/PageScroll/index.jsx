import React from 'react';

export default function PageScroll({ children, bg }){
  return (
    <div style={{
      width:'100%', height:'100%', overflow:'auto',
      background: bg || 'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)',
      WebkitOverflowScrolling:'touch',
    }}>
      {children}
    </div>
  );
}
