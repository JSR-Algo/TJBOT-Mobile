import React from 'react';
import { PA } from './palette';

export default function PRowGroup({ header, footer, children }){
  return (
    <div style={{ padding:'14px 16px 0' }}>
      {header && <div style={{ fontSize:12, color:PA.ink3, padding:'0 4px 6px', textTransform:'uppercase', letterSpacing:0.6, fontWeight:600 }}>{header}</div>}
      <div style={{ background:PA.card, borderRadius:14, overflow:'hidden', border:`1px solid ${PA.hair}` }}>{children}</div>
      {footer && <div style={{ fontSize:12, color:PA.ink3, padding:'8px 4px 0', lineHeight:1.45 }}>{footer}</div>}
    </div>
  );
}
