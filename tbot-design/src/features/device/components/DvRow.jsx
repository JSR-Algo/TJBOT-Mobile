import React from 'react';
import { DV } from '@/components/Device-tokens';

export default function DvRow({ icon, title, body, right, onClick, danger }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 14px',
      background:'transparent', border:'none', borderBottom:`1px solid ${DV.hair}`, cursor:'pointer', textAlign:'left',
    }}>
      {icon && <div style={{ width:36, height:36, borderRadius:9, background:'#EEF1F5', color: danger? '#C0392B' : DV.ink, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:500, color: danger? '#C0392B' : DV.ink, marginBottom: body? 2 : 0 }}>{title}</div>
        {body && <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.4, textWrap:'pretty' }}>{body}</div>}
      </div>
      {right ? right : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
      )}
    </button>
  );
}
