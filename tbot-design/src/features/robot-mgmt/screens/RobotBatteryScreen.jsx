import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import RmChip from '../components/RmChip';
import { RM } from '../components/styles';

export default function RobotBatteryPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const pct = 78;
  return (
    <DvShell title="Battery" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {/* battery ring */}
        <div style={{ position:'relative', width:180, height:180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="14"/>
            <circle cx="90" cy="90" r="78" fill="none" stroke={RM.good} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(pct/100)*490} 490`}
              transform="rotate(-90 90 90)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:42, fontWeight:700, color:RM.ink, letterSpacing:-1, fontVariantNumeric:'tabular-nums' }}>{pct}%</div>
            <div style={{ fontSize:13, color:RM.ink2, marginTop:2 }}>charging</div>
          </div>
        </div>
        <div style={{ marginTop:18 }}><RmChip>⚡ On dock · 32 min to full</RmChip></div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔌" title="Power source" body="Charging dock"/>
          <DvRow icon="⏱️" title="Estimated lesson time" body="About 5 hours of talking"/>
          <DvRow icon="🌙" title="Sleeps when idle" body="After 30 minutes off the dock"/>
          <DvRow icon="🔋" title="Battery health" body="100% · like new"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:RM.ink, marginBottom:8 }}>To keep the battery healthy</div>
          <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:RM.ink2, lineHeight:1.7 }}>
            <li>Use the included dock — third-party chargers can run hot</li>
            <li>Robot is happiest between 10°C and 30°C</li>
            <li>If you'll be away a week, leave Robot at about 50%</li>
          </ul>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}
