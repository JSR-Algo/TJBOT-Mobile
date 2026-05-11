import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import RmStat from '../components/RmStat';
import RmChip from '../components/RmChip';
import { RM } from '../components/styles';

export default function MyRobotPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="My Robot" onBack={()=>go('parent_settings')}>
      {/* Hero */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:16, padding:'18px 18px',
          display:'flex', gap:14, alignItems:'center' }}>
          <RobotDevice emotion="happy" size={96} accent={accent}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Paired Robot</div>
            <div style={{ fontSize:18, fontWeight:600, color:RM.ink, letterSpacing:-0.3, marginTop:2 }}>Buddy Panda</div>
            <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>ROB-2A8F · Cream</div>
            <div style={{ marginTop:8 }}><RmChip>● Online · all good</RmChip></div>
          </div>
        </div>
      </div>

      {/* Status grid */}
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Status</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <RmStat icon="🔋" label="Battery" value="78% · charging" status="ok" onClick={()=>go('rm_battery')}/>
          <RmStat icon="📶" label="Wi-Fi" value="Casa-Familia" status="ok" onClick={()=>go('rm_wifi')}/>
          <RmStat icon="📚" label="Courses" value="3 installed" status="ok" onClick={()=>go('rm_storage')}/>
          <RmStat icon="🎙️" label="Microphone" value="Working" status="ok" onClick={()=>go('rm_mic_test')}/>
        </div>
      </div>

      {/* Care & maintenance */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Care</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔊" title="Sound & volume" body="Volume 6 · Quiet hours on" onClick={()=>go('rm_sound')}/>
          <DvRow icon="🎙️" title="Microphone test" body="Check Robot can hear" onClick={()=>go('rm_mic_test')}/>
          <DvRow icon="🔈" title="Speaker test" body="Play a chime to check audio" onClick={()=>go('rm_speaker_test')}/>
          <DvRow icon="⬆️" title="Robot software" body="v1.4.2 · update available"
            onClick={()=>go('rm_firmware')}
            right={<div style={{ background:'#FFF1C2', color:RM.warn, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:8 }}>New</div>}/>
        </div>
      </div>

      {/* Help & advanced */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Help</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📡" title="Robot offline help" body="Tips when Robot won't connect" onClick={()=>go('rm_offline_help')}/>
          <DvRow icon="🛟" title="Contact support" body="We usually reply in under a day" onClick={()=>go('rm_support')}/>
          <DvRow icon="ℹ️" title="Detailed status" body="Battery, Wi-Fi, sync, sensors" onClick={()=>go('rm_status')}/>
        </div>
      </div>

      {/* Reset */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow danger icon="⚠️" title="Factory reset" body="Erase data and start fresh · parent gate" onClick={()=>go('rm_factory')}/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}
