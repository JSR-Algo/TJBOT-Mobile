import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import DvBigBtn from '@/components/DeviceBigBtn';
import RmChip from '../components/RmChip';
import { RM } from '../components/styles';

export default function RobotFirmwarePage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot software" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'24px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8, position:'relative' }}>
          <LCDFace emotion="thinking" size={130} accent={accent}/>
        </div>
        <div style={{ marginTop:14 }}><RmChip color={RM.warn} bg="#FFF4D9">New version available</RmChip></div>
        <div style={{ marginTop:10, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Robot has a small update
        </div>
        <div style={{ marginTop:6, fontSize:14, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Updates Robot's listening, fixes small things, and adds gentle improvements. Your child's progress is kept.
        </div>
      </div>

      {/* Version card */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Current</div>
              <div style={{ fontSize:15, fontWeight:600, color:RM.ink, marginTop:2 }}>v1.4.2</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RM.ink3} strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>New</div>
              <div style={{ fontSize:15, fontWeight:600, color:RM.accent, marginTop:2 }}>v1.5.0</div>
            </div>
          </div>
          <div style={{ paddingTop:10, borderTop:`1px solid ${RM.hair}` }}>
            <div style={{ fontSize:13, fontWeight:600, color:RM.ink, marginBottom:6 }}>What's new</div>
            <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:RM.ink2, lineHeight:1.7 }}>
              <li>Robot waits a little longer before nudging</li>
              <li>Better hearing in noisier rooms</li>
              <li>3 new gentle celebration sounds</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety reassurance */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🛡️" title="Safe to update" body="Your child's progress and courses are kept"/>
          <DvRow icon="⏱️" title="Takes about 6 minutes" body="Plug Robot in. We'll let you know when done."/>
          <DvRow icon="🔌" title="Don't unplug Robot" body="Wait until the soft chime. We handle the rest."/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>Update Robot now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_my_robot')}>Remind me tomorrow</DvBigBtn>
      </div>
    </DvShell>
  );
}
