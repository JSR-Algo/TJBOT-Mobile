import React from 'react';
import { PR } from './tokens';

export default function PRChip({ children, color=PR.accent, bg='#E8F0FE' }){
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:bg, color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, letterSpacing:0.2 }}>{children}</span>;
}
