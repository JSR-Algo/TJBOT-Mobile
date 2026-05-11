import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import { DV } from '@/components/Device-tokens';

export default function PairWifiPasswordPage({ go }){
  return (
    <DvShell title="Casa-Familia" onBack={()=>go('dv_pair_wifi')}>
      <div style={{ padding:'18px 20px 0', fontSize:14, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Enter the Wi-Fi password. Robot will remember it — your child won't need to.
      </div>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, padding:'14px 14px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Password</div>
          <div style={{ fontSize:18, fontFamily:'ui-monospace, monospace', color:DV.ink, letterSpacing:2 }}>•••••••••</div>
        </div>
      </div>
      <div style={{ padding:'12px 20px 0', display:'flex', alignItems:'center', gap:10, fontSize:13, color:DV.ink2 }}>
        <div style={{ width:18, height:18, borderRadius:4, background:DV.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
        </div>
        Show password
      </div>
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('dv_pair_connecting')}>Connect Robot</DvBigBtn>
      </div>
    </DvShell>
  );
}
