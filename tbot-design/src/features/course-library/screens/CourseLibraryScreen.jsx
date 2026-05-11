import React from 'react';
import DvShell from '@/components/DeviceShell';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CourseCard from '../components/CourseCard';

export default function CourseLibraryPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const sections = [
    { title:'On your Robot now', items: COURSES.filter(c=>c.state==='installed') },
    { title:'Available to add',  items: COURSES.filter(c=>c.state==='not_installed') },
    { title:'For when ready',    items: COURSES.filter(c=>c.state==='locked'), help:"These are shaped for older kids. Robot will suggest them when your child is ready." },
  ];
  return (
    <DvShell title="Course Library" onBack={()=>go('dv_home')}>
      <div style={{ padding:'14px 20px 0', fontSize:13, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Pick what your Robot teaches. Lessons play <b style={{ color:CL.ink }}>on the Robot</b>, not the phone.
      </div>
      {sections.map((sec, si)=>(
        sec.items.length === 0 ? null : (
          <div key={si} style={{ padding:'18px 16px 0' }}>
            <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>{sec.title}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sec.items.map(c=> <CourseCard key={c.id} course={c} accent={accent} onClick={()=>go('cl_detail')}/> )}
            </div>
            {sec.help && <div style={{ fontSize:11, color:CL.ink3, padding:'8px 6px 0', lineHeight:1.5, textWrap:'pretty' }}>{sec.help}</div>}
          </div>
        )
      ))}
      <div style={{ height:30 }}/>
    </DvShell>
  );
}
