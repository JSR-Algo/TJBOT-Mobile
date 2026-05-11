import React from 'react';
import { OB } from '@/components/OnbShell';

export default function OnbBigBtn({ children, onClick, color=OB.accent, secondary=false, danger=false }){
  if (secondary) return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:`1px solid ${OB.hair}`,
      background:'#fff', color:OB.ink, fontFamily:'inherit', fontWeight:500, fontSize:16, cursor:'pointer',
    }}>{children}</button>
  );
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', minHeight:50, borderRadius:12, border:'none',
      background: danger? OB.danger : color, color:'#fff', fontFamily:'inherit', fontWeight:600, fontSize:16, cursor:'pointer',
      boxShadow: danger? '0 1px 0 rgba(0,0,0,.04), 0 6px 18px rgba(192,57,43,.18)' : '0 1px 0 rgba(0,0,0,.04), 0 6px 18px rgba(42,111,219,.18)',
    }}>{children}</button>
  );
}
