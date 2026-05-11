import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';

export default function RobotHero({ size=200, accent='#FF6F61', tilt=0, halo=true }){
  return (
    <div style={{ position:'relative', width:size+60, height:size+40, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      {halo && (
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 55%, rgba(255,210,170,0.55) 0%, rgba(255,210,170,0) 65%)', borderRadius:'50%' }}/>
      )}
      <div style={{ position:'absolute', bottom:6, width:size*0.85, height:14, background:'radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 70%)' }}/>
      <div style={{ transform:`rotate(${tilt}deg)` }}>
        <RobotDevice emotion="happy" size={size} accent={accent}/>
      </div>
    </div>
  );
}
