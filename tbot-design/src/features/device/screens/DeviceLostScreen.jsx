import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function DeviceLostPage({ go, tweaks }){
  const [chiming, setChiming] = React.useState(false);
  return (
    <DvShell title="Find Robot" onBack={()=>go('dv_home')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:220, height:220 }}>
          {chiming && [0,1,2].map(i=>(
            <div key={i} style={{ position:'absolute', width:200, height:200, borderRadius:'50%',
              border:`2px solid ${tweaks?.accent || '#FF6F61'}`, opacity:0.5,
              animation:`pair-pulse 1.6s ease-out ${i*0.5}s infinite` }}/>
          ))}
          <RobotDevice emotion={chiming?'happy':'sleep'} size={180} accent={tweaks?.accent || '#FF6F61'}/>
        </div>
        <div style={{ marginTop:24, fontSize:20, fontWeight:600, textAlign:'center', textWrap:'pretty', maxWidth:280 }}>
          {chiming? 'Robot is chiming!' : "Can't find Robot?"}
        </div>
        <div style={{ marginTop:8, fontSize:14, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          {chiming? 'Listen for a soft melody. Robot will keep playing for 30 seconds.' : 'Robot will play a gentle melody so you can find it.'}
        </div>
      </div>
      <div style={{ padding:'30px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px', display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
          <span style={{ width:8, height:8, borderRadius:4, background:DV.good }}/> Last seen: 2 min ago · Wi-Fi · 78%
        </div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px', display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
          📍 Probably in: <b style={{ color:DV.ink }}>the living room</b>
        </div>
      </div>
      <div style={{ padding:'30px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>setChiming(c=>!c)}>{chiming? 'Stop chime' : 'Make Robot chime'}</DvBigBtn>
      </div>
    </DvShell>
  );
}
