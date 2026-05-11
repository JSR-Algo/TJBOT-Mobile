import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import RmChip from '../components/RmChip';
import { RM } from '../components/styles';

export default function RobotStatusPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot status" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px',
          display:'flex', gap:12, alignItems:'center' }}>
          <RobotDevice emotion="happy" size={72} accent={accent}/>
          <div style={{ flex:1 }}>
            <RmChip>● Everything is working</RmChip>
            <div style={{ fontSize:13, color:RM.ink2, lineHeight:1.5, marginTop:6, textWrap:'pretty' }}>
              Last checked just now. Robot is ready for a lesson.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Details</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔋" title="Battery" body="78% · charging on dock" onClick={()=>go('rm_battery')}/>
          <DvRow icon="📶" title="Wi-Fi" body="Casa-Familia · strong signal" onClick={()=>go('rm_wifi')}/>
          <DvRow icon="📚" title="Courses on Robot" body="3 installed · 1.2 GB used" onClick={()=>go('rm_storage')}/>
          <DvRow icon="🎙️" title="Microphone" body="Working · last test today" onClick={()=>go('rm_mic_test')}/>
          <DvRow icon="🔈" title="Speaker" body="Working · volume 6" onClick={()=>go('rm_speaker_test')}/>
          <DvRow icon="⬆️" title="Software" body="v1.4.2 · update available" onClick={()=>go('rm_firmware')}/>
          <DvRow icon="🌡️" title="Temperature" body="Normal · 28°C"/>
          <DvRow icon="⏱️" title="Uptime" body="3 days · last started Sunday"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 30px' }}>
        <div style={{ background:'#EEF1F5', borderRadius:12, padding:'12px 14px', fontSize:12, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We don't read or store anything Robot hears. This page only checks the device itself.
        </div>
      </div>
    </DvShell>
  );
}
