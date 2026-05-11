import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import DvRow from '@/components/DeviceRow';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import LCDPreview from '../components/LCDPreview';

export default function NeedsSyncPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot needs to catch up">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={170} accent={accent}/>
        <div style={{ marginTop:18 }}>
          <CLChip state="needs_sync"/>
        </div>
        <div style={{ marginTop:12, fontSize:20, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink, maxWidth:300, textWrap:'pretty' }}>
          Robot is offline right now
        </div>
        <div style={{ marginTop:6, fontSize:13, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Your new course "Yummy Words" is waiting on the app. We'll send it the moment Robot is back on Wi-Fi.
        </div>
      </div>

      {/* Pending */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Waiting to send</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:`1px solid ${CL.hair}` }}>
            <LCDPreview emotion="speak" accent={accent} size={56}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>Yummy Words · full course</div>
              <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>28 lessons · added 2 minutes ago</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px' }}>
            <LCDPreview emotion="happy" accent={accent} size={56}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:CL.ink }}>Today's lesson · Animals at home</div>
              <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>Will play once Robot is back online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Try this */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Try this</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔌" title="Check Robot is plugged in" body="Or has at least 20% battery"/>
          <DvRow icon="📶" title="Update Wi-Fi" body="If your network changed or password rotated" onClick={()=>go('dv_pair_wifi')}/>
          <DvRow icon="🔄" title="Restart Robot" body="Hold the top button for 5 seconds"/>
        </div>
      </div>

      <div style={{ padding:'12px 20px 0', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        No rush — your child can pick up tomorrow.
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_added')}>Reconnect Robot now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>I'll do it later</DvBigBtn>
      </div>
    </DvShell>
  );
}
