import React from 'react';

export default function HomeSecondaryButton({ label, icon, onClick, badge, dim }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      flex:1, height:84, borderRadius:22, border:'none', position:'relative',
      background:'#fff', color:'var(--ink)',
      fontFamily:'var(--display)', fontWeight:700, fontSize:14, cursor:'pointer',
      boxShadow:'0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.05)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
      opacity: dim ? 0.55 : 1,
    }}>
      <div style={{ fontSize:26, lineHeight:1 }}>{icon}</div>
      <div>{label}</div>
      {badge != null && (
        <div style={{
          position:'absolute', top:8, right:10, minWidth:22, height:22, padding:'0 6px',
          borderRadius:11, background:'var(--coral)', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:800, fontFamily:'var(--display)',
        }}>{badge}</div>
      )}
    </button>
  );
}
