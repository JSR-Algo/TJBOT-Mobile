import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import CL from './CL';

export default function LCDPreview({ emotion='idle', accent='#FF6F61', size=88, label }){
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ background:'#0E1116', borderRadius:8, padding:6, lineHeight:0,
        boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3)' }}>
        <LCDFace emotion={emotion} size={size} accent={accent}/>
      </div>
      {label && <div style={{ fontSize:9, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>}
    </div>
  );
}
