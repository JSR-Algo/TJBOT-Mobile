import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CLChip from '../components/CLChip';
import CourseCard from '../components/CourseCard';

export default function CourseLockedPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[4]; // Story Time — locked, oldest tier
  return (
    <DvShell title="Locked for now" onBack={()=>go('cl_library')}>
      {/* Hero — desaturated */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ background:'#0E1116', padding:'18px 16px', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', filter:'grayscale(0.5)' }}>
            <LCDFace emotion={c.lcd} size={140} accent={accent}/>
            <div style={{ position:'absolute', top:10, right:10, background:'rgba(255,255,255,0.1)', padding:'5px 9px', borderRadius:999, display:'flex', alignItems:'center', gap:6, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.85)', textTransform:'uppercase', letterSpacing:0.5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              Locked
            </div>
          </div>
          <div style={{ padding:'14px 14px 16px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
              <CLChip state="locked"/>
              <div style={{ fontSize:11, color:CL.ink3 }}>Ages {c.ages}</div>
            </div>
            <div style={{ fontSize:20, fontWeight:600, color:CL.ink, letterSpacing:-0.2 }}>{c.title}</div>
            <div style={{ fontSize:13, color:CL.ink2, marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>{c.blurb}</div>
          </div>
        </div>
      </div>

      {/* Why locked */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ background:'#F8F6F1', borderRadius:12, padding:'14px 14px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:CL.ink, marginBottom:6 }}>Why is this locked?</div>
          <div style={{ fontSize:13, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
            Story Time uses past-tense and longer sentences. Your child is doing great with greetings — Robot will suggest this when they're ready, usually after Hello Friends.
          </div>
        </div>
      </div>

      {/* Suggested first */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Try first</div>
        <CourseCard course={COURSES[0]} accent={accent} onClick={()=>go('cl_detail')}/>
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_unlock_confirm')}>Unlock anyway</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_library')}>Back to library</DvBigBtn>
      </div>
    </DvShell>
  );
}
