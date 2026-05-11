import React from 'react';
import { PR } from './tokens';

export default function PRStepTab({ step, total }){
  return (
    <div style={{ display:'flex', gap:6, padding:'0 6px' }}>
      {Array.from({length:total}).map((_, i)=>(
        <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i<=step ? PR.accent : 'rgba(0,0,0,0.08)' }}/>
      ))}
    </div>
  );
}
