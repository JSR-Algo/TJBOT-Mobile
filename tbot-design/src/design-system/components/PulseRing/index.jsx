import React from 'react';

export default function PulseRing({ size=240, color='var(--coral)' }){
  return (
    <>
      {[0,1,2].map(i=>(
        <div key={i} style={{
          position:'absolute', left:'50%', top:'50%',
          width:size, height:size, marginLeft:-size/2, marginTop:-size/2,
          borderRadius:'50%', border:`3px solid ${color}`,
          animation:`ring-pulse 2.4s ease-out ${i*0.8}s infinite`,
          pointerEvents:'none',
        }}/>
      ))}
    </>
  );
}
