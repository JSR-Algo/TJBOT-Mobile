import React from 'react';

export default function ScreenShell({ children, bg, onTap }){
  return (
    <div onClick={onTap} style={{
      width:'100%', height:'100%',
      background: bg || 'linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)',
      position:'relative', overflow:'hidden',
      fontFamily:'var(--body)', color:'var(--ink)',
    }}>
      {children}
    </div>
  );
}
