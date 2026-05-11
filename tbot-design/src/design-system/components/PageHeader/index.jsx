import React from 'react';
import CircleBtn from '@/design-system/components/CircleBtn';

export default function PageHeader({ left, right, title, subtitle, onBack }){
  return (
    <div style={{ padding:'62px 18px 12px', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {left || (onBack ? (
          <CircleBtn size={42} onClick={onBack} ariaLabel="back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
          </CircleBtn>
        ) : <div style={{width:42}}/>)}
        {right}
      </div>
      {title && (
        <div>
          {subtitle && <div style={{ fontFamily:'var(--display)', fontWeight:600, fontSize:14, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2 }}>{subtitle}</div>}
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', letterSpacing:-.5 }}>{title}</div>
        </div>
      )}
    </div>
  );
}
