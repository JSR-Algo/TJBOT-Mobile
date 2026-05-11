import React from 'react';

export default function SpeechBubble({ children, dark, color }){
  const bg = color || (dark ? 'rgba(255,255,255,.95)' : '#fff');
  return (
    <div style={{
      background: bg, padding:'18px 24px', borderRadius:24,
      fontFamily:'var(--display)', fontWeight:700, fontSize:'var(--t-body)',
      lineHeight:1.25, color:'var(--ink)', textWrap:'pretty', textAlign:'center',
      boxShadow:'0 2px 0 rgba(0,0,0,.05), 0 10px 30px rgba(0,0,0,.06)',
      position:'relative', maxWidth:'88%',
    }}>
      {children}
    </div>
  );
}
