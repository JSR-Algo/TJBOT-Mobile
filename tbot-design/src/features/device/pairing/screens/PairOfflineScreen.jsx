import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import DvRow from '@/components/DeviceRow';
import { DV } from '@/components/Device-tokens';

export default function PairOfflinePage({ go, tweaks }){
  return (
    <DvShell title="Robot is offline" onBack={()=>go('dv_pair_add')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={170} accent={tweaks?.accent || '#FF6F61'}/>
        <div style={{ marginTop:24, fontSize:20, fontWeight:600, letterSpacing:-0.3, textAlign:'center' }}>
          Robot · ROB-2A8F is offline
        </div>
        <div style={{ marginTop:6, fontSize:13, color:DV.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Last seen <b style={{ color:DV.ink }}>2 hours ago</b> on Casa-Familia.
        </div>
      </div>
      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Try this</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔌" title="Check Robot is plugged in" body="Or has at least 20% battery"/>
          <DvRow icon="📶" title="Update Wi-Fi" body="If your network changed or password rotated" onClick={()=>go('dv_pair_wifi')}/>
          <DvRow icon="🔄" title="Restart Robot" body="Hold the top button for 5 seconds"/>
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_search')}>Reconnect now</DvBigBtn>
      </div>
    </DvShell>
  );
}
