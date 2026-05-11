import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import CL from './CL';
import CLChip from './CLChip';

export default function CourseCard({ course, onClick, accent, showLCD=true }){
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'14px 14px',
      display:'flex', gap:12, alignItems:'flex-start', cursor:'pointer', textAlign:'left', width:'100%',
      opacity: course.state==='locked' ? 0.85 : 1,
    }}>
      {showLCD && (
        <div style={{ background:'#0E1116', borderRadius:10, padding:6, flexShrink:0,
          filter: course.state==='locked' ? 'grayscale(0.6)' : 'none' }}>
          <LCDFace emotion={course.lcd} size={72} accent={accent}/>
        </div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
          <CLChip state={course.state}/>
          <div style={{ fontSize:11, color:CL.ink3 }}>Ages {course.ages}</div>
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:CL.ink, lineHeight:1.25, textWrap:'pretty' }}>{course.title}</div>
        <div style={{ fontSize:12, color:CL.ink2, marginTop:2 }}>{course.level} · {course.lessons} lessons</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
          {course.teaches.slice(0,3).map(t=>(
            <span key={t} style={{ background:'#EEF1F5', color:CL.ink2, fontSize:10, fontWeight:600, padding:'3px 7px', borderRadius:6 }}>{t}</span>
          ))}
          {course.teaches.length>3 && <span style={{ fontSize:10, color:CL.ink3, padding:'3px 4px' }}>+{course.teaches.length-3}</span>}
        </div>
      </div>
    </button>
  );
}
