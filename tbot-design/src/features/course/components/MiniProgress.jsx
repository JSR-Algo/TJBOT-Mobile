import React from 'react';

export default function MiniProgress({ value=0, color='var(--mint)' }){
  return (
    <div style={{ height:10, background:'rgba(0,0,0,.07)', borderRadius:8, overflow:'hidden' }}>
      <div style={{ width:`${value*100}%`, height:'100%', background:color, borderRadius:8, transition:'width .4s' }}/>
    </div>
  );
}
