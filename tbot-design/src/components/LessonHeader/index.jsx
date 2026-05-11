import React from 'react';
import CircleBtn from '@/design-system/components/CircleBtn';

export default function LessonHeader({ progress=0.4, onExit }){
  return (
    <div style={{ position:'absolute', top:60, left:18, right:18, display:'flex', alignItems:'center', gap:12, zIndex:5 }}>
      <CircleBtn size={42} onClick={onExit} ariaLabel="exit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
      </CircleBtn>
      <div style={{ flex:1, height:14, background:'rgba(0,0,0,.06)', borderRadius:8, overflow:'hidden' }}>
        <div style={{ width:`${progress*100}%`, height:'100%', background:'linear-gradient(90deg, var(--mint), var(--sky))', borderRadius:8, transition:'width .4s' }}/>
      </div>
      <div style={{
        background:'#fff', padding:'4px 12px', borderRadius:14,
        fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink-soft)',
        boxShadow:'0 2px 6px rgba(0,0,0,.06)'
      }}>⭐ 12</div>
    </div>
  );
}
