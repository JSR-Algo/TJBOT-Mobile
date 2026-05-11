import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import DvRow from '@/components/DeviceRow';
import CL from '../components/CL';
import COURSES from '../components/courses';
import LCDPreview from '../components/LCDPreview';

export default function CourseAddedPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[2];
  return (
    <DvShell title="Added to Robot">
      <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="celebrate" size={180} accent={accent}/>
        <div style={{ marginTop:24, fontSize:24, fontWeight:600, letterSpacing:-0.3, textAlign:'center', color:CL.ink }}>
          {c.title} is on Robot
        </div>
        <div style={{ marginTop:8, fontSize:14, color:CL.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Robot is downloading the lessons now. Your child will see a new course tomorrow morning.
        </div>
      </div>

      {/* Mini Robot LCD preview */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px',
          display:'flex', alignItems:'center', gap:14 }}>
          <LCDPreview emotion={c.lcd} accent={accent} size={72}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:CL.good, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>On Robot now</div>
            <div style={{ fontSize:14, fontWeight:600, color:CL.ink }}>Lesson 1 · Hello, food!</div>
            <div style={{ fontSize:12, color:CL.ink2, marginTop:2 }}>4 minutes · ready to play</div>
          </div>
        </div>
      </div>

      {/* Tomorrow tile */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📅" title="First lesson tomorrow" body="Robot will gently invite your child after breakfast" />
          <DvRow icon="🔁" title="Mix into current course" body="Robot will alternate between Hello Friends and Yummy Words" />
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_send')}>Send today's lesson now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Back to Robot home</DvBigBtn>
      </div>
    </DvShell>
  );
}
