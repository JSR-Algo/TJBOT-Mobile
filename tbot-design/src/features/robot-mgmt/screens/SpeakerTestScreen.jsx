import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import DvBigBtn from '@/components/DeviceBigBtn';
import { RM } from '../components/styles';

export default function SpeakerTestPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [played, setPlayed] = React.useState(null); // 'chime' | 'voice' | null
  return (
    <DvShell title="Speaker test" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8 }}>
          <LCDFace emotion={played?'happy':'idle'} size={140} accent={accent}/>
        </div>
        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center' }}>
          Can you hear Robot?
        </div>
        <div style={{ marginTop:6, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          Tap a sound to play it at the current volume (6 of 10).
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={(e)=>{e.stopPropagation(); setPlayed('chime');}} style={{
            background:RM.card, border: played==='chime'? `2px solid ${RM.accent}` : `1px solid ${RM.hair}`,
            borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
            display:'flex', gap:14, alignItems:'center',
          }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'#E8F0FE', color:RM.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔔</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>Soft chime</div>
              <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>Robot's "lesson starting" sound</div>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={RM.accent}><path d="M8 5v14l11-7z"/></svg>
          </button>

          <button onClick={(e)=>{e.stopPropagation(); setPlayed('voice');}} style={{
            background:RM.card, border: played==='voice'? `2px solid ${RM.accent}` : `1px solid ${RM.hair}`,
            borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
            display:'flex', gap:14, alignItems:'center',
          }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'#E6F4EE', color:RM.good, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎤</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>Robot's voice</div>
              <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>"Hello! I'm so glad you're here."</div>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={RM.good}><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔊" title="Adjust volume" body="Currently 6 of 10" onClick={()=>go('rm_sound')}/>
          <DvRow icon="📐" title="Place Robot in the open" body="Not in a drawer or under a blanket"/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>I can hear Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_support')}>Robot sounds quiet or muffled</DvBigBtn>
      </div>
    </DvShell>
  );
}
