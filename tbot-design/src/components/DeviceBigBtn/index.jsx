import React from 'react';
import { DV } from '@/components/Device-tokens';

export default function DvBigBtn({ children, onClick, secondary, danger }){
  if (secondary) return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:`1px solid ${DV.hair}`,
      background:'#fff', color:DV.ink, fontFamily:'inherit', fontWeight:500, fontSize:16, cursor:'pointer',
    }}>{children}</button>
  );
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:'none',
      background: danger? '#C0392B' : DV.accent, color:'#fff',
      fontFamily:'inherit', fontWeight:600, fontSize:16, cursor:'pointer',
      boxShadow:'0 1px 0 rgba(0,0,0,.04), 0 6px 18px rgba(42,111,219,.18)',
    }}>{children}</button>
  );
}
