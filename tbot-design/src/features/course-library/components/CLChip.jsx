import React from 'react';

export default function CLChip({ state }){
  const map = {
    installed:    { bg:'#E6F4EE', fg:'#1F8A5B', dot:'#1F8A5B', label:'On Robot' },
    not_installed:{ bg:'#EEF1F5', fg:'#5A5A66', dot:'#8B8B96', label:'Not on Robot' },
    locked:       { bg:'#F2EEF6', fg:'#6E5A8A', dot:'#9B8FB8', label:'Locked' },
    ready:        { bg:'#FFF4D9', fg:'#8A6A12', dot:'#E8A33C', label:'Ready for today' },
    completed:    { bg:'#E6F4EE', fg:'#1F8A5B', dot:'#1F8A5B', label:'Completed' },
    needs_sync:   { bg:'#FFE9DC', fg:'#A04A1F', dot:'#D97757', label:'Needs sync' },
  };
  const s = map[state] || map.not_installed;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:s.bg, color:s.fg,
      fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:999, letterSpacing:0.2 }}>
      <span style={{ width:6, height:6, borderRadius:3, background:s.dot }}/>
      {s.label}
    </div>
  );
}
