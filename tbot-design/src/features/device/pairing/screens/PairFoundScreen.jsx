import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairFoundPage({ go, tweaks }){
  return (
    <DvShell title="We found your Robot" onBack={()=>go('dv_pair_intro')}>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px', display:'flex', gap:14, alignItems:'center' }}>
          <RobotDevice emotion="paired" size={84} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:DV.ink, marginBottom:2 }}>Robot · ROB-2A8F</div>
            <div style={{ fontSize:13, color:DV.ink2, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:4, background:DV.good }}/>
              Ready to pair
            </div>
            <div style={{ fontSize:12, color:DV.ink3, marginTop:2 }}>Signal: strong · Battery: 78%</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'18px 20px 0', fontSize:13, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Make sure this is <b style={{ color:DV.ink }}>your</b> Robot before pairing.
      </div>
      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_code')}>This is my Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_pair_search')}>Search again</DvBigBtn>
      </div>
    </DvShell>
  );
}
