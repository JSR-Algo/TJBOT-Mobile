import React from 'react';
import { RM } from './styles';

export default function RmChip({ children, color=RM.good, bg='#E6F4EE' }){
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:bg, color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, letterSpacing:0.2 }}>{children}</span>;
}
