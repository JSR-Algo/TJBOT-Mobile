import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import { DV } from '@/components/Device-tokens';

export default function PairAddPage({ go, tweaks }){
  return (
    <DvShell title="Add a Robot" onBack={()=>go('dv_overview')}>
      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          Lessons happen <b style={{ color:DV.ink }}>on the Robot itself</b>, not your phone. The phone is just for setup and progress.
        </div>
      </div>
      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_intro');}} style={{
          background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px',
          display:'flex', gap:14, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <RobotDevice emotion="charging" size={64} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>I have a new Robot</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:2 }}>About 3 minutes — needs Wi-Fi</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <button onClick={(e)=>{e.stopPropagation(); go('dv_pair_offline');}} style={{
          background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'16px 16px',
          display:'flex', gap:14, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <div style={{ width:64, height:64, borderRadius:14, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={DV.ink2} strokeWidth="1.6"><path d="M3 12a9 9 0 109-9"/><path d="M12 7v5l3 2"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>My Robot is offline</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:2 }}>Reconnect or move to new Wi-Fi</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
      <div style={{ padding:'20px 20px 0', fontSize:12, color:DV.ink3, lineHeight:1.5, textWrap:'pretty' }}>
        You'll need: Robot, your home Wi-Fi password, and about 3 minutes.
      </div>
    </DvShell>
  );
}
