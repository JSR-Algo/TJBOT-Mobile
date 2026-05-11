import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function DeviceFirmwarePage({ go, tweaks }){
  return (
    <DvShell title="Software update" onBack={()=>go('dv_home')}>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px', display:'flex', gap:14, alignItems:'center' }}>
          <RobotDevice emotion="charging" size={84} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:DV.warn, textTransform:'uppercase', letterSpacing:0.6 }}>Update available</div>
            <div style={{ fontSize:16, fontWeight:600, color:DV.ink, marginTop:2 }}>v1.5.0 · 24 MB</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:2 }}>About 4 minutes · Robot will be unavailable</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>What's new</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            'Smoother face animations',
            'Better understanding of small voices',
            'Two new lesson celebrations',
            'Bug fixes',
          ].map((t,i,a)=>(
            <div key={i} style={{ padding:'12px 14px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none',
              display:'flex', alignItems:'flex-start', gap:10, fontSize:14, color:DV.ink, textWrap:'pretty', lineHeight:1.4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="2.4" strokeLinecap="round" style={{ marginTop:4, flexShrink:0 }}><path d="M5 12l5 5 9-10"/></svg>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_home')}>Update tonight (recommended)</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Update now</DvBigBtn>
        <div style={{ fontSize:12, color:DV.ink3, textAlign:'center', lineHeight:1.5 }}>
          Tonight's update happens during quiet hours so Robot is ready in the morning.
        </div>
      </div>
    </DvShell>
  );
}
