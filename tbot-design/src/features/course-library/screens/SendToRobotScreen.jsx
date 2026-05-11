import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import DvRow from '@/components/DeviceRow';
import CL from '../components/CL';
import LCDPreview from '../components/LCDPreview';

export default function SendToRobotPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [pick, setPick] = React.useState(0);
  const options = [
    { title:'Lesson 4 · Animals at home', body:'Continues where your child left off', tag:'Recommended', tagColor:'#1F8A5B', emo:'happy' },
    { title:'Review · 3 tricky words',     body:'Robot will sneak these in playfully',     tag:'Quick',       tagColor:'#E8A33C', emo:'gentle' },
    { title:'Lesson 1 · Hello, food!',     body:'Try the new course Yummy Words',          tag:'New course',  tagColor:'#2A6FDB', emo:'speak' },
  ];
  return (
    <DvShell title="Today's lesson" onBack={()=>go('dv_home')}>
      <div style={{ padding:'14px 20px 0', fontSize:13, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Pick what Robot plays today. We'll send it to the device — about 4 minutes when your child is ready.
      </div>

      <div style={{ padding:'18px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {options.map((o, i)=>{
          const sel = i===pick;
          return (
            <button key={i} onClick={(e)=>{e.stopPropagation(); setPick(i);}} style={{
              background: sel? '#E8F0FE' : CL.card, border: sel? `2px solid ${CL.accent}` : `1px solid ${CL.hair}`,
              borderRadius:14, padding:'12px 12px', display:'flex', gap:12, alignItems:'center', cursor:'pointer', textAlign:'left' }}>
              <LCDPreview emotion={o.emo} accent={accent} size={64}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:700, color:o.tagColor, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{o.tag}</div>
                <div style={{ fontSize:14, fontWeight:600, color:CL.ink, lineHeight:1.25 }}>{o.title}</div>
                <div style={{ fontSize:12, color:CL.ink2, marginTop:2, lineHeight:1.4, textWrap:'pretty' }}>{o.body}</div>
              </div>
              <div style={{ width:22, height:22, borderRadius:11, border: sel? 'none' : `2px solid ${CL.hair}`,
                background: sel? CL.accent : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Schedule */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>When</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="⚡" title="Send now" body="Robot will be ready as soon as your child taps it"/>
          <DvRow icon="☀️" title="Tomorrow morning" body="Robot will wake up gently after 8:00 AM"/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px' }}>
        <DvBigBtn onClick={()=>go('cl_robot_ready')}>Send to Robot</DvBigBtn>
      </div>
    </DvShell>
  );
}
