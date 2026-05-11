import React from 'react';
import { RM } from './styles';

export default function RmStat({ icon, label, value, status='ok', onClick }){
  const colors = { ok: RM.good, warn: RM.warn, bad: RM.danger };
  const bgs = { ok:'#E6F4EE', warn:'#FFF4D9', bad:'#FBE6E2' };
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      flex:1, minWidth:0, background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:12,
      padding:'12px 12px', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
      display:'flex', flexDirection:'column', gap:6,
    }}>
      <div style={{ width:30, height:30, borderRadius:8, background:bgs[status], color:colors[status], display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{icon}</div>
      <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color:RM.ink, letterSpacing:-0.2 }}>{value}</div>
    </button>
  );
}
