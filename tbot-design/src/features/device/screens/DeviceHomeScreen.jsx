import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import { DV } from '@/components/Device-tokens';

export default function DeviceHomePage({ go, tweaks }){
  return (
    <DvShell title="Robot · ROB-2A8F">
      {/* Hero card */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:DV.card, borderRadius:18, padding:'18px 18px', border:`1px solid ${DV.hair}`,
          display:'flex', gap:16, alignItems:'center' }}>
          <RobotDevice emotion="idle" size={108} accent={tweaks?.accent || '#FF6F61'}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:DV.good, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:4, background:DV.good }}/> Online · idle
            </div>
            <div style={{ fontSize:18, fontWeight:600, color:DV.ink, marginTop:2 }}>Ready for today</div>
            <div style={{ fontSize:12, color:DV.ink2, marginTop:4, display:'flex', alignItems:'center', gap:8 }}>
              <span>🔋 78%</span><span>•</span><span>Wi-Fi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today summary */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Today</div>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          <DvRow icon="📚" title="Unit 2 · Animals" body="Lesson 4 of 6 · about 4 minutes" onClick={()=>go('dv_session')} right={<div style={{ fontSize:13, color:DV.accent, fontWeight:600 }}>Start</div>}/>
          <DvRow icon="🔁" title="3 words to revisit" body="Robot will sneak these in tomorrow" onClick={()=>{}}/>
          <DvRow icon="⭐" title="Yesterday: 1 lesson · 4 min" body="Tap to see what your child practiced" onClick={()=>go('today_progress')}/>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Robot</div>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          <DvRow icon="🎵" title="Make Robot chime" body="Find Robot if it's misplaced" onClick={()=>go('dv_lost')}/>
          <DvRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM"/>
          <DvRow icon="🔄" title="Sync content" body="Up to date · 2 minutes ago"/>
          <DvRow icon="⬆️" title="Firmware" body="v1.4.2 · update available" right={<div style={{ background:'#FFF1C2', color:DV.warn, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:9 }}>UPDATE</div>} onClick={()=>go('dv_firmware')}/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>This Robot</div>
        <div style={{ background:DV.card, borderRadius:14, padding:'4px 4px', border:`1px solid ${DV.hair}` }}>
          <DvRow icon="👤" title="Buddy: Panda · Just starting" body="Tap to change avatar or level"/>
          <DvRow icon="🛡️" title="Safety & privacy"/>
          <DvRow danger title="Unpair this Robot" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg>}/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}
