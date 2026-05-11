import React from 'react';

export default function IntroDots({ idx }){
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
      {[0,1,2,3].map(i=>(
        <div key={i} style={{
          width: i===idx? 24:10, height:10, borderRadius:6,
          background: i===idx? 'var(--coral)' : 'rgba(0,0,0,.12)', transition:'all .3s'
        }}/>
      ))}
    </div>
  );
}
