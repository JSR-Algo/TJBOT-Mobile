import React from 'react';
import { PA } from './palette';

export default function PRow({ icon, label, value, toggle, onToggle, chevron, danger, onClick, isLast }){
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:12, minHeight:48, padding:'10px 14px',
      borderBottom: isLast? 'none' : `1px solid ${PA.hair}`,
      cursor: onClick? 'pointer':'default',
    }}>
      {icon && <div style={{ width:28, height:28, borderRadius:7, background:'#EEF1F5', color:PA.ink2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>{icon}</div>}
      <div style={{ flex:1, fontSize:15, color: danger? '#C0392B' : PA.ink, fontWeight: danger? 500 : 400 }}>{label}</div>
      {value !== undefined && <div style={{ fontSize:14, color:PA.ink2 }}>{value}</div>}
      {toggle !== undefined && (
        <div onClick={(e)=>{e.stopPropagation(); onToggle && onToggle(!toggle);}} style={{
          width:42, height:25, borderRadius:13, background: toggle? PA.good : '#D8D8DD',
          position:'relative', transition:'background .15s', cursor:'pointer', flexShrink:0,
        }}>
          <div style={{ position:'absolute', top:2, left: toggle? 19:2, width:21, height:21, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .15s' }}/>
        </div>
      )}
      {chevron && <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink:0 }}><path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>}
    </div>
  );
}
